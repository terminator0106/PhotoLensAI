import { motion, useScroll, useTransform } from 'motion/react';
import { Calendar, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { StoryGenerator } from '../components/StoryGenerator';

type TimelineEvent = {
  title: string;
  month: string;
  photo_count: number;
  cover_image: string | null;
  photo_ids: number[];
};

type TimelineYear = {
  year: number;
  events: TimelineEvent[];
};

type TimelineResponse = {
  years: TimelineYear[];
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

export function Memories() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const [years, setYears] = useState<TimelineYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [storyPhotoIds, setStoryPhotoIds] = useState<number[]>([]);
  const [storyTitle, setStoryTitle] = useState<string>('');

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [viewerPhotos, setViewerPhotos] = useState<PhotoOut[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await apiRequest<TimelineResponse>('/memories/timeline?format=legacy', { method: 'GET' });
        if (!cancelled) setYears(res.years || []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load memories');
          setYears([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const events = useMemo(() => {
    const out: Array<{ key: string; year: number; event: TimelineEvent }> = [];
    for (const y of years || []) {
      for (const ev of y.events || []) {
        out.push({ key: `${y.year}-${ev.month}-${ev.title}`, year: y.year, event: ev });
      }
    }
    return out;
  }, [years]);

  function closeViewer() {
    setIsViewerOpen(false);
    setViewerTitle('');
    setViewerPhotos([]);
    setViewerError(null);
    setViewerLoading(false);
  }

  async function openMemoryPhotos(ev: TimelineEvent) {
    const ids = (ev.photo_ids || []).filter((n) => Number.isFinite(n));
    setIsViewerOpen(true);
    setViewerTitle(ev.title || 'Memory');
    setViewerPhotos([]);
    setViewerError(null);
    setViewerLoading(true);

    if (ids.length === 0) {
      setViewerError('No photos in this memory yet.');
      setViewerLoading(false);
      return;
    }

    try {
      const res = await apiRequest<PhotoOut[]>('/photos/batch', {
        method: 'POST',
        body: JSON.stringify({ photo_ids: ids }),
      });
      setViewerPhotos(res || []);
      if (!res || res.length === 0) setViewerError('No photos found for this memory.');
    } catch (e) {
      setViewerError(e instanceof Error ? e.message : 'Failed to load memory photos');
    } finally {
      setViewerLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-24 max-w-5xl" ref={containerRef}>
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
                  <div className="text-[#E5E5E5] font-bold text-lg">{viewerTitle || 'Memory'}</div>
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
                  <div className="text-[#A3A3A3]">No photos in this memory yet.</div>
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

      <div className="text-center mb-20">
        <h1 className="text-4xl font-bold mb-4 text-[#E5E5E5]">AI Memories</h1>
        <p className="text-[#A3A3A3] text-lg max-w-2xl mx-auto">
          Relive your best moments. Our AI curates your photos into beautiful, chronological stories.
        </p>
      </div>

      <div className="relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-secondary to-accent opacity-30 transform -translate-x-1/2 rounded-full" />

        {/* Animated Progress Line */}
        <motion.div
          className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-secondary to-accent transform -translate-x-1/2 rounded-full origin-top shadow-[0_0_20px_rgba(167,139,250,0.5)]"
          style={{ scaleY: scrollYProgress }}
        />

        <div className="space-y-24">
          {isLoading ? (
            <div className="text-center py-24 text-[#A3A3A3]">Loading memories…</div>
          ) : events.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[#E5E5E5]">No memories yet</h3>
              <p className="text-[#A3A3A3]">{error ? error : 'Upload photos to start building your timeline.'}</p>
            </div>
          ) : (
            events.map(({ key, year, event }, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  {/* Timeline Node */}
                  <div className="absolute left-8 md:left-1/2 w-12 h-12 bg-[#0A0A0A] border-4 border-primary rounded-full transform -translate-x-1/2 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(167,139,250,0.4)]">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>

                  {/* Content Card */}
                  <div className={`w-full md:w-1/2 pl-24 md:pl-0 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <div
                      onClick={() => openMemoryPhotos(event)}
                      className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 hover:border-primary/50 hover:shadow-[0_0_40px_-10px_rgba(167,139,250,0.3)] transition-all duration-500 group cursor-pointer"
                    >
                      <div className={`flex items-center gap-3 mb-4 text-primary font-bold uppercase tracking-wider text-sm ${isEven ? 'md:justify-end' : ''}`}>
                        <Calendar className="w-5 h-5" />
                        {event.month} · {year}
                      </div>
                      <h3 className="text-3xl font-bold text-[#E5E5E5] mb-4 group-hover:text-primary transition-colors">{event.title}</h3>

                      <div className={`flex items-center gap-4 text-sm font-medium text-[#A3A3A3] ${isEven ? 'md:justify-end' : ''}`}>
                        <span className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
                          <ImageIcon className="w-4 h-4" />
                          {event.photo_count} Photos
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoryTitle(`${event.title}`);
                            setStoryPhotoIds(event.photo_ids || []);
                            setIsStoryOpen(true);
                          }}
                          className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#E5E5E5] transition-colors border border-white/10"
                        >
                          View Story
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMemoryPhotos(event);
                          }}
                          className="px-6 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary transition-colors border border-primary/25"
                        >
                          View Photos
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Image Card */}
                  <div className={`w-full md:w-1/2 pl-24 md:pl-0 ${isEven ? 'md:pl-16' : 'md:pr-16'}`}>
                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {event.cover_image ? (
                        <img
                          src={event.cover_image}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <StoryGenerator
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        photoIds={storyPhotoIds}
        title={storyTitle || 'Memory Story'}
      />
    </div>
  );
}
