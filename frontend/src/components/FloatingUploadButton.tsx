import { UploadCloud, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Upload as UploadComponent } from '../pages/Upload';

export function FloatingUploadButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] shadow-[0_0_20px_rgba(167,139,250,0.5)] flex items-center justify-center z-40 hover:shadow-[0_0_30px_rgba(167,139,250,0.8)] transition-shadow"
      >
        <UploadCloud className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-12 bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="p-4 md:p-8">
                <UploadComponent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
