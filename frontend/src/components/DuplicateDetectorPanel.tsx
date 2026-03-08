import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiRequest } from '../lib/api';

type BackendPhotoOut = {
  id: number;
  image_url: string;
  caption?: string | null;
  quality_score?: number | null;
};

type BackendDuplicateGroup = {
  group_id: string;
  photos: BackendPhotoOut[];
  similarity: number;
  potential_savings_bytes: number;
};

type DuplicateResponse = {
  groups: BackendDuplicateGroup[];
  total_groups: number;
  potential_savings_bytes: number;
};

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (!Number.isFinite(mb)) return '0 MB';
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

interface DuplicateDetectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DuplicateDetectorPanel({ isOpen, onClose }: DuplicateDetectorPanelProps) {
  const [groups, setGroups] = useState<BackendDuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await apiRequest<DuplicateResponse>('/photos/duplicates', { method: 'GET' });
      setGroups(res.groups || []);
      setHasScanned(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to scan for duplicates');
      setGroups([]);
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  };

  const deleteDuplicatesInGroup = async (group: BackendDuplicateGroup) => {
    const sorted = [...(group.photos || [])].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
    const keep = sorted[0];
    const toDelete = sorted.slice(1);
    if (!keep || toDelete.length === 0) return;

    setIsDeleting(true);
    setError(null);
    try {
      for (const p of toDelete) {
        await apiRequest(`/photos/${p.id}`, { method: 'DELETE' });
      }
      setGroups((prev) => prev.filter((g) => g.group_id !== group.group_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete duplicates');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSavedSpaceBytes = useMemo(() => {
    return (groups || []).reduce((acc, g) => acc + (g.potential_savings_bytes || 0), 0);
  }, [groups]);

  return (
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Copy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#E5E5E5]">Duplicate Detector</h2>
                  <p className="text-sm text-[#A3A3A3]">Find and remove visually similar photos</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {!hasScanned ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-24 h-24 mb-6 relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative w-full h-full bg-[#1A1A1A] border border-primary/30 rounded-full flex items-center justify-center">
                      <Copy className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#E5E5E5] mb-2">Scan for Duplicates</h3>
                  <p className="text-[#A3A3A3] max-w-md mb-8">
                    Our local AI will analyze your gallery to find exact duplicates and visually similar photos, helping you free up space.
                  </p>
                  <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-medium hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isScanning ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Copy className="w-5 h-5" />
                        </motion.div>
                        Analyzing Gallery...
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Start Scan
                      </>
                    )}
                  </button>
                  {error && <div className="mt-6 text-sm text-red-400">{error}</div>}
                </div>
              ) : groups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-20 h-20 mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#E5E5E5] mb-2">Gallery is Clean!</h3>
                  <p className="text-[#A3A3A3]">No duplicate photos were found in your gallery.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                      <span className="text-[#E5E5E5] font-medium">Found {groups.length} duplicate groups</span>
                    </div>
                    <div className="text-sm text-primary font-medium">
                      Potential space savings: {formatMb(totalSavedSpaceBytes)}
                    </div>
                  </div>

                  {error && <div className="text-sm text-red-400">{error}</div>}

                  {groups.map((group) => (
                    <div key={group.group_id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[#E5E5E5] font-medium">Similar Photos</h4>
                        <span className="text-xs text-[#A3A3A3] bg-white/5 px-2 py-1 rounded-md">
                          Saves {formatMb(group.potential_savings_bytes || 0)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {(() => {
                          const sorted = [...(group.photos || [])].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
                          const keep = sorted[0];
                          const dups = sorted.slice(1);
                          if (!keep) return null;
                          return (
                            <>
                              <div className="relative group/photo">
                                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase z-10">
                                  Keep
                                </div>
                                <img src={keep.image_url} alt="Keep" className="w-full aspect-square object-cover rounded-lg border-2 border-green-500/50" />
                              </div>
                              {dups.map((p) => (
                                <div key={p.id} className="relative group/photo">
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase z-10">
                                    Delete
                                  </div>
                                  <img src={p.image_url} alt="Duplicate" className="w-full aspect-square object-cover rounded-lg border-2 border-red-500/50 opacity-80" />
                                  <div className="absolute inset-0 bg-red-500/10 rounded-lg pointer-events-none" />
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          disabled={isDeleting}
                          onClick={() => deleteDuplicatesInGroup(group)}
                          className={cn(
                            "px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors flex items-center gap-2",
                            isDeleting && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Duplicates
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {hasScanned && groups.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-[#1A1A1A] flex justify-end">
                <button
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    setError(null);
                    try {
                      for (const g of groups) {
                        const sorted = [...(g.photos || [])].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
                        const toDelete = sorted.slice(1);
                        for (const p of toDelete) {
                          await apiRequest(`/photos/${p.id}`, { method: 'DELETE' });
                        }
                      }
                      setGroups([]);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to delete duplicates');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className={cn(
                    "px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all active:scale-95 flex items-center gap-2",
                    isDeleting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Duplicates
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
