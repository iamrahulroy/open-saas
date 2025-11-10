import { User, Conversation, Message, Correction } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import OpenAI from 'openai';
import {
  CreateTranslation,
  GetConversations,
  GetConversationById,
  DeleteConversation,
} from 'wasp/server/operations';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Helper: Check and reset daily translation limit
async function checkTranslationLimit(user: User, context: any): Promise<void> {
  const now = new Date();
  const lastReset = new Date(user.lastTranslationReset);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  // Reset counter if 24 hours have passed
  if (hoursSinceReset >= 24) {
    await context.entities.User.update({
      where: { id: user.id },
      data: {
        translationsUsedToday: 0,
        lastTranslationReset: now,
      },
    });
    return; // Reset successful, user can proceed
  }

  // Check if user has exceeded limit (free tier only)
  if (user.subscriptionStatus === 'free' && user.translationsUsedToday >= user.translationsLimit) {
    throw new HttpError(
      429,
      `Daily translation limit reached (${user.translationsLimit}/day). Upgrade to unlimited!`
    );
  }
}

// Helper: Translate text using OpenAI
async function translateWithOpenAI(
  sourceText: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new HttpError(500, 'OpenAI API key not configured');
  }

  const languageNames: Record<string, string> = {
    en: 'English',
    th: 'Thai',
  };

  const prompt = `Translate the following ${languageNames[sourceLang] || sourceLang} text to ${
    languageNames[targetLang] || targetLang
  }. Provide ONLY the translation, no explanations or additional text.

Text to translate: "${sourceText}"

Translation:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in ${languageNames[sourceLang]}-${languageNames[targetLang]} translation. Provide accurate, natural translations that native speakers would use in everyday conversation.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 500,
    });

    const translation = response.choices[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error('No translation received from OpenAI');
    }

    return translation;
  } catch (error: any) {
    console.error('OpenAI translation error:', error);
    throw new HttpError(
      500,
      error.message || 'Translation failed. Please try again.'
    );
  }
}

// Create a new translation (main action)
export const createTranslation: CreateTranslation<
  {
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    conversationId?: string;
  },
  Message
> = async ({ sourceText, sourceLang, targetLang, conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to translate');
  }

  // Validate input
  if (!sourceText || sourceText.trim().length === 0) {
    throw new HttpError(400, 'Source text is required');
  }

  if (sourceText.length > 5000) {
    throw new HttpError(400, 'Text is too long (max 5000 characters)');
  }

  const supportedLanguages = ['en', 'th'];
  if (!supportedLanguages.includes(sourceLang) || !supportedLanguages.includes(targetLang)) {
    throw new HttpError(400, 'Unsupported language pair');
  }

  // Check translation limit
  await checkTranslationLimit(context.user, context);

  try {
    // Translate using OpenAI
    const translatedText = await translateWithOpenAI(sourceText, sourceLang, targetLang);

    // Find or create conversation
    let conversation: Conversation;

    if (conversationId) {
      // Use existing conversation
      const existingConversation = await context.entities.Conversation.findUnique({
        where: { id: conversationId },
      });

      if (!existingConversation || existingConversation.userId !== context.user.id) {
        throw new HttpError(404, 'Conversation not found');
      }

      conversation = existingConversation;
    } else {
      // Create new conversation
      conversation = await context.entities.Conversation.create({
        data: {
          userId: context.user.id,
          sourceLang,
          targetLang,
        },
      });
    }

    // Create message
    const message = await context.entities.Message.create({
      data: {
        conversationId: conversation.id,
        sourceText: sourceText.trim(),
        targetText: translatedText,
        audioUrl: null, // TODO: Generate audio using TTS
      },
    });

    // Increment translation counter (free users only)
    if (context.user.subscriptionStatus === 'free') {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          translationsUsedToday: {
            increment: 1,
          },
        },
      });
    }

    return message;
  } catch (error: any) {
    console.error('Translation error:', error);

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(500, 'Translation failed. Please try again.');
  }
};

// Get all conversations for the current user
export const getConversations: GetConversations<
  void,
  Array<Conversation & { messages: Message[] }>
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const conversations = await context.entities.Conversation.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 5, // Only fetch first 5 messages for preview
      },
    },
  });

  return conversations;
};

// Get a specific conversation with all messages and corrections
export const getConversationById: GetConversationById<
  { conversationId: string },
  Conversation & { messages: Array<Message & { corrections: Correction[] }> }
> = async ({ conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          corrections: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  // Check ownership
  if (conversation.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this conversation');
  }

  return conversation;
};

// Delete a conversation
export const deleteConversation: DeleteConversation<
  { conversationId: string },
  void
> = async ({ conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  if (conversation.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this conversation');
  }

  // Delete conversation (cascade will delete messages)
  await context.entities.Conversation.delete({
    where: { id: conversationId },
  });
};
