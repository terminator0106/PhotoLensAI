import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Image as ImageIcon, Copy, Star, BookOpen, Folder, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const commands = [
  { id: 'search', title: 'Search beach photos', icon: <Search className="w-4 h-4" />, action: '/gallery' },
  { id: 'duplicate', title: 'Find duplicate photos', icon: <Copy className="w-4 h-4" />, action: '/gallery' },
  { id: 'best', title: 'Show best photos', icon: <Star className="w-4 h-4" />, action: '/gallery' },
  { id: 'story', title: 'Generate photo story', icon: <BookOpen className="w-4 h-4" />, action: '/gallery' },
  { id: 'albums', title: 'Open albums', icon: <Folder className="w-4 h-4" />, action: '/albums' },
  { id: 'map', title: 'View memory map', icon: <MapPin className="w-4 h-4" />, action: '/map' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCommands = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        navigate(filteredCommands[selectedIndex].action);
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
          >
            <div className="flex items-center px-4 border-b border-white/10">
              <Search className="w-5 h-5 text-[#A3A3A3]" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none text-[#E5E5E5] focus:outline-none focus:ring-0 py-4 px-3 text-lg"
              />
              <div className="text-xs text-[#A3A3A3] border border-white/10 px-2 py-1 rounded bg-white/5">ESC</div>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-[#A3A3A3]">No commands found.</div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      navigate(cmd.action);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      idx === selectedIndex ? 'bg-primary/20 text-primary' : 'text-[#E5E5E5] hover:bg-white/5'
                    }`}
                  >
                    {cmd.icon}
                    <span>{cmd.title}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
