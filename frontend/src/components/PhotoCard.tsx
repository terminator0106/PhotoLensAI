import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Eye, FolderPlus, Trash2, Sparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import React from 'react';

export interface Photo {
  id: string;
  url: string;
  tags: string[];
  caption: string;
  date: string;
  isBestShot?: boolean;
  emotion?: string | null;
  qualityScore?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  publicId?: string | null;
}

interface PhotoCardProps {
  photo: Photo;
  className?: string;
}

export function PhotoCard({ photo, className, onClick }: PhotoCardProps & { onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-[#1A1A1A] border border-white/5 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_rgba(167,139,250,0.3)] transition-all duration-300 cursor-pointer",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transform: "translateZ(1px)" }} />

      <div className="aspect-[4/3] w-full overflow-hidden bg-[#0A0A0A]">
        <img
          src={photo.url}
          alt={photo.caption}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      {/* Best Shot Badge */}
      {photo.isBestShot && (
        <div className="absolute top-4 left-4 px-2 py-1 rounded-md bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur-md border border-yellow-300/30 flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.5)] z-10" style={{ transform: "translateZ(20px)" }}>
          <Star className="w-3 h-3 text-white fill-white" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Best Shot</span>
        </div>
      )}

      {/* Hover Actions Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent z-10" style={{ transform: "translateZ(30px)" }}>
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#E5E5E5] transition-colors" title="View">
          <Eye className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#E5E5E5] transition-colors" title="Add to Album">
          <FolderPlus className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full bg-primary/20 hover:bg-primary/40 backdrop-blur-md text-primary transition-colors border border-primary/30" title="Generate Caption">
          <Sparkles className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md text-red-400 transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 relative z-10 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/90 to-transparent" style={{ transform: "translateZ(20px)" }}>
        <p className="text-sm font-medium text-[#E5E5E5] line-clamp-2 mb-3">
          {photo.caption}
        </p>

        <div className="flex flex-wrap gap-2">
          {photo.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-[#A3A3A3]"
            >
              {tag}
            </span>
          ))}
          {photo.tags.length > 3 && (
            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-[#A3A3A3]">
              +{photo.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
