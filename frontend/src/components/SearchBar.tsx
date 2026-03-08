import { Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
}

const placeholders = [
  "Search your memories with AI...",
  "Find 'dog in park'...",
  "Search 'beach sunset'...",
  "Find 'birthday party'...",
  "Search 'delicious food'..."
];

const suggestions = ['dog', 'beach', 'birthday', 'food'];

export function SearchBar({ className, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    if (onSearch) onSearch(suggestion);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
        <div className={cn(
          "relative flex items-center w-full bg-[#1A1A1A]/80 backdrop-blur-xl border rounded-full overflow-hidden shadow-2xl transition-all duration-300",
          isFocused ? "border-primary/50 bg-[#1A1A1A]" : "border-white/10"
        )}>
          <div className="pl-6 pr-3 py-4 text-[#A3A3A3]">
            <Search className="w-5 h-5" />
          </div>
          
          <div className="relative flex-1 h-full flex items-center">
            <AnimatePresence mode="wait">
              {!query && !isFocused && (
                <motion.div
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 text-[#A3A3A3] pointer-events-none text-lg"
                >
                  {placeholders[placeholderIndex]}
                </motion.div>
              )}
            </AnimatePresence>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-transparent border-none text-[#E5E5E5] focus:outline-none focus:ring-0 py-4 text-lg relative z-10"
            />
          </div>

          <button
            type="submit"
            className="mr-2 p-2 rounded-full bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 px-6 font-medium"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Search</span>
          </button>
        </div>
      </form>

      {/* Suggestions */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-[#A3A3A3] mr-2">Try:</span>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            className="px-3 py-1 rounded-full bg-[#1A1A1A] border border-white/10 text-sm text-[#A3A3A3] hover:text-[#E5E5E5] hover:border-primary/50 hover:bg-primary/10 transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
