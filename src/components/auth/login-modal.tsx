'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setError('');

    if (!email) {
      setEmailError('Email is required');
      setLoading(false);
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user?.id)
      .single();

    const role = profileData?.role || data.user?.user_metadata?.role || 'student';
    const targetPath =
      role === 'superadmin' ? '/superadmin' :
      role === 'admin' ? '/admin' :
      role === 'guard' ? '/guard/scan' :
      role === 'warden' ? '/warden' :
      role === 'parent' ? '/parent' : '/student';

    router.replace(targetPath);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-card/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border p-8 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
          >
            <button
              onClick={() => {
                onClose();
                const url = new URL(window.location.href);
                url.searchParams.delete('login');
                router.replace(url.toString(), { scroll: false });
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8 mt-2">
              <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                <ShieldIcon />
              </div>
              <h1 id="login-modal-title" className="text-2xl font-bold text-foreground">Sign in to PassOS</h1>
              <p className="text-muted-foreground text-sm">Please enter your credentials to access your dashboard. We&apos;ve missed you!</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-3 text-sm">
                <XCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground/80 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium"
                  required
                  aria-describedby="email-error"
                  aria-invalid={!!emailError}
                />
                {emailError && <p id="email-error" className="text-sm text-red-500 mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground/80 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium"
                  required
                  aria-describedby="password-error"
                  aria-invalid={!!passwordError}
                />
                {passwordError && <p id="password-error" className="text-sm text-red-500 mt-1">{passwordError}</p>}
              </div>

              <div className="pt-4 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Sign In
                </button>
                <Link
                  href="/signup"
                  onClick={() => {
                    onClose();
                    const url = new URL(window.location.href);
                    url.searchParams.delete('login');
                    router.replace(url.toString(), { scroll: false });
                  }}
                  className="w-full text-center text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors"
                >
                  Don&apos;t have an account? Sign up
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
