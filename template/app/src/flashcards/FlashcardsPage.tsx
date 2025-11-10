import { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery } from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getDueFlashcards,
  getFlashcardsByUser,
  reviewFlashcard,
  deleteFlashcard,
  updateFlashcard,
} from 'wasp/client/operations';
import { type Flashcard, type Message } from 'wasp/entities';

export default function FlashcardsPage() {
  const { data: user } = useAuth();
  const { data: dueFlashcards, refetch: refetchDue } = useQuery(getDueFlashcards);
  const { data: allFlashcards, refetch: refetchAll } = useQuery(getFlashcardsByUser);

  const [viewMode, setViewMode] = useState<'study' | 'library'>('study');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);

  const currentFlashcards = viewMode === 'study' ? dueFlashcards : allFlashcards;
  const currentCard = currentFlashcards?.[currentCardIndex];

  // Handle review with SM-2 quality ratings
  // 0-2 = Again, 3 = Hard, 4 = Good, 5 = Easy
  const handleReview = async (quality: number) => {
    if (!currentCard || isReviewing) return;

    setIsReviewing(true);
    try {
      await reviewFlashcard({ flashcardId: currentCard.id, quality });

      // Move to next card or finish
      if (currentCardIndex < (currentFlashcards?.length || 0) - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setShowAnswer(false);
      } else {
        // Finished all cards
        setCurrentCardIndex(0);
        setShowAnswer(false);
        refetchDue();
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDelete = async (flashcardId: string) => {
    if (!confirm('Delete this flashcard?')) return;

    try {
      await deleteFlashcard({ flashcardId });
      refetchAll();
      refetchDue();
    } catch (error) {
      console.error('Error deleting flashcard:', error);
    }
  };

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
            <div className="flex items-center space-x-3">
              <a href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">T</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 bg-clip-text text-transparent">
                  ThaiCopilot
                </h1>
              </a>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center space-x-2 bg-white rounded-xl p-1 border border-purple-200">
              <button
                onClick={() => {
                  setViewMode('study');
                  setCurrentCardIndex(0);
                  setShowAnswer(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'study'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                Study ({dueFlashcards?.length || 0})
              </button>
              <button
                onClick={() => {
                  setViewMode('library');
                  setCurrentCardIndex(0);
                  setShowAnswer(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'library'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                Library ({allFlashcards?.length || 0})
              </button>
            </div>

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentFlashcards || currentFlashcards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🎴</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {viewMode === 'study' ? 'All Caught Up!' : 'No Flashcards Yet'}
            </h2>
            <p className="text-slate-600 text-center max-w-md mb-6">
              {viewMode === 'study'
                ? "You've reviewed all your due flashcards. Great work! Come back later for more practice."
                : 'Create flashcards from your conversations to start learning.'}
            </p>
            <a
              href="/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all"
            >
              Go to Dashboard
            </a>
          </motion.div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">
                  Card {currentCardIndex + 1} of {currentFlashcards.length}
                </span>
                <span className="text-sm text-slate-500">
                  {Math.round(((currentCardIndex + 1) / currentFlashcards.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((currentCardIndex + 1) / currentFlashcards.length) * 100}%`,
                  }}
                  className="bg-gradient-to-r from-purple-600 to-fuchsia-600 h-2 rounded-full transition-all"
                />
              </div>
            </div>

            {/* Flashcard */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard?.id}
                initial={{ opacity: 0, rotateY: -10 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 10 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 p-8 cursor-pointer hover:shadow-3xl transition-all min-h-[400px] flex flex-col justify-center items-center relative"
                >
                  {/* Front of card - Question */}
                  {!showAnswer ? (
                    <div className="text-center">
                      <div className="mb-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          Thai → English
                        </span>
                      </div>
                      <h2 className="text-4xl font-bold text-slate-800 mb-4">
                        {currentCard.phrase}
                      </h2>
                      <p className="text-slate-500 text-sm">Click to reveal translation</p>
                    </div>
                  ) : (
                    /* Back of card - Answer */
                    <div className="w-full">
                      <div className="mb-6 text-center">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">
                          {currentCard.phrase}
                        </h2>
                        <p className="text-xl text-purple-600 font-semibold mb-4">
                          {currentCard.translation}
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-6 mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Breakdown:</h3>
                        <p className="text-slate-700">{currentCard.breakdown}</p>
                      </div>

                      {currentCard.notes && (
                        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                          <h3 className="text-sm font-semibold text-blue-800 mb-2">Notes:</h3>
                          <p className="text-blue-700 text-sm">{currentCard.notes}</p>
                        </div>
                      )}

                      {currentCard.audioUrl && (
                        <div className="text-center">
                          <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors">
                            ▶ Play Audio
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flip indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">
                    {showAnswer ? 'Click to hide' : 'Click to reveal'}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Review Buttons (only in study mode when answer is shown) */}
            {viewMode === 'study' && showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-3"
              >
                <button
                  onClick={() => handleReview(0)}
                  disabled={isReviewing}
                  className="py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="text-sm mb-1">Again</div>
                  <div className="text-xs opacity-80">&lt;1 min</div>
                </button>
                <button
                  onClick={() => handleReview(3)}
                  disabled={isReviewing}
                  className="py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="text-sm mb-1">Hard</div>
                  <div className="text-xs opacity-80">1 day</div>
                </button>
                <button
                  onClick={() => handleReview(4)}
                  disabled={isReviewing}
                  className="py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="text-sm mb-1">Good</div>
                  <div className="text-xs opacity-80">
                    {currentCard.repetitions === 0 ? '1 day' : '6 days'}
                  </div>
                </button>
                <button
                  onClick={() => handleReview(5)}
                  disabled={isReviewing}
                  className="py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="text-sm mb-1">Easy</div>
                  <div className="text-xs opacity-80">
                    {currentCard.interval > 0 ? `${currentCard.interval} days` : '6 days'}
                  </div>
                </button>
              </motion.div>
            )}

            {/* Navigation buttons (library mode) */}
            {viewMode === 'library' && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => {
                    if (currentCardIndex > 0) {
                      setCurrentCardIndex(currentCardIndex - 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentCardIndex === 0}
                  className="px-6 py-3 bg-white border-2 border-purple-200 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleDelete(currentCard.id)}
                  className="px-6 py-3 bg-red-50 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    if (currentCardIndex < (currentFlashcards?.length || 0) - 1) {
                      setCurrentCardIndex(currentCardIndex + 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentCardIndex === (currentFlashcards?.length || 0) - 1}
                  className="px-6 py-3 bg-white border-2 border-purple-200 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
