import { useState, useRef, useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery } from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createTranslation,
  getConversations,
  createConversationShare,
  generateFlashcardsFromMessage
} from 'wasp/client/operations';
import { type Conversation, type Message } from 'wasp/entities';

// Language options
const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧', code: 'en' },
  th: { name: 'Thai', flag: '🇹🇭', code: 'th' },
};

export default function DashboardPage() {
  const { data: user } = useAuth();
  const { data: conversations, isLoading, refetch } = useQuery(getConversations);

  // Translation state
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<'en' | 'th'>('en');
  const [targetLang, setTargetLang] = useState<'en' | 'th'>('th');
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Handle language swap
  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  // Handle translation
  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceText.trim()) {
      setErrorMessage('Please enter some text to translate');
      return;
    }

    setIsTranslating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createTranslation({
        sourceText: sourceText.trim(),
        sourceLang,
        targetLang,
      });

      setSuccessMessage('Translation created!');
      setSourceText('');

      // Refetch conversations to show new message
      setTimeout(() => {
        refetch();
        setSuccessMessage('');
      }, 1000);
    } catch (error: any) {
      console.error('Translation error:', error);
      setErrorMessage(error.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // TODO: Convert audio to text using speech-to-text API
        console.log('Audio recorded:', audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Calculate translations remaining
  const translationsRemaining = user?.subscriptionStatus === 'free'
    ? user.translationsLimit - user.translationsUsedToday
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 bg-clip-text text-transparent">
                ThaiCopilot
              </h1>
              {user && (
                <p className="text-xs text-slate-500">
                  {user.subscriptionStatus === 'free' && translationsRemaining !== null && (
                    <span>{translationsRemaining} translations left today</span>
                  )}
                  {user.subscriptionStatus === 'paid' && (
                    <span className="text-purple-600 font-semibold">Unlimited</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSwapLanguages}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm"
            >
              <span className="text-lg">{LANGUAGES[sourceLang].flag}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-lg">{LANGUAGES[targetLang].flag}</span>
            </motion.button>

            {/* Upgrade Button (Free users only) */}
            {user?.subscriptionStatus === 'free' && (
              <a
                href="/pricing"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Upgrade
              </a>
            )}

            {/* Account Link */}
            <a
              href="/account"
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
            >
              Account
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Error/Success Messages */}
        <AnimatePresence>
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
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Your Conversations
            </h2>
            {conversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Start Your First Conversation
            </h2>
            <p className="text-slate-600 text-center max-w-md">
              Type something in {LANGUAGES[sourceLang].name} below and get an instant translation to {LANGUAGES[targetLang].name}
            </p>
          </motion.div>
        )}
      </main>

      {/* Bottom Input Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-purple-100 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleTranslate} className="flex items-end space-x-3">
            {/* Language Indicator */}
            <div className="flex flex-col items-center space-y-1 pb-2">
              <span className="text-2xl">{LANGUAGES[sourceLang].flag}</span>
              <span className="text-xs text-slate-500 font-medium">{sourceLang.toUpperCase()}</span>
            </div>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={`Type in ${LANGUAGES[sourceLang].name}...`}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none resize-none transition-all"
                rows={2}
                maxLength={5000}
                disabled={isTranslating}
              />
              <div className="flex items-center justify-between mt-1 px-2">
                <span className="text-xs text-slate-400">
                  {sourceText.length}/5000
                </span>
                {user?.subscriptionStatus === 'free' && translationsRemaining !== null && (
                  <span className="text-xs text-purple-600 font-medium">
                    {translationsRemaining} left today
                  </span>
                )}
              </div>
            </div>

            {/* Microphone Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-4 rounded-2xl transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-200 hover:bg-slate-300'
              }`}
              disabled={isTranslating}
            >
              {isRecording ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </motion.button>

            {/* Send Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isTranslating || !sourceText.trim()}
              className="px-6 py-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 text-white font-semibold rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranslating ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// Conversation Card Component
function ConversationCard({ conversation }: { conversation: Conversation & { messages: Message[] } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState<Record<string, boolean>>({});
  const [flashcardToasts, setFlashcardToasts] = useState<Record<string, boolean>>({});

  const firstMessage = conversation.messages[0];
  const messageCount = conversation.messages.length;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (shareLink) {
      // Copy existing link
      await navigator.clipboard.writeText(shareLink);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
      return;
    }

    // Generate new share link
    setIsGeneratingLink(true);
    try {
      const share = await createConversationShare({ conversationId: conversation.id });
      const link = `${window.location.origin}/correct/${share.shareToken}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleGenerateFlashcards = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();

    setGeneratingFlashcards({ ...generatingFlashcards, [messageId]: true });
    try {
      await generateFlashcardsFromMessage({ messageId });
      setFlashcardToasts({ ...flashcardToasts, [messageId]: true });
      setTimeout(() => {
        setFlashcardToasts({ ...flashcardToasts, [messageId]: false });
      }, 3000);
    } catch (error) {
      console.error('Error generating flashcards:', error);
    } finally {
      setGeneratingFlashcards({ ...generatingFlashcards, [messageId]: false });
    }
  };

  if (!firstMessage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-purple-100 overflow-hidden"
    >
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg">
                {conversation.sourceLang.toUpperCase()}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="px-2 py-1 bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold rounded-lg">
                {conversation.targetLang.toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              disabled={isGeneratingLink}
              className="relative p-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors disabled:opacity-50"
              title="Share with Thai friend for corrections"
            >
              {isGeneratingLink ? (
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-full right-0 mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10"
                >
                  Link copied!
                </motion.div>
              )}
            </motion.button>
            {/* Expand/Collapse */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* First Message Preview */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-lg">{LANGUAGES[conversation.sourceLang as 'en' | 'th'].flag}</span>
            <p className="text-slate-700 font-medium flex-1">
              {firstMessage.sourceText}
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-lg">{LANGUAGES[conversation.targetLang as 'en' | 'th'].flag}</span>
            <p className="text-slate-600 flex-1">
              {firstMessage.targetText}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="mt-4 text-xs text-slate-400">
          {new Date(conversation.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* Expanded Messages */}
      <AnimatePresence>
        {isExpanded && conversation.messages.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-purple-100 bg-slate-50"
          >
            <div className="p-6 space-y-4">
              {conversation.messages.slice(1).map((message) => (
                <div key={message.id} className="space-y-2 p-4 bg-white rounded-xl relative">
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{LANGUAGES[conversation.sourceLang as 'en' | 'th'].flag}</span>
                    <p className="text-slate-700 font-medium flex-1">
                      {message.sourceText}
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{LANGUAGES[conversation.targetLang as 'en' | 'th'].flag}</span>
                    <p className="text-slate-600 flex-1">
                      {message.targetText}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {message.audioUrl && (
                      <button className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors">
                        ▶ Play Audio
                      </button>
                    )}
                    <button
                      onClick={(e) => handleGenerateFlashcards(e, message.id)}
                      disabled={generatingFlashcards[message.id]}
                      className="relative px-3 py-1 bg-fuchsia-100 text-fuchsia-700 text-xs font-medium rounded-lg hover:bg-fuchsia-200 transition-colors disabled:opacity-50"
                    >
                      {generatingFlashcards[message.id] ? (
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-fuchsia-700 border-t-transparent rounded-full animate-spin"></div>
                          Generating...
                        </span>
                      ) : (
                        '🎴 Make Flashcards'
                      )}
                      {flashcardToasts[message.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-full left-0 mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10"
                        >
                          Flashcards created!
                        </motion.div>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
