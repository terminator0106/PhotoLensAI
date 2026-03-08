import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Wand2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface StoryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  photoIds?: number[];
  title?: string;
}

export function StoryGenerator({ isOpen, onClose, photoIds, title }: StoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(() => {
    const arr = (photoIds || []).filter((n) => Number.isFinite(n));
    return Array.from(new Set(arr)).slice(0, 25);
  }, [photoIds]);

  const generateStory = async () => {
    if (ids.length === 0) return;
    setIsGenerating(true);
    setStory('');
    setError(null);

    try {
      const res = await apiRequest<{ story: string }>('/ai/generate-story', {
        method: 'POST',
        body: JSON.stringify({ photo_ids: ids }),
      });
      setStory(res.story || '');
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
            className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#1E293B] border border-white/10 shadow-2xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)]">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{title || 'AI Story Generator'}</h2>
              <p className="text-white/60 text-sm">
                Generate a story from your recent photos.
              </p>
            </div>

            {!story && !isGenerating ? (
              <button
                onClick={generateStory}
                disabled={ids.length === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5" />
                {ids.length === 0 ? 'No photos available' : `Generate Story (${ids.length} photos)`}
              </button>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-white/60 animate-pulse">Crafting your story...</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0F172A] rounded-xl p-6 border border-white/10 relative"
              >
                <div className="absolute -top-3 -left-3 text-4xl text-primary/40 font-serif">"</div>
                <p className="text-white/90 leading-relaxed relative z-10 italic">
                  {story}
                </p>
                <div className="absolute -bottom-5 -right-3 text-4xl text-primary/40 font-serif">"</div>

                <button
                  onClick={() => setStory('')}
                  className="mt-6 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                >
                  Generate Another
                </button>
              </motion.div>
            )}

            {error && <div className="mt-6 text-sm text-red-300">{error}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
