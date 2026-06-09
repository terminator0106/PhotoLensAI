import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag, Image as ImageIcon, Smile, Sparkles, Star, Info } from 'lucide-react';
import { Photo } from './PhotoCard';
import { PhotoCompareModal } from './PhotoCompareModal';
import { apiRequest } from '../lib/api';

type SaveEnhancedResponse = {
  id?: number;
  photo_id?: number;
  image_url: string;
  public_id?: string | null;
  tags?: string[];
  caption?: string | null;
  quality_score?: number | null;
};

export function PhotoInspector({
  isOpen,
  onClose,
  photo,
  onPhotoSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo | null;
  onPhotoSaved?: (saved: Photo) => void;
}) {
  if (!photo) return null;

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSavingEnhanced, setIsSavingEnhanced] = useState(false);
  const [saveEnhancedError, setSaveEnhancedError] = useState<string | null>(null);
  const [isEnhancedSaved, setIsEnhancedSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEnhancing(false);
      setEnhancedUrl(null);
      setEnhanceError(null);
      setIsCompareOpen(false);
      setIsSavingEnhanced(false);
      setSaveEnhancedError(null);
      setIsEnhancedSaved(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset enhancement state when switching photos.
    setIsEnhancing(false);
    setEnhancedUrl(null);
    setEnhanceError(null);
    setIsCompareOpen(false);
    setIsSavingEnhanced(false);
    setSaveEnhancedError(null);
    setIsEnhancedSaved(false);
  }, [photo.id]);

  const handleEnhance = async () => {
    if (isEnhancing) return;
    setEnhanceError(null);
    setIsEnhancing(true);
    try {
      const res = await apiRequest<{ enhanced_image_url?: string | null }>('/ai/enhance-image', {
        method: 'POST',
        body: JSON.stringify({ image_url: photo.url }),
      });

      const url = (res?.enhanced_image_url || '').trim();
      if (!url) throw new Error('No enhanced image returned');

      setEnhancedUrl(url);
      setIsEnhancedSaved(false);
      setSaveEnhancedError(null);
      setIsCompareOpen(true);
    } catch (e: any) {
      setEnhanceError(e?.message || 'Image enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveEnhanced = async () => {
    if (!enhancedUrl || isSavingEnhanced || isEnhancedSaved) return;
    setSaveEnhancedError(null);
    setIsSavingEnhanced(true);
    try {
      const res = await apiRequest<SaveEnhancedResponse>('/photos/save-enhanced', {
        method: 'POST',
        body: JSON.stringify({ original_photo_id: Number(photo.id), enhanced_data_url: enhancedUrl }),
      });

      const saved: Photo = {
        id: String(res.photo_id ?? res.id ?? ''),
        url: res.image_url,
        publicId: res.public_id ?? null,
        caption: (res.caption || 'Enhanced photo') as string,
        tags: Array.isArray(res.tags) ? res.tags : [],
        date: new Date().toISOString().slice(0, 10),
        isBestShot: false,
        emotion: photo.emotion ?? null,
        qualityScore: res.quality_score ?? null,
        latitude: photo.latitude ?? null,
        longitude: photo.longitude ?? null,
      };

      setIsEnhancedSaved(true);
      onPhotoSaved?.(saved);
    } catch (e: any) {
      setSaveEnhancedError(e?.message || 'Failed to save enhanced photo');
    } finally {
      setIsSavingEnhanced(false);
    }
  };

  return (
    <>
      <PhotoCompareModal
        isOpen={isCompareOpen && !!enhancedUrl}
        onClose={() => setIsCompareOpen(false)}
        photo1={{ url: photo.url, caption: 'Original' }}
        photo2={{ url: enhancedUrl || '', caption: 'Enhanced' }}
        onSave={handleSaveEnhanced}
        isSaving={isSavingEnhanced}
        isSaveDisabled={isEnhancedSaved}
        saveLabel={isEnhancedSaved ? 'Saved' : 'Save'}
        saveError={saveEnhancedError}
      />
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed inset-4 md:inset-10 bg-[#0A0A0A] border border-white/10 shadow-2xl z-50 flex flex-col rounded-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-card">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Inspector
                </h2>
                <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
                <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-white/10 bg-[#0A0A0A] flex items-center justify-center p-4">
                  <img
                    src={photo.url}
                    alt="Inspect"
                    className="max-w-full max-h-full object-contain rounded-2xl border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="md:col-span-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  <div className="bg-card rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-text-secondary">
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

                  <div className="bg-card rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">AI Generated Caption</span>
                    </div>
                    <p className="text-text-primary">{photo.caption}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Scene Type</span>
                      </div>
                      <p className="text-text-primary font-medium capitalize">{photo.tags?.[0] || '—'}</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <Smile className="w-4 h-4" />
                        <span className="text-sm font-medium">Emotion</span>
                      </div>
                      <p className="text-text-primary font-medium capitalize">{photo.emotion || '—'}</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 text-text-secondary mb-3">
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

                  <div className="bg-linear-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20 flex items-center justify-between hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-shadow">
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
    </>
  );
}
