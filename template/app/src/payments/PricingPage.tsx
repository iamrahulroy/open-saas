import { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { motion } from 'framer-motion';
import { createCheckoutSession, getSubscriptionStatus, cancelSubscription } from 'wasp/client/operations';
import { useQuery } from 'wasp/client/operations';

export default function PricingPage() {
  const { data: user } = useAuth();
  const { data: subscription, refetch } = useQuery(getSubscriptionStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { checkoutUrl } = await createCheckoutSession({});
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      alert(error.message || 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose unlimited translations.')) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelSubscription();
      await refetch();
      alert('Subscription cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const isPaid = subscription?.status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-red-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 bg-clip-text text-transparent">
                ThaiCopilot
              </h1>
            </a>
            <a
              href="/account"
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
            >
              Back to Account
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Get unlimited translations and flashcards to accelerate your Thai learning
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-white rounded-3xl shadow-lg border-2 p-8 ${
              !isPaid ? 'border-purple-400' : 'border-slate-200'
            }`}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Free</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold text-slate-800">$0</span>
                <span className="text-slate-600 ml-2">/month</span>
              </div>
              {!isPaid && (
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                  Current Plan
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-700">10 translations per day</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-700">AI flashcard generation</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-700">Spaced repetition study</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-700">Share with Thai friends</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3 bg-slate-200 text-slate-500 font-semibold rounded-xl cursor-not-allowed"
            >
              Current Plan
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 rounded-3xl shadow-2xl border-2 p-8 text-white relative overflow-hidden ${
              isPaid ? 'border-yellow-400' : 'border-transparent'
            }`}
          >
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                RECOMMENDED
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold">$19</span>
                <span className="ml-2">/month</span>
              </div>
              {isPaid && (
                <span className="inline-block px-3 py-1 bg-yellow-400 text-slate-800 text-sm font-semibold rounded-full">
                  Active
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-white mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Unlimited translations</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-white mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited flashcard generation</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-white mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Priority support</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-white mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Early access to new features</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-white mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </li>
            </ul>

            {!isPaid ? (
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full py-3 bg-white text-purple-600 font-semibold rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                  </span>
                ) : (
                  'Upgrade to Pro'
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            )}
          </motion.div>
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600">
                Yes! You can cancel your subscription at any time. You'll keep access until the end of your billing period.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600">
                We accept all major credit cards, Apple Pay, and Google Pay through our secure payment provider Polar.sh.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                What happens to my flashcards if I downgrade?
              </h3>
              <p className="text-slate-600">
                All your flashcards and conversation history are kept safe! You'll just be limited to 10 new translations per day on the free plan.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
