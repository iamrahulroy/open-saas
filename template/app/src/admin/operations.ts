import { User, EmailSignup, Conversation, Message, Flashcard } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import {
  GetAdminStats,
  GetAllEmailSignups,
  GetUserAnalytics,
  GetTranslationAnalytics,
} from 'wasp/server/operations';

// Check if user is admin
function isAdmin(user: User): boolean {
  // For now, check if email is in admin list
  // In production, you'd have a proper role system
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  return adminEmails.includes(user.email || '');
}

// Get overall admin statistics
export const getAdminStats: GetAdminStats<
  void,
  {
    totalUsers: number;
    paidUsers: number;
    freeUsers: number;
    totalEmailSignups: number;
    totalConversations: number;
    totalTranslations: number;
    totalFlashcards: number;
    mrr: number;
    conversionRate: number;
  }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (!isAdmin(context.user)) {
    throw new HttpError(403, 'Admin access required');
  }

  // Get user counts
  const totalUsers = await context.entities.User.count();
  const paidUsers = await context.entities.User.count({
    where: { subscriptionStatus: 'paid' },
  });
  const freeUsers = totalUsers - paidUsers;

  // Get email signups
  const totalEmailSignups = await context.entities.EmailSignup.count();

  // Get conversation stats
  const totalConversations = await context.entities.Conversation.count();
  const totalTranslations = await context.entities.Message.count();

  // Get flashcard stats
  const totalFlashcards = await context.entities.Flashcard.count();

  // Calculate MRR (assuming $19/month per paid user)
  const mrr = paidUsers * 19;

  // Calculate conversion rate (paid users / total users)
  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

  return {
    totalUsers,
    paidUsers,
    freeUsers,
    totalEmailSignups,
    totalConversations,
    totalTranslations,
    totalFlashcards,
    mrr,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
};

// Get all email signups for review
export const getAllEmailSignups: GetAllEmailSignups<
  void,
  Array<EmailSignup>
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (!isAdmin(context.user)) {
    throw new HttpError(403, 'Admin access required');
  }

  const signups = await context.entities.EmailSignup.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to most recent 100
  });

  return signups;
};

// Get user analytics (growth over time)
export const getUserAnalytics: GetUserAnalytics<
  void,
  {
    daily: Array<{ date: string; users: number; paid: number }>;
    bySource: Array<{ source: string; count: number }>;
  }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (!isAdmin(context.user)) {
    throw new HttpError(403, 'Admin access required');
  }

  // Get users grouped by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const users = await context.entities.User.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dailyMap = new Map<string, { users: number; paid: number }>();

  users.forEach((user) => {
    const date = user.createdAt.toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { users: 0, paid: 0 };
    dailyMap.set(date, {
      users: existing.users + 1,
      paid: existing.paid + (user.subscriptionStatus === 'paid' ? 1 : 0),
    });
  });

  const daily = Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));

  // Get signups by source
  const signups = await context.entities.EmailSignup.findMany({
    select: {
      source: true,
    },
  });

  const sourceMap = new Map<string, number>();
  signups.forEach((signup) => {
    const source = signup.source || 'direct';
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({
    source,
    count,
  }));

  return { daily, bySource };
};

// Get translation analytics
export const getTranslationAnalytics: GetTranslationAnalytics<
  void,
  {
    dailyTranslations: Array<{ date: string; count: number }>;
    avgTranslationsPerUser: number;
    topUsers: Array<{ userEmail: string; count: number }>;
  }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (!isAdmin(context.user)) {
    throw new HttpError(403, 'Admin access required');
  }

  // Get messages from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const messages = await context.entities.Message.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      conversation: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dailyMap = new Map<string, number>();
  messages.forEach((message) => {
    const date = message.createdAt.toISOString().split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });

  const dailyTranslations = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Calculate average translations per user
  const totalUsers = await context.entities.User.count();
  const totalMessages = messages.length;
  const avgTranslationsPerUser = totalUsers > 0 ? Math.round((totalMessages / totalUsers) * 100) / 100 : 0;

  // Get top users by translation count
  const userMap = new Map<string, number>();
  messages.forEach((message) => {
    const email = message.conversation.user?.email || 'Unknown';
    userMap.set(email, (userMap.get(email) || 0) + 1);
  });

  const topUsers = Array.from(userMap.entries())
    .map(([userEmail, count]) => ({ userEmail, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    dailyTranslations,
    avgTranslationsPerUser,
    topUsers,
  };
};
