import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import { getConversationByShareId, createCorrection } from 'wasp/client/operations';

// Language flag helper
const getFlag = (lang: string) => {
  return lang === 'th' ? '🇹🇭' : '🇬🇧';
};

export default function CorrectConversationPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data: conversation, isLoading, error } = useQuery(
    getConversationByShareId,
    { shareToken: shareToken || '' },
    { enabled: !!shareToken }
  );

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [correctorName, setCorrectorName] = useState('');
  const [correctorEmail, setCorrectorEmail] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMessageId || !shareToken) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createCorrection({
        messageId: selectedMessageId,
        shareToken,
        correctorName,
        correctorEmail: correctorEmail || undefined,
        correctedText,
        notes: notes || undefined,
      });

      setSubmitSuccess(true);
      setCorrectorName('');
      setCorrectorEmail('');
      setCorrectedText('');
      setNotes('');
      setSelectedMessageId(null);

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error submitting correction:', error);
      setErrorMessage(error.message || 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            Conversation Not Found
          </h1>
          <p className="text-slate-600 mb-6">
            This link may have expired or been deactivated. Please ask your friend for a new link.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            Go to ThaiCopilot
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-red-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 bg-clip-text text-transparent">
                ThaiCopilot
              </h1>
              <p className="text-sm text-slate-600">Help Your Friend Learn Thai</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <AnimatePresence>
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">✅</span>
                <p className="text-green-800 font-medium">
                  Thank you! Your correction has been submitted.
                </p>
              </div>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800"
            >
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-md border border-purple-100"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center">
            <span className="mr-2">👋</span>
            สวัสดี! (Hello!)
          </h2>
          <p className="text-slate-700 mb-2">
            Your friend is learning Thai and wants your help! Please review their translations below
            and suggest corrections.
          </p>
          <p className="text-sm text-slate-600">
            Click on any message to provide a correction with better phrasing or pronunciation tips.
          </p>
        </motion.div>

        {/* Conversation Messages */}
        <div className="space-y-4 mb-8">
          {conversation.messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setSelectedMessageId(message.id);
                setCorrectedText(message.targetText);
              }}
              className={`p-6 rounded-2xl cursor-pointer transition-all ${
                selectedMessageId === message.id
                  ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 border-2 border-purple-400 shadow-lg'
                  : 'bg-white hover:shadow-md border border-purple-100'
              }`}
            >
              {/* English Text */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{getFlag(conversation.sourceLang)}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {conversation.sourceLang}
                  </span>
                </div>
                <p className="text-slate-800 font-medium">{message.sourceText}</p>
              </div>

              {/* Thai Text */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{getFlag(conversation.targetLang)}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {conversation.targetLang}
                  </span>
                </div>
                <p className="text-slate-700">{message.targetText}</p>
              </div>

              {/* Existing Corrections */}
              {message.corrections && message.corrections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2">
                    {message.corrections.length} correction{message.corrections.length > 1 ? 's' : ''} submitted
                  </p>
                  {message.corrections.map((correction) => (
                    <div key={correction.id} className="mb-2 p-3 bg-white/50 rounded-lg">
                      <p className="text-sm text-slate-700 font-medium">{correction.correctedText}</p>
                      {correction.notes && (
                        <p className="text-xs text-slate-600 mt-1">Note: {correction.notes}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">- {correction.correctorName}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedMessageId === message.id && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm font-semibold text-purple-700">
                    ✏️ Click below to submit your correction
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Correction Form */}
        <AnimatePresence>
          {selectedMessageId && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="sticky bottom-4 bg-white rounded-2xl shadow-2xl border-2 border-purple-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Submit Your Correction</h3>
                <button
                  onClick={() => {
                    setSelectedMessageId(null);
                    setCorrectedText('');
                    setNotes('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={correctorName}
                    onChange={(e) => setCorrectorName(e.target.value)}
                    placeholder="ชื่อของคุณ (Your name)"
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={correctorEmail}
                    onChange={(e) => setCorrectorEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Corrected Text */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Better Translation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={correctedText}
                    onChange={(e) => setCorrectedText(e.target.value)}
                    placeholder="แก้ไขภาษาไทยที่ดีกว่า (Better Thai translation)"
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={5000}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-slate-500 mt-1">{correctedText.length}/5000</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Explain why this is better, pronunciation tips, context, etc."
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting || !correctorName.trim() || !correctedText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Correction'
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-600 mb-2">
            Want to learn Thai like your friend?
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            Try ThaiCopilot Free
          </a>
        </motion.div>
      </main>
    </div>
  );
}
