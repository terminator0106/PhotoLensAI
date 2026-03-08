import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Chrome, User, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: (user: AuthUser) => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Reset fields when switching mode or closing
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
  }, [mode, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && name.trim().length === 0) {
      setError('Name is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const body = mode === 'login'
        ? { email, password }
        : { name: name.trim(), email, password };

      const data = await apiRequest<AuthUser>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      onSuccess?.(data);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(message || 'Unable to reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#1E293B] border border-white/10 shadow-2xl"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  {mode === 'login' ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-white/60 text-sm">
                  {mode === 'login'
                    ? 'Enter your details to access your photos'
                    : 'Start organizing your photos with AI'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Name — signup only */}
                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/80">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white/80">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white/80">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-xs text-white/40 mt-1">Minimum 6 characters</p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-400">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg shadow-primary/25 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/40 uppercase tracking-wider">or continue with</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button className="mt-6 w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                <Chrome className="w-5 h-5" />
                Google
              </button>

              <p className="mt-8 text-center text-sm text-white/60">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
