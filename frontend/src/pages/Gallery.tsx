import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { PhotoCard, Photo } from '../components/PhotoCard';
import { Star, Tag, LayoutGrid, Search, Wand2, Copy, Activity, SlidersHorizontal, X, FolderPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { StoryGenerator } from '../components/StoryGenerator';
import { DuplicateDetectorPanel } from '../components/DuplicateDetectorPanel';
import { PhotoInspector } from '../components/PhotoInspector';
import { PhotoCompareModal } from '../components/PhotoCompareModal';
import { apiRequest } from '../lib/api';

type BackendPhotoOut = {
  id: number;
  image_url: string;
  public_id?: string | null;
  caption?: string | null;
  tags: string[];
  emotion?: string | null;
  quality_score?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
};

type BestPhotosResponse = { photos: BackendPhotoOut[] };

type AIInsightsResponse = {
  total_photos: number;
  total_tags: number;
  duplicate_photos: number;
  best_photos: number;
  mood_distribution: Record<string, number>;
};

type AlbumOut = {
  id: number;
  name: string;
  cover_image: string | null;
  created_at: string;
};

function toUiPhoto(p: BackendPhotoOut, bestIds?: Set<string>): Photo {
  const id = String(p.id);
  const createdAt = p.created_at ? new Date(p.created_at) : null;
  return {
    id,
    url: p.image_url,
    publicId: p.public_id ?? null,
    caption: p.caption || 'Untitled',
    tags: Array.isArray(p.tags) ? p.tags : [],
    date: createdAt ? createdAt.toISOString().slice(0, 10) : '',
    isBestShot: bestIds ? bestIds.has(id) : false,
    emotion: p.emotion ?? null,
    qualityScore: p.quality_score ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
  };
}

const filters = [
  { id: 'all', label: 'All Photos', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'tagged', label: 'AI Tagged', icon: <Tag className="w-4 h-4" /> },
  { id: 'favorites', label: 'Favorites', icon: <Star className="w-4 h-4" /> },
];

export function Gallery() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isDuplicatePanelOpen, setIsDuplicatePanelOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [displayPhotos, setDisplayPhotos] = useState<Photo[]>([]);
  const [bestIds, setBestIds] = useState<Set<string>>(new Set());
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);

  const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
  const [albumList, setAlbumList] = useState<AlbumOut[]>([]);
  const [albumListError, setAlbumListError] = useState<string | null>(null);
  const [isAlbumListLoading, setIsAlbumListLoading] = useState(false);
  const [albumIdToAdd, setAlbumIdToAdd] = useState<number | ''>('');
  const [photoToAdd, setPhotoToAdd] = useState<Photo | null>(null);
  const [addAlbumMessage, setAddAlbumMessage] = useState<string | null>(null);

  const [quickAddAlbumId, setQuickAddAlbumId] = useState<number | null>(null);
  const [quickAddAlbumName, setQuickAddAlbumName] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawId = (params.get('addToAlbum') || '').trim();
    const rawName = (params.get('albumName') || '').trim();

    const id = rawId ? Number(rawId) : NaN;
    if (rawId && Number.isFinite(id) && id > 0) {
      setQuickAddAlbumId(id);
      setQuickAddAlbumName(rawName);
    } else {
      setQuickAddAlbumId(null);
      setQuickAddAlbumName('');
    }
  }, [location.search]);

  useEffect(() => {
    if (!addAlbumMessage) return;
    const t = window.setTimeout(() => setAddAlbumMessage(null), 3000);
    return () => window.clearTimeout(t);
  }, [addAlbumMessage]);

  async function loadAlbums() {
    setIsAlbumListLoading(true);
    setAlbumListError(null);
    try {
      const res = await apiRequest<AlbumOut[]>('/albums', { method: 'GET' });
      setAlbumList(res || []);
    } catch (e) {
      setAlbumList([]);
      setAlbumListError(e instanceof Error ? e.message : 'Failed to load albums');
    } finally {
      setIsAlbumListLoading(false);
    }
  }

  async function addPhotoToAlbum(photoId: number, albumId: number) {
    await apiRequest<{ added: boolean }>('/albums/add-photo', {
      method: 'POST',
      body: JSON.stringify({ photo_id: photoId, album_id: albumId }),
    });
  }

  function openAddToAlbum(photo: Photo) {
    setPhotoToAdd(photo);
    setAlbumIdToAdd('');
    setIsAddToAlbumOpen(true);
    void loadAlbums();
  }

  function closeAddToAlbum() {
    setIsAddToAlbumOpen(false);
    setPhotoToAdd(null);
    setAlbumIdToAdd('');
    setAlbumListError(null);
  }

  async function handleConfirmAddToAlbum() {
    if (!photoToAdd) return;
    if (albumIdToAdd === '') {
      setAlbumListError('Please choose an album.');
      return;
    }

    try {
      await addPhotoToAlbum(Number(photoToAdd.id), Number(albumIdToAdd));
      setAddAlbumMessage(`Added to album successfully.`);
      closeAddToAlbum();

      // If we're in "quick add" mode for the same album, keep the banner visible.
      if (quickAddAlbumId && Number(albumIdToAdd) === quickAddAlbumId) {
        // no-op
      }
    } catch (e) {
      setAlbumListError(e instanceof Error ? e.message : 'Failed to add photo to album');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [photos, best, ai] = await Promise.all([
          apiRequest<BackendPhotoOut[]>('/photos', { method: 'GET' }),
          apiRequest<BestPhotosResponse>('/photos/best?limit=200', { method: 'GET' }).catch(() => ({ photos: [] } as BestPhotosResponse)),
          apiRequest<AIInsightsResponse>('/ai/insights', { method: 'GET' }).catch(() => null),
        ]);

        if (cancelled) return;

        const bestSet = new Set<string>((best?.photos || []).map((p) => String(p.id)));
        setBestIds(bestSet);

        const mapped = photos.map((p) => toUiPhoto(p, bestSet));
        setAllPhotos(mapped);
        setDisplayPhotos(mapped);
        if (ai) setInsights(ai);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load photos');
        setAllPhotos([]);
        setDisplayPhotos([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (!q) {
      setDisplayPhotos(allPhotos);
      return;
    }

    const timer = setTimeout(() => {
      (async () => {
        try {
          const res = await apiRequest<{ keywords: string[]; photos: BackendPhotoOut[] }>('/search/photos', {
            method: 'POST',
            body: JSON.stringify({ query: q }),
          });
          if (cancelled) return;
          setDisplayPhotos(res.photos.map((p) => toUiPhoto(p, bestIds)));
        } catch {
          if (cancelled) return;
          setDisplayPhotos([]);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, allPhotos, bestIds]);

  const filteredPhotos = useMemo(() => {
    const base = displayPhotos;
    if (activeFilter === 'tagged') return base.filter((p) => (p.tags || []).length > 0);
    if (activeFilter === 'favorites') return base.filter((p) => !!p.isBestShot);
    return base;
  }, [displayPhotos, activeFilter]);

  const tagCloud = useMemo(() => {
    const freq = new Map<string, number>();
    for (const p of allPhotos) {
      for (const t of p.tags || []) {
        const key = String(t).trim().toLowerCase();
        if (!key) continue;
        freq.set(key, (freq.get(key) || 0) + 1);
      }
    }

    const top = [...freq.entries()]
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 16);

    const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
    const colors = ['text-primary', 'text-secondary', 'text-accent', 'text-[#E5E5E5]', 'text-[#A3A3A3]'];

    return top.map(([name, count], idx) => {
      const sizeIndex = Math.min(sizes.length - 1, Math.floor((idx / Math.max(1, top.length - 1)) * (sizes.length - 1)));
      const color = colors[Math.min(colors.length - 1, idx)];
      return { name, count, size: sizes[sizeIndex], color };
    });
  }, [allPhotos]);

  const moodBars = useMemo(() => {
    const dist = insights?.mood_distribution || {};
    const entries = Object.entries(dist)
      .filter((entry): entry is [string, number] => {
        const [k, v] = entry;
        return !!k && typeof v === 'number';
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const colors = ['bg-primary', 'bg-secondary', 'bg-accent'];
    const text = ['text-primary', 'text-secondary', 'text-accent'];
    return entries.map(([label, value], i) => ({ label, value, barClass: colors[i] || 'bg-white/20', textClass: text[i] || 'text-[#A3A3A3]' }));
  }, [insights]);

  const handlePhotoClick = (photo: Photo) => {
    if (isCompareMode) {
      if (comparePhotos.length < 2) {
        setComparePhotos(prev => [...prev, photo]);
      }
    } else {
      setSelectedPhoto(photo);
    }
  };

  return (
    <div className="container mx-auto px-4 py-24">
      {addAlbumMessage && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200">
          {addAlbumMessage}
        </div>
      )}

      {quickAddAlbumId && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">Add photos to album</div>
              <div className="text-sm text-[#A3A3A3]">
                Click “Add to Album” on any photo to add it to <span className="text-[#E5E5E5] font-semibold">{quickAddAlbumName || `#${quickAddAlbumId}`}</span>.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/gallery', { replace: true })}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#E5E5E5]"
            title="Exit add-to-album mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-8">Your Gallery</h1>
        <SearchBar onSearch={setSearchQuery} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Gallery Area */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto hide-scrollbar">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                    activeFilter === filter.id
                      ? "bg-[#E5E5E5] text-[#0A0A0A] border-[#E5E5E5]"
                      : "bg-[#1A1A1A] text-[#A3A3A3] border-white/10 hover:bg-white/10 hover:text-[#E5E5E5]"
                  )}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsCompareMode(!isCompareMode)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  isCompareMode
                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(167,139,250,0.3)]"
                    : "bg-[#1A1A1A] border-white/10 text-[#A3A3A3] hover:bg-white/10 hover:text-[#E5E5E5]"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {isCompareMode ? 'Cancel Compare' : 'Compare'}
              </button>
              <button
                onClick={() => setIsStoryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-sm font-medium text-[#E5E5E5] hover:bg-primary/30 transition-all shadow-[0_0_15px_rgba(167,139,250,0.2)] hover:shadow-[0_0_20px_rgba(167,139,250,0.4)]"
              >
                <Wand2 className="w-4 h-4 text-primary" />
                AI Story
              </button>
              <button
                onClick={() => setIsDuplicatePanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-sm font-medium text-[#A3A3A3] hover:bg-white/10 hover:text-[#E5E5E5] transition-all"
              >
                <Copy className="w-4 h-4" />
                Find Duplicates
              </button>
            </div>
          </div>

          {isCompareMode && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between">
              <span className="text-primary font-medium">
                {comparePhotos.length === 0 ? 'Select first photo to compare' :
                  comparePhotos.length === 1 ? 'Select second photo to compare' :
                    'Ready to compare!'}
              </span>
              {comparePhotos.length === 2 && (
                <div className="flex gap-2">
                  <button onClick={() => setComparePhotos([])} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">Clear</button>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="break-inside-avoid">
                  <div className="w-full aspect-[4/3] bg-[#1A1A1A] animate-pulse rounded-2xl border border-white/5" />
                </div>
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-white/10">
                <Search className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[#E5E5E5]">No photos found</h3>
              <p className="text-[#A3A3A3]">{loadError ? loadError : 'Upload photos or try a different search.'}</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {filteredPhotos.map((photo, index) => {
                const isSelectedForCompare = comparePhotos.some(p => p.id === photo.id);
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    className="break-inside-avoid relative"
                  >
                    <PhotoCard
                      photo={photo}
                      onClick={() => handlePhotoClick(photo)}
                      onAddToAlbum={async () => {
                        if (quickAddAlbumId) {
                          try {
                            await addPhotoToAlbum(Number(photo.id), quickAddAlbumId);
                            setAddAlbumMessage(`Added to ${quickAddAlbumName || 'album'}.`);
                          } catch (e) {
                            setLoadError(e instanceof Error ? e.message : 'Failed to add photo to album');
                          }
                          return;
                        }
                        openAddToAlbum(photo);
                      }}
                      className={isSelectedForCompare ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#0A0A0A]' : ''}
                    />
                    {isSelectedForCompare && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[#0A0A0A] font-bold text-xs z-20">
                        {comparePhotos.findIndex(p => p.id === photo.id) + 1}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insight Dashboard Panel */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#E5E5E5] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              AI Insights
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Total Photos</span>
                <span className="text-[#E5E5E5] font-bold">{insights ? insights.total_photos : allPhotos.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">AI Tags Generated</span>
                <span className="text-[#E5E5E5] font-bold">{insights ? insights.total_tags : tagCloud.reduce((acc, t) => acc + t.count, 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Duplicate Photos</span>
                <span className="text-red-400 font-bold">{insights ? insights.duplicate_photos : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Best Photos</span>
                <span className="text-yellow-500 font-bold">{insights ? insights.best_photos : bestIds.size}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-sm font-medium text-[#A3A3A3] mb-3">Mood Distribution</h4>
              {moodBars.length === 0 ? (
                <div className="text-sm text-[#A3A3A3]">No mood data yet.</div>
              ) : (
                <div className="space-y-3">
                  {moodBars.map((m, idx) => (
                    <div key={m.label + idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#E5E5E5] capitalize">{m.label}</span>
                        <span className={m.textClass}>{m.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#0A0A0A] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 1, delay: 0.2 + idx * 0.1 }} className={`h-full ${m.barClass}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#E5E5E5] mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-secondary" />
              AI Tag Cloud
            </h3>
            <div className="flex flex-wrap gap-3 justify-center items-center py-4">
              {tagCloud.length === 0 ? (
                <div className="text-sm text-[#A3A3A3]">No tags yet.</div>
              ) : tagCloud.map((tag, i) => (
                <motion.span
                  key={tag.name}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                  transition={{ delay: i * 0.1, repeat: Infinity, duration: 3 + Math.random() * 2, ease: "easeInOut" }}
                  className={`${tag.size} ${tag.color} font-bold cursor-pointer hover:scale-110 transition-transform`}
                >
                  #{tag.name}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isAddToAlbumOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={closeAddToAlbum}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-5 bg-[#1A1A1A] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#E5E5E5] font-bold">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  Add photo to album
                </div>
                <button
                  type="button"
                  onClick={closeAddToAlbum}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#E5E5E5]"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {photoToAdd && (
                  <div className="flex items-center gap-3">
                    <img
                      src={photoToAdd.url}
                      alt="To add"
                      className="w-16 h-16 rounded-xl object-cover border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="text-[#E5E5E5] font-semibold truncate">{photoToAdd.caption}</div>
                      <div className="text-sm text-[#A3A3A3] truncate">#{photoToAdd.id}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#A3A3A3] mb-2">Choose album</label>
                  <select
                    value={albumIdToAdd}
                    onChange={(e) => setAlbumIdToAdd(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-white/10 text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    disabled={isAlbumListLoading}
                  >
                    <option value="">Select an album…</option>
                    {albumList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {isAlbumListLoading && <div className="mt-2 text-sm text-[#A3A3A3]">Loading albums…</div>}
                  {!isAlbumListLoading && albumList.length === 0 && (
                    <div className="mt-2 text-sm text-[#A3A3A3]">No albums yet. Create one in Albums first.</div>
                  )}
                  {albumListError && (
                    <div className="mt-2 text-sm text-red-300">{albumListError}</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddToAlbum}
                    className="px-5 py-3 rounded-xl bg-white/10 text-[#E5E5E5] font-semibold border border-white/10 hover:bg-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddToAlbum}
                    className="px-5 py-3 rounded-xl bg-primary text-[#0A0A0A] font-bold disabled:opacity-60"
                    disabled={isAlbumListLoading || !photoToAdd}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <StoryGenerator
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        photoIds={allPhotos.slice(0, 12).map((p) => parseInt(p.id, 10)).filter((n) => Number.isFinite(n))}
      />

      <DuplicateDetectorPanel
        isOpen={isDuplicatePanelOpen}
        onClose={() => setIsDuplicatePanelOpen(false)}
      />

      <PhotoInspector
        isOpen={!!selectedPhoto && !isCompareMode}
        onClose={() => setSelectedPhoto(null)}
        photo={selectedPhoto}
      />

      <PhotoCompareModal
        isOpen={comparePhotos.length === 2}
        onClose={() => {
          setComparePhotos([]);
          setIsCompareMode(false);
        }}
        photo1={comparePhotos[0]}
        photo2={comparePhotos[1]}
      />
    </div>
  );
}
