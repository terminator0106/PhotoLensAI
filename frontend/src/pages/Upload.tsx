import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Image as ImageIcon, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiRequest } from '../lib/api';

export function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((file: File) => file.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    setUploadComplete(false);
    setError(null);

    try {
      let uploaded = 0;
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        await apiRequest('/photos/upload', { method: 'POST', body: form });
        uploaded += 1;
        setProgress(Math.round((uploaded / files.length) * 100));
      }

      setUploadComplete(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadComplete(false);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-[#E5E5E5]">Upload Photos</h1>
        <p className="text-[#A3A3A3] text-lg">Securely upload your photos for on-device AI organization.</p>
      </div>

      <AnimatePresence mode="wait">
        {!uploadComplete ? (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden bg-[#0A0A0A]/50 backdrop-blur-sm",
                isDragging
                  ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(167,139,250,0.2)] scale-[1.02]"
                  : "border-white/20 hover:border-primary/50 hover:bg-white/5",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />

              <div className="relative z-10 flex flex-col items-center text-center p-6">
                <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-primary/30 shadow-[0_0_20px_rgba(167,139,250,0.2)]">
                  <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <p className="text-xl font-semibold text-[#E5E5E5] mb-2">
                  Drag & drop your photos here
                </p>
                <p className="text-[#A3A3A3] mb-6">
                  or click to browse from your device
                </p>
                <div className="flex items-center gap-4 text-sm text-[#A3A3A3]">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <ImageIcon className="w-4 h-4" />
                    <span>JPG, PNG, WEBP</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <span>Up to 20MB per file</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Preview Grid */}
            {files.length > 0 && (
              <div className="mt-8 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#E5E5E5]">Selected Photos ({files.length})</h3>
                  <button
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 px-3 py-1 rounded-md hover:bg-red-500/10"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {files.map((file, index) => (
                      <motion.div
                        key={`${file.name}-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-[#0A0A0A] border border-white/10 group"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <button
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                            className="p-3 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors disabled:opacity-50 shadow-lg hover:shadow-red-500/50"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Action Area */}
            {files.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                {isUploading ? (
                  <div className="space-y-6 bg-[#0A0A0A]/50 p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-3 text-primary font-medium text-lg">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing photos with AI...
                      </span>
                      <span className="text-[#E5E5E5] font-bold text-lg">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-secondary to-accent relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "linear" }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                      </motion.div>
                    </div>
                    <p className="text-sm text-[#A3A3A3] text-center">Generating tags, captions, and checking quality...</p>
                  </div>
                ) : (
                  <button
                    onClick={handleUpload}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-bold text-lg shadow-[0_0_30px_rgba(167,139,250,0.3)] hover:shadow-[0_0_40px_rgba(167,139,250,0.5)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Sparkles className="w-5 h-5" />
                    Process with AI
                  </button>
                )}

                {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="success-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-12 text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center relative border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <CheckCircle2 className="w-16 h-16 text-green-400 relative z-10" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-[#E5E5E5]">Upload Complete!</h2>
            <p className="text-[#A3A3A3] mb-10 max-w-md mx-auto text-lg">
              Successfully uploaded and processed {files.length} photos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button
                onClick={() => window.location.href = '/gallery'}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-bold hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all active:scale-95"
              >
                View Gallery
              </button>
              <button
                onClick={resetUpload}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0A0A0A] border border-white/10 text-[#E5E5E5] font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Upload More
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
