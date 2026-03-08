import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'motion/react';
import { Camera, Home, LayoutGrid, FolderHeart, Clock, UploadCloud, Menu, X, MapPin, UserCircle2, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Home', path: '/', icon: <Home className="w-4 h-4" />, protected: false },
  { name: 'Gallery', path: '/gallery', icon: <LayoutGrid className="w-4 h-4" />, protected: true },
  { name: 'Albums', path: '/albums', icon: <FolderHeart className="w-4 h-4" />, protected: true },
  { name: 'Memories', path: '/memories', icon: <Clock className="w-4 h-4" />, protected: true },
  { name: 'Map', path: '/map', icon: <MapPin className="w-4 h-4" />, protected: true },
  { name: 'Upload', path: '/upload', icon: <UploadCloud className="w-4 h-4" />, protected: true },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, setUser, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleNavClick = (item: typeof navItems[number], e: ReactMouseEvent) => {
    if (item.protected && !user) {
      e.preventDefault();
      openAuth('login');
    } else {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <>
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          isScrolled
            ? "bg-[#0A0A0A]/80 backdrop-blur-xl border-white/10 py-3"
            : "bg-transparent border-transparent py-5"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-xl font-bold tracking-tighter group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#1A1A1A] border border-white/10 overflow-hidden group-hover:border-primary/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Camera className="w-5 h-5 text-[#E5E5E5] group-hover:text-primary transition-colors relative z-10" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E5E5E5] to-[#A3A3A3] group-hover:to-primary transition-all">
              PrivateLens
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 rounded-full p-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const locked = item.protected && !user;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={(e) => handleNavClick(item, e)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-full",
                    isActive ? "text-[#E5E5E5]" : "text-[#A3A3A3] hover:text-[#E5E5E5]",
                    locked && "opacity-50"
                  )}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {item.icon}
                    {item.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 rounded-full bg-white/10 border border-white/5"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!loading && (
              user ? (
                /* ── Profile chip ── */
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(p => !p)}
                    className="flex items-center gap-3 px-3 py-2 rounded-full bg-[#1A1A1A]/80 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 shrink-0">
                      <UserCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#E5E5E5] leading-tight">{user.name}</p>
                      <p className="text-[11px] text-[#A3A3A3] leading-tight">{user.email}</p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-[#A3A3A3] transition-transform", profileOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1A1A1A] border border-white/10 shadow-xl overflow-hidden"
                      >
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-white/5 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openAuth('login')}
                    className="text-sm font-medium text-[#A3A3A3] hover:text-[#E5E5E5] transition-colors"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="relative group px-5 py-2 rounded-full text-sm font-medium overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-[1px] bg-[#0A0A0A] rounded-full transition-colors group-hover:bg-[#1A1A1A]" />
                    <span className="relative z-10 text-[#E5E5E5] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary transition-all">
                      Sign up
                    </span>
                  </button>
                </>
              )
            )}
          </div>

          <button
            className="md:hidden p-2 text-[#A3A3A3] hover:text-[#E5E5E5]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl pt-24 px-4 flex flex-col"
          >
            <nav className="flex flex-col gap-4 mb-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const locked = item.protected && !user;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={(e) => handleNavClick(item, e)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl text-lg font-medium transition-colors border",
                      isActive
                        ? "bg-[#1A1A1A] border-white/10 text-[#E5E5E5]"
                        : "border-transparent text-[#A3A3A3] hover:bg-[#1A1A1A]/50 hover:text-[#E5E5E5]",
                      locked && "opacity-50"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-col gap-4 mt-auto pb-8">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#1A1A1A] border border-white/10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 shrink-0">
                      <UserCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#E5E5E5]">{user.name}</p>
                      <p className="text-xs text-[#A3A3A3]">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full p-4 rounded-2xl border border-white/10 text-center font-medium text-[#A3A3A3] bg-[#1A1A1A] flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuth('login')}
                    className="w-full p-4 rounded-2xl border border-white/10 text-center font-medium text-[#E5E5E5] bg-[#1A1A1A]"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-center font-medium text-[#0A0A0A]"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={(u) => setUser(u)}
      />
    </>
  );
}
