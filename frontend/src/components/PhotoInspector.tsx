import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag, Image as ImageIcon, Smile, Sparkles, Star, Info } from 'lucide-react';
import { Photo } from './PhotoCard';
import { PhotoCompareModal } from './PhotoCompareModal';

export function PhotoInspector({ isOpen, onClose, photo }: { isOpen: boolean; onClose: () => void; photo: Photo | null }) {
  if (!photo) return null;

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEnhancing(false);
      setEnhancedUrl(null);
      setEnhanceError(null);
      setIsCompareOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset enhancement state when switching photos.
    setIsEnhancing(false);
    setEnhancedUrl(null);
    setEnhanceError(null);
    setIsCompareOpen(false);
  }, [photo.id]);

  const handleEnhance = async () => {
    if (isEnhancing) return;
    setEnhanceError(null);
    setIsEnhancing(true);

    let objectUrl: string | null = null;
    try {
      // Fetch to a same-origin blob URL to avoid canvas/CORS issues.
      const res = await fetch(photo.url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);

      const { default: Upscaler } = await import('upscaler');
      const upscaler = new Upscaler();
      const upscaled = await upscaler.upscale(objectUrl);

      if (typeof upscaled !== 'string' || !upscaled) throw new Error('Upscale failed');
      setEnhancedUrl(upscaled);
      setIsCompareOpen(true);
    } catch (e: any) {
      setEnhanceError(e?.message || 'Image enhancement failed');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setIsEnhancing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <PhotoCompareModal
            isOpen={isCompareOpen && !!enhancedUrl}
            onClose={() => setIsCompareOpen(false)}
            photo1={{ url: photo.url, caption: 'Original' }}
            photo2={{ url: enhancedUrl || '', caption: 'Enhanced' }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0A0A0A] border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
              <h2 className="text-xl font-bold text-[#E5E5E5] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Inspector
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              <div className="rounded-2xl overflow-hidden border border-white/10 relative group">
                <img src={photo.url} alt="Inspect" className="w-full h-auto" />
              </div>

              <div className="space-y-6">
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#A3A3A3]">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Image Enhancement</span>
                    </div>
                    <button
                      onClick={handleEnhance}
                      disabled={isEnhancing}
                      className="px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                    >
                      {isEnhancing ? 'Enhancing…' : 'Enhance'}
                    </button>
                  </div>
                  {enhanceError && (
                    <p className="mt-3 text-sm text-red-400">{enhanceError}</p>
                  )}
                </div>

                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-[#A3A3A3] mb-2">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">AI Generated Caption</span>
                  </div>
                  <p className="text-[#E5E5E5]">{photo.caption}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 text-[#A3A3A3] mb-2">
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Scene Type</span>
                    </div>
                    <p className="text-[#E5E5E5] font-medium capitalize">{photo.tags?.[0] || '—'}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 text-[#A3A3A3] mb-2">
                      <Smile className="w-4 h-4" />
                      <span className="text-sm font-medium">Emotion</span>
                    </div>
                    <p className="text-[#E5E5E5] font-medium capitalize">{photo.emotion || '—'}</p>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-[#A3A3A3] mb-3">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm font-medium">Detected Objects</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photo.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm hover:bg-primary/20 transition-colors cursor-default">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20 flex items-center justify-between hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                      <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="text-sm text-yellow-500/80 font-medium">Quality Score</div>
                      <div className="text-xl font-bold text-yellow-500">
                        {photo.qualityScore == null ? '—' : `${(photo.qualityScore / 10).toFixed(1)}/10`}
                      </div>
                    </div>
                  </div>
                  {photo.isBestShot && (
                    <span className="px-3 py-1 bg-yellow-500 text-[#0A0A0A] text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                      Best Shot
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
