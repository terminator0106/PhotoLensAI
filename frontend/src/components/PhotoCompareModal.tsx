import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, SlidersHorizontal } from 'lucide-react';

export function PhotoCompareModal({ isOpen, onClose, photo1, photo2 }: any) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <AnimatePresence>
      {isOpen && photo1 && photo2 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-12 bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#1A1A1A]">
              <h2 className="text-xl font-bold text-[#E5E5E5] flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                AI Photo Compare
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden select-none bg-[#0A0A0A]">
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={photo1.url} alt="Photo 1" className="max-w-full max-h-full object-contain" />
              </div>
              <div 
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              >
                <img src={photo2.url} alt="Photo 2" className="max-w-full max-h-full object-contain" />
              </div>
              <div 
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize hover:bg-primary/80 transition-colors"
                style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                onMouseDown={(e) => {
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
                    const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
                    setSliderPos((x / rect.width) * 100);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleMouseMove);
                  window.addEventListener('mouseup', handleMouseUp);
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(167,139,250,0.5)]">
                  <div className="w-4 h-4 flex justify-between items-center">
                    <div className="w-0.5 h-3 bg-[#0A0A0A] rounded-full" />
                    <div className="w-0.5 h-3 bg-[#0A0A0A] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-[#1A1A1A] flex justify-between text-sm text-[#A3A3A3]">
              <span>{photo1.caption || 'Image 1'}</span>
              <span>{photo2.caption || 'Image 2'}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
