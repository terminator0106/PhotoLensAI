import { motion } from 'motion/react';
import { Folder, Sparkles, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type AlbumOut = {
  id: number;
  name: string;
  cover_image: string | null;
  created_at: string;
};

type SmartAlbum = {
  name: string;
  cover_image: string | null;
  photo_count: number;
};

type SmartAlbumsResponse = { albums: SmartAlbum[] };

export function Albums() {
  const [smartAlbums, setSmartAlbums] = useState<SmartAlbum[]>([]);
  const [albums, setAlbums] = useState<AlbumOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [smartRes, manualRes] = await Promise.all([
          apiRequest<SmartAlbumsResponse>('/albums/smart', { method: 'GET' }).catch(() => ({ albums: [] } as SmartAlbumsResponse)),
          apiRequest<AlbumOut[]>('/albums', { method: 'GET' }).catch(() => [] as AlbumOut[]),
        ]);
        if (cancelled) return;
        setSmartAlbums(smartRes.albums || []);
        setAlbums(manualRes || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load albums');
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

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-4 text-[#E5E5E5]">Albums</h1>
          <p className="text-[#A3A3A3] text-lg">Your photos, automatically organized by AI.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-bold hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all active:scale-95">
          <Folder className="w-5 h-5" />
          New Album
        </button>
      </div>

      {error && (
        <div className="mb-10 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          {error}
        </div>
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
                  <h3 className="text-2xl font-bold text-[#E5E5E5] mb-2">{album.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
