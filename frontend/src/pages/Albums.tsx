import { motion } from 'motion/react';
import { Folder, Sparkles, Calendar, FolderPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type AlbumOut = {
  id: number;
  name: string;
  cover_image: string | null;
  created_at: string;
};

type PhotoOut = {
  id: number;
  image_url: string;
  public_id: string;
  caption: string | null;
  tags: string[];
  emotion: string | null;
  quality_score: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type AlbumWithPhotos = AlbumOut & {
  photos: PhotoOut[];
};

type SmartAlbum = {
  name: string;
  cover_image: string | null;
  photo_count: number;
  photos?: PhotoOut[];
};

type SmartAlbumsResponse = { albums: SmartAlbum[] };

export function Albums() {
  const navigate = useNavigate();

  const [smartAlbums, setSmartAlbums] = useState<SmartAlbum[]>([]);
  const [albums, setAlbums] = useState<AlbumOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [viewerPhotos, setViewerPhotos] = useState<PhotoOut[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  function toErrorMessage(e: unknown): string {
    const msg = e instanceof Error ? e.message : 'Request failed';
    if (msg.toLowerCase().includes('not authenticated') || msg.includes('(401)')) {
      return 'Please sign in to view and manage albums.';
    }
    return msg;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const errors: string[] = [];

        const smartRes = await apiRequest<SmartAlbumsResponse>('/albums/smart', { method: 'GET' }).catch((e) => {
          errors.push(toErrorMessage(e));
          return { albums: [] } as SmartAlbumsResponse;
        });

        const manualRes = await apiRequest<AlbumOut[]>('/albums', { method: 'GET' }).catch((e) => {
          errors.push(toErrorMessage(e));
          return [] as AlbumOut[];
        });
        if (cancelled) return;
        setSmartAlbums(smartRes.albums || []);
        setAlbums(manualRes || []);

        if (errors.length > 0) {
          // show the first error, but still render whatever data we got
          setError(errors[0]);
        }
      } catch (e) {
        if (cancelled) return;
        setError(toErrorMessage(e));
        setSmartAlbums([]);
        setAlbums([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateAlbum() {
    const name = newAlbumName.trim();
    if (!name) {
      setError('Album name is required.');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const created = await apiRequest<AlbumOut>('/albums', {
        method: 'POST',
        body: JSON.stringify({ name, cover_image: null }),
      });
      setAlbums((prev) => [created, ...prev]);
      setNewAlbumName('');
      setShowCreate(false);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setIsCreating(false);
    }
  }

  function closeViewer() {
    setIsViewerOpen(false);
    setViewerTitle('');
    setViewerPhotos([]);
    setViewerError(null);
    setViewerLoading(false);
  }

  async function openManualAlbum(album: AlbumOut) {
    setIsViewerOpen(true);
    setViewerTitle(album.name);
    setViewerPhotos([]);
    setViewerError(null);
    setViewerLoading(true);
    try {
      const res = await apiRequest<AlbumWithPhotos>(`/albums/${album.id}`, { method: 'GET' });
      setViewerTitle(res.name);
      setViewerPhotos(res.photos || []);
    } catch (e) {
      setViewerError(toErrorMessage(e));
    } finally {
      setViewerLoading(false);
    }
  }

  function openSmartAlbum(album: SmartAlbum) {
    setIsViewerOpen(true);
    setViewerTitle(album.name);
    setViewerPhotos(album.photos || []);
    setViewerError(null);
    setViewerLoading(false);

    if (!album.photos || album.photos.length === 0) {
      setViewerError('No photos in this smart album yet.');
    }
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-4 text-[#E5E5E5]">Albums</h1>
          <p className="text-[#A3A3A3] text-lg">Your photos, automatically organized by AI.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-bold hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all active:scale-95"
        >
          <Folder className="w-5 h-5" />
          New Album
        </button>
      </div>

      {showCreate && (
        <div className="mb-10 p-4 rounded-2xl bg-card border border-white/5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateAlbum();
              }}
              placeholder="Album name"
              className="flex-1 px-4 py-3 rounded-xl bg-bg-start border border-white/10 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isCreating}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCreateAlbum}
                disabled={isCreating}
                className="px-5 py-3 rounded-xl bg-primary text-bg-start font-bold active:scale-95 disabled:opacity-60"
              >
                {isCreating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewAlbumName('');
                }}
                disabled={isCreating}
                className="px-5 py-3 rounded-xl bg-white/10 text-text-primary font-bold active:scale-95 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-10 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          {error}
        </div>
      )}

      {isViewerOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={closeViewer} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeViewer}>
            <div
              className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-3xl bg-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 bg-[#1A1A1A] border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[#E5E5E5] font-bold text-lg">{viewerTitle || 'Album'}</div>
                  <div className="text-sm text-[#A3A3A3]">{viewerPhotos.length} photos</div>
                </div>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#E5E5E5]"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {viewerLoading ? (
                  <div className="text-[#A3A3A3]">Loading photos…</div>
                ) : viewerError ? (
                  <div className="text-red-300">{viewerError}</div>
                ) : viewerPhotos.length === 0 ? (
                  <div className="text-[#A3A3A3]">No photos in this album yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {viewerPhotos.map((p) => (
                      <div key={p.id} className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A]">
                        <img
                          src={p.image_url}
                          alt={p.caption || `#${p.id}`}
                          className="w-full aspect-square object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="p-3">
                          <div className="text-sm text-[#E5E5E5] line-clamp-2">{p.caption || 'Untitled'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Smart Albums Section */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-[#E5E5E5]">Smart Albums</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-[#1A1A1A] border border-white/5">
                <div className="aspect-[4/3] w-full bg-[#0A0A0A] animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : smartAlbums.length === 0 ? (
          <div className="text-[#A3A3A3]">No smart albums yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {smartAlbums.map((album, index) => (
              <motion.div
                key={album.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.6), duration: 0.4 }}
                whileHover={{ y: -10 }}
                onClick={() => openSmartAlbum(album)}
                className="group relative rounded-3xl overflow-hidden bg-[#1A1A1A] border border-white/5 hover:border-primary/50 hover:shadow-[0_0_40px_-10px_rgba(167,139,250,0.4)] transition-all duration-500 cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10" />
                  {album.cover_image ? (
                    <img
                      src={album.cover_image}
                      alt={album.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10" />
                  )}
                  <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center gap-2 text-primary shadow-[0_0_15px_rgba(167,139,250,0.3)]">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Smart Album</span>
                  </div>
                </div>

                <div className="p-6 relative z-20 bg-[#1A1A1A]">
                  <div className="flex items-center gap-2 text-[#A3A3A3] mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{album.photo_count} photos</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#E5E5E5] mb-2 group-hover:text-primary transition-colors">{album.name}</h3>
                </div>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30 rounded-3xl pointer-events-none transition-colors duration-500" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Albums Section */}
      <div className="mt-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white/10 rounded-lg">
            <Folder className="w-5 h-5 text-[#E5E5E5]" />
          </div>
          <h2 className="text-2xl font-bold text-[#E5E5E5]">Your Albums</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-[#1A1A1A] border border-white/5">
                <div className="aspect-[4/3] w-full bg-[#0A0A0A] animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="text-[#A3A3A3]">No albums created yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {albums.map((album, index) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.6), duration: 0.4 }}
                whileHover={{ y: -10 }}
                onClick={() => openManualAlbum(album)}
                className="group relative rounded-3xl overflow-hidden bg-[#1A1A1A] border border-white/5 hover:border-white/20 transition-all duration-500 cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10" />
                  {album.cover_image ? (
                    <img
                      src={album.cover_image}
                      alt={album.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                  )}
                </div>
                <div className="p-6 relative z-20 bg-[#1A1A1A]">
                  <div className="flex items-center gap-2 text-[#A3A3A3] mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Created {new Date(album.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#E5E5E5] mb-3">{album.name}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/gallery?addToAlbum=${album.id}&albumName=${encodeURIComponent(album.name)}`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors text-sm font-semibold"
                    title="Add photos to this album"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Add photos
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
