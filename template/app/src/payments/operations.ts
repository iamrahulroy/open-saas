import { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import {
  CreateCheckoutSession,
  HandlePolarWebhook,
  CancelSubscription,
  GetSubscriptionStatus,
} from 'wasp/server/operations';

// Polar.sh API configuration
const POLAR_API_KEY = process.env.POLAR_API_KEY || '';
const POLAR_API_URL = 'https://api.polar.sh/v1';
const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID || ''; // Your product ID from Polar dashboard

// Create a checkout session for subscription
export const createCheckoutSession: CreateCheckoutSession<
  { successUrl?: string; cancelUrl?: string },
  { checkoutUrl: string }
> = async ({ successUrl, cancelUrl }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (!POLAR_API_KEY || !POLAR_PRODUCT_ID) {
    throw new HttpError(500, 'Payment system not configured');
  }

  // Check if user already has an active subscription
  if (context.user.subscriptionStatus === 'paid') {
    throw new HttpError(400, 'You already have an active subscription');
  }

  try {
    const response = await fetch(`${POLAR_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: POLAR_PRODUCT_ID,
        success_url: successUrl || `${process.env.WASP_WEB_CLIENT_URL}/account?payment=success`,
        cancel_url: cancelUrl || `${process.env.WASP_WEB_CLIENT_URL}/account?payment=cancelled`,
        customer_email: context.user.email,
        metadata: {
          user_id: context.user.id,
          user_email: context.user.email,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Polar checkout error:', error);
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    return { checkoutUrl: data.url };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new HttpError(500, error.message || 'Failed to create checkout session');
  }
};

// Handle Polar.sh webhooks
export const handlePolarWebhook: HandlePolarWebhook<
  {
    event: string;
    data: any;
  },
  { success: boolean }
> = async ({ event, data }, context) => {
  console.log('Polar webhook received:', event, data);

  try {
    switch (event) {
      case 'checkout.completed':
        // Subscription created
        const userId = data.metadata?.user_id;
        if (userId) {
          await context.entities.User.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'paid',
              subscriptionId: data.subscription_id,
              translationsLimit: 999999, // Unlimited
            },
          });
          console.log(`User ${userId} upgraded to paid`);
        }
        break;

      case 'subscription.cancelled':
      case 'subscription.expired':
        // Subscription cancelled or expired
        const cancelUserId = data.metadata?.user_id;
        if (cancelUserId) {
          await context.entities.User.update({
            where: { id: cancelUserId },
            data: {
              subscriptionStatus: 'free',
              subscriptionId: null,
              translationsLimit: 10, // Reset to free tier
            },
          });
          console.log(`User ${cancelUserId} downgraded to free`);
        }
        break;

      case 'subscription.updated':
        // Handle subscription updates (e.g., plan changes)
        console.log('Subscription updated:', data);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    throw new HttpError(500, error.message || 'Webhook processing failed');
  }
};

// Cancel subscription
export const cancelSubscription: CancelSubscription<void, void> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  if (context.user.subscriptionStatus !== 'paid' || !context.user.subscriptionId) {
    throw new HttpError(400, 'No active subscription to cancel');
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/subscriptions/${context.user.subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POLAR_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Polar cancel error:', error);
      throw new Error('Failed to cancel subscription');
    }

    // Update user status
    await context.entities.User.update({
      where: { id: context.user.id },
      data: {
        subscriptionStatus: 'free',
        subscriptionId: null,
        translationsLimit: 10,
      },
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    throw new HttpError(500, error.message || 'Failed to cancel subscription');
  }
};

// Get subscription status
export const getSubscriptionStatus: GetSubscriptionStatus<
  void,
  {
    status: string;
    subscriptionId: string | null;
    translationsLimit: number;
    translationsUsedToday: number;
  }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in');
  }

  return {
    status: context.user.subscriptionStatus || 'free',
    subscriptionId: context.user.subscriptionId || null,
    translationsLimit: context.user.translationsLimit || 10,
    translationsUsedToday: context.user.translationsUsedToday || 0,
  };
};
