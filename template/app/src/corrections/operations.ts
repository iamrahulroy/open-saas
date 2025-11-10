import { User, Conversation, Message, Correction, ConversationShare } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import {
  CreateConversationShare,
  GetConversationByShareId,
  CreateCorrection,
  GetCorrectionsByMessage
} from 'wasp/server/operations';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique share link for a conversation
export const createConversationShare: CreateConversationShare<
  { conversationId: string },
  ConversationShare
> = async ({ conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  // Verify conversation ownership
  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  if (conversation.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have access to this conversation');
  }

  // Check if share already exists
  const existingShare = await context.entities.ConversationShare.findFirst({
    where: {
      conversationId,
      isActive: true,
    },
  });

  if (existingShare) {
    return existingShare;
  }

  // Create new share with unique token
  const shareToken = uuidv4();

  const share = await context.entities.ConversationShare.create({
    data: {
      conversationId,
      shareToken,
      isActive: true,
    },
  });

  return share;
};

// Get conversation by share token (public - no auth required)
export const getConversationByShareId: GetConversationByShareId<
  { shareToken: string },
  Conversation & { messages: Message[] }
> = async ({ shareToken }, context) => {
  // Find the share
  const share = await context.entities.ConversationShare.findUnique({
    where: { shareToken },
    include: {
      conversation: {
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
      },
    },
  });

  if (!share) {
    throw new HttpError(404, 'Conversation not found or link expired');
  }

  if (!share.isActive) {
    throw new HttpError(403, 'This share link has been deactivated');
  }

  // Check if expired (30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (new Date(share.createdAt) < thirtyDaysAgo) {
    throw new HttpError(403, 'This share link has expired');
  }

  return share.conversation;
};

// Create a correction (public - no auth required, uses share token)
export const createCorrection: CreateCorrection<
  {
    messageId: string;
    shareToken: string;
    correctorName: string;
    correctorEmail?: string;
    correctedText: string;
    notes?: string;
    audioUrl?: string;
  },
  Correction
> = async ({ messageId, shareToken, correctorName, correctorEmail, correctedText, notes, audioUrl }, context) => {
  // Verify share token is valid
  const share = await context.entities.ConversationShare.findUnique({
    where: { shareToken },
    include: {
      conversation: {
        include: {
          messages: true,
        },
      },
    },
  });

  if (!share || !share.isActive) {
    throw new HttpError(403, 'Invalid or expired share link');
  }

  // Verify message belongs to this conversation
  const message = share.conversation.messages.find(m => m.id === messageId);

  if (!message) {
    throw new HttpError(404, 'Message not found in this conversation');
  }

  // Validate input
  if (!correctorName || correctorName.trim().length === 0) {
    throw new HttpError(400, 'Corrector name is required');
  }

  if (!correctedText || correctedText.trim().length === 0) {
    throw new HttpError(400, 'Corrected text is required');
  }

  if (correctedText.length > 5000) {
    throw new HttpError(400, 'Corrected text is too long (max 5000 characters)');
  }

  // Create correction
  const correction = await context.entities.Correction.create({
    data: {
      messageId,
      correctorName: correctorName.trim(),
      correctorEmail: correctorEmail?.trim() || null,
      correctedText: correctedText.trim(),
      notes: notes?.trim() || null,
      audioUrl: audioUrl || null,
    },
  });

  // TODO: Send email notification to conversation owner
  console.log(`Correction created for message ${messageId} by ${correctorName}`);

  return correction;
};

// Get all corrections for a message
export const getCorrectionsByMessage: GetCorrectionsByMessage<
  { messageId: string },
  Correction[]
> = async ({ messageId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  // Verify user owns the conversation containing this message
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

  const corrections = await context.entities.Correction.findMany({
    where: { messageId },
    orderBy: { createdAt: 'desc' },
  });

  return corrections;
};
