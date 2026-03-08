import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type MapPoint = {
  photo_id: number;
  image_url: string;
  latitude: number;
  longitude: number;
};

export function MapView() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await apiRequest<MapPoint[]>('/memories/map', { method: 'GET' });
        if (!cancelled) setPoints(res || []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load map data');
          setPoints([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-24 min-h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-[#E5E5E5]">Memory Map</h1>
        <p className="text-[#A3A3A3] text-lg">Explore your photos by location.</p>
      </div>

      <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden relative flex items-center justify-center min-h-[500px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        {isLoading ? (
          <div className="w-full max-w-4xl px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-[#0A0A0A] border border-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="text-center px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[#E5E5E5]">No locations yet</h3>
            <p className="text-[#A3A3A3]">{error ? error : 'Upload photos with GPS metadata to see them here.'}</p>
          </div>
        ) : (
          <div className="w-full max-w-5xl px-6 py-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[#E5E5E5] font-semibold">Geotagged Photos</div>
                <div className="text-sm text-[#A3A3A3]">{points.length} photos with location</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {points.slice(0, 16).map((p, idx) => (
                <motion.div
                  key={p.photo_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.6), duration: 0.3 }}
                  className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A]"
                >
                  <img src={p.image_url} alt="Location" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-[11px] text-white/80 flex items-center justify-between gap-2">
                    <span className="truncate">#{p.photo_id}</span>
                    <span className="tabular-nums">{p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
