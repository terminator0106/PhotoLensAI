import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';

type ComparePhoto = {
  url: string;
  caption?: string;
};

type PhotoCompareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  photo1: ComparePhoto;
  photo2: ComparePhoto;
  onSave?: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  saveLabel?: string;
  saveError?: string | null;
};

export function PhotoCompareModal({
  isOpen,
  onClose,
  photo1,
  photo2,
  onSave,
  isSaving,
  isSaveDisabled,
  saveLabel,
  saveError,
}: PhotoCompareModalProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const onEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, onMouseMove, onTouchMove, onEnd]);

  return (
    <AnimatePresence>
      {isOpen && photo1 && photo2 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-12 bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl z-60 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-card/80 backdrop-blur-sm">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  AI Enhancement Comparison
                </h2>
                <p className="text-xs text-text-secondary mt-1">Slide to compare the original and enhanced versions</p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={containerRef}
              className="flex-1 relative overflow-hidden select-none bg-black group"
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              {/* Photo 1 (Original) - Background */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={photo1.url}
                  alt="Original"
                  className="max-w-full max-h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-xs font-medium text-white shadow-lg pointer-events-none">
                  {photo1.caption || 'Original Image'}
                </div>
              </div>

              {/* Photo 2 (Enhanced) - Foreground with Clip Path */}
              <div
                className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={photo2.url}
                  alt="Enhanced"
                  className="max-w-full max-h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-6 right-6 px-3 py-1.5 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-lg text-xs font-bold text-primary shadow-lg pointer-events-none">
                  {photo2.caption || 'AI Enhanced'}
                </div>
              </div>

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary/80 z-10 transition-colors"
                style={{ left: `${sliderPos}%` }}
              >
                <div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-ew-resize touch-none transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}
                >
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(167,139,250,0.6)] border-4 border-[#0A0A0A]">
                    <ArrowLeftRight className="w-5 h-5 text-[#0A0A0A]" />
                  </div>
                </div>
              </div>

              {/* Instruction Hint */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full text-[10px] text-white/50 uppercase tracking-widest font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Drag to Compare
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-card/80 backdrop-blur-sm flex items-center justify-between gap-4">
              <div className="flex-1">
                {saveError && (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {saveError}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                {onSave && (
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={!!isSaving || !!isSaveDisabled}
                    className="px-8 py-2.5 rounded-xl bg-primary text-[#0A0A0A] font-bold shadow-[0_0_20px_rgba(167,139,250,0.3)] hover:shadow-[0_0_30px_rgba(167,139,250,0.5)] transition-all disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (saveLabel || 'Save Enhanced')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
