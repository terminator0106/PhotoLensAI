import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Wand2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface StoryPage {
  page: number;
  text: string;
  image_index: number;
  image_url: string;
}

interface StoryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  photoIds?: number[];
  title?: string;
}

export function StoryGenerator({ isOpen, onClose, photoIds, title }: StoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(() => {
    const arr = (photoIds || []).filter((n) => Number.isFinite(n));
    return Array.from(new Set(arr)).slice(0, 25);
  }, [photoIds]);

  const generateStory = async () => {
    if (ids.length === 0) return;
    setIsGenerating(true);
    setPages([]);
    setError(null);
    setCurrentPage(0);

    try {
      const res = await apiRequest<{ story: string; pages: StoryPage[] }>('/ai/generate-story', {
        method: 'POST',
        body: JSON.stringify({ photo_ids: ids }),
      });
      if (res.pages && res.pages.length > 0) {
        setPages(res.pages);
      } else {
        // Fallback or handle differently
        setError('Could not generate story pages. Please try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate story');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] border border-white/10 shadow-[0_0_50px_rgba(167,139,250,0.15)] flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/50 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/70 border border-white/5 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {!pages.length && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-primary via-secondary to-indigo-600 flex items-center justify-center shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] transform -rotate-6">
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  {title || 'Story Mode'}
                </h2>
                <p className="text-text-secondary text-lg max-w-md mb-10 leading-relaxed">
                  Our AI will weave your selected moments into a vivid, episodic storybook.
                </p>
                <button
                  onClick={generateStory}
                  disabled={ids.length === 0}
                  className="px-10 py-5 rounded-2xl bg-white text-black font-black text-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <Sparkles className="w-6 h-6" />
                  Create Storybook
                </button>
                {error && <p className="mt-6 text-red-400 font-medium">{error}</p>}
              </div>
            ) : isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="relative">
                  <div className="w-20 h-20 border-t-4 border-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-primary/50" />
                  </div>
                </div>
                <h3 className="mt-8 text-2xl font-bold animate-pulse text-white">Writing your story...</h3>
                <p className="mt-2 text-text-secondary">Selecting moments and crafting prose</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Image Side */}
                <div className="flex-1 bg-black relative flex items-center justify-center p-8 md:p-12">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentPage}
                      initial={{ opacity: 0, x: -20, scale: 1.05 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      src={pages[currentPage].image_url}
                      className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-white/5"
                    />
                  </AnimatePresence>

                  {/* Page Indicator Bubble */}
                  <div className="absolute bottom-12 left-12 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold tracking-widest uppercase">
                    Page {currentPage + 1} / {pages.length}
                  </div>
                </div>

                {/* Text Side */}
                <div className="w-full md:w-[400px] bg-[#0F0F0F] border-l border-white/5 p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50" />

                  <div className="relative">
                    <div className="text-primary/10 text-8xl font-serif absolute -top-12 -left-8 pointer-events-none italic">"</div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                      >
                        <p className="text-xl md:text-2xl text-white/90 leading-relaxed font-serif italic relative z-10 first-letter:text-4xl first-letter:font-bold first-letter:text-primary">
                          {pages[currentPage].text}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation */}
                  <div className="mt-12 flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 transition-all border border-white/5 active:scale-90"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                      disabled={currentPage === pages.length - 1}
                      className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-3 font-bold border border-white/5 disabled:opacity-20 transition-all active:scale-95"
                    >
                      Next Chapter
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => { setPages([]); setCurrentPage(0); }}
                    className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors uppercase tracking-[0.2em] font-bold"
                  >
                    Respin Story
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
