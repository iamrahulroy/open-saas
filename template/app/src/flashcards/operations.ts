import { User, Conversation, Message, Flashcard, FlashcardReview } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import OpenAI from 'openai';
import {
  GenerateFlashcardsFromMessage,
  GetFlashcardsByUser,
  GetDueFlashcards,
  UpdateFlashcard,
  DeleteFlashcard,
  ReviewFlashcard,
} from 'wasp/server/operations';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Generate flashcards from a message using AI
export const generateFlashcardsFromMessage: GenerateFlashcardsFromMessage<
  { messageId: string },
  Flashcard[]
> = async ({ messageId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  // Verify message ownership
  const message = await context.entities.Message.findUnique({
    where: { id: messageId },
    include: {
      conversation: true,
    },
  });

  if (!message) {
    throw new HttpError(404, 'Message not found');
  }

  if (message.conversation.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this message');
  }

  // Check if flashcards already exist for this message
  const existingFlashcards = await context.entities.Flashcard.findMany({
    where: { messageId },
  });

  if (existingFlashcards.length > 0) {
    return existingFlashcards;
  }

  // Use AI to extract key phrases and generate breakdown
  if (!process.env.OPENAI_API_KEY) {
    throw new HttpError(500, 'OpenAI API key not configured');
  }

  try {
    const prompt = `You are a Thai language learning assistant. Analyze the following Thai sentence and extract 2-4 key phrases or words that are most important for learning. For each phrase/word, provide a breakdown.

Thai sentence: "${message.targetText}"
English translation: "${message.sourceText}"

Return a JSON array of flashcards with this structure:
[
  {
    "phrase": "สวัสดีค่ะ",
    "translation": "Hello (polite, female speaker)",
    "breakdown": "สวัสดี (sawatdee) = hello/greetings + ค่ะ (ka) = polite particle for female speakers",
    "notes": "Use ค่ะ (ka) if you're female, ครับ (krap) if you're male"
  }
]

Focus on:
- Common phrases that appear in everyday conversation
- Important vocabulary words
- Key grammar patterns
- Polite particles and tone markers

Return ONLY valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Thai language expert helping learners create effective flashcards. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let flashcardData: Array<{
      phrase: string;
      translation: string;
      breakdown: string;
      notes?: string;
    }>;

    try {
      flashcardData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Create flashcards in database
    const createdFlashcards: Flashcard[] = [];

    for (const card of flashcardData) {
      const flashcard = await context.entities.Flashcard.create({
        data: {
          userId: context.user.id,
          messageId: message.id,
          phrase: card.phrase,
          translation: card.translation,
          breakdown: card.breakdown,
          notes: card.notes || null,
          audioUrl: message.audioUrl || null, // Inherit audio from message if available
          // SM-2 algorithm defaults
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReview: new Date(), // Due immediately
        },
      });
      createdFlashcards.push(flashcard);
    }

    return createdFlashcards;
  } catch (error: any) {
    console.error('Error generating flashcards:', error);
    throw new HttpError(500, error.message || 'Failed to generate flashcards');
  }
};

// Get all flashcards for the current user
export const getFlashcardsByUser: GetFlashcardsByUser<
  void,
  Array<Flashcard & { message: Message }>
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const flashcards = await context.entities.Flashcard.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      message: true,
    },
  });

  return flashcards;
};

// Get flashcards due for review
export const getDueFlashcards: GetDueFlashcards<
  void,
  Array<Flashcard & { message: Message }>
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const now = new Date();

  const dueFlashcards = await context.entities.Flashcard.findMany({
    where: {
      userId: context.user.id,
      nextReview: {
        lte: now,
      },
    },
    orderBy: { nextReview: 'asc' },
    include: {
      message: true,
    },
    take: 20, // Limit to 20 cards per session
  });

  return dueFlashcards;
};

// Update a flashcard (for manual editing)
export const updateFlashcard: UpdateFlashcard<
  {
    flashcardId: string;
    phrase?: string;
    translation?: string;
    breakdown?: string;
    notes?: string;
  },
  Flashcard
> = async ({ flashcardId, phrase, translation, breakdown, notes }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const flashcard = await context.entities.Flashcard.findUnique({
    where: { id: flashcardId },
  });

  if (!flashcard) {
    throw new HttpError(404, 'Flashcard not found');
  }

  if (flashcard.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this flashcard');
  }

  const updatedFlashcard = await context.entities.Flashcard.update({
    where: { id: flashcardId },
    data: {
      ...(phrase !== undefined && { phrase }),
      ...(translation !== undefined && { translation }),
      ...(breakdown !== undefined && { breakdown }),
      ...(notes !== undefined && { notes }),
    },
  });

  return updatedFlashcard;
};

// Delete a flashcard
export const deleteFlashcard: DeleteFlashcard<
  { flashcardId: string },
  void
> = async ({ flashcardId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const flashcard = await context.entities.Flashcard.findUnique({
    where: { id: flashcardId },
  });

  if (!flashcard) {
    throw new HttpError(404, 'Flashcard not found');
  }

  if (flashcard.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this flashcard');
  }

  await context.entities.Flashcard.delete({
    where: { id: flashcardId },
  });
};

// Review a flashcard using SM-2 algorithm
export const reviewFlashcard: ReviewFlashcard<
  {
    flashcardId: string;
    quality: number; // 0-5 rating (0 = total blackout, 5 = perfect recall)
  },
  Flashcard
> = async ({ flashcardId, quality }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (quality < 0 || quality > 5) {
    throw new HttpError(400, 'Quality must be between 0 and 5');
  }

  const flashcard = await context.entities.Flashcard.findUnique({
    where: { id: flashcardId },
  });

  if (!flashcard) {
    throw new HttpError(404, 'Flashcard not found');
  }

  if (flashcard.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this flashcard');
  }

  // SM-2 algorithm implementation
  let { easeFactor, interval, repetitions } = flashcard;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 6; // 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - restart
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure ease factor doesn't go below 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  // Update flashcard
  const updatedFlashcard = await context.entities.Flashcard.update({
    where: { id: flashcardId },
    data: {
      easeFactor,
      interval,
      repetitions,
      nextReview,
    },
  });

  // Create review record
  await context.entities.FlashcardReview.create({
    data: {
      flashcardId,
      quality,
    },
  });

  return updatedFlashcard;
};
