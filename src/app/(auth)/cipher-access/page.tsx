'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, XCircle } from 'lucide-react';

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 1000;

export default function CipherAccessPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const role = profile?.role || session.user.user_metadata?.role;
        if (role === 'superadmin') {
          router.replace('/superadmin');
        }
      }
    };
    checkSession();
  }, [router, supabase]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingTime = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      setError(`Too many attempts. Try again in ${remainingTime} seconds.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + WINDOW_MS);
          setError(`Too many attempts. Locked for 60 seconds.`);
        } else {
          setError('Invalid email or password');
        }

        if (data?.user) {
          await supabase.auth.signOut();
        }

        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user?.id)
        .single();

      const role = profileData?.role || data.user?.user_metadata?.role;

      if (role !== 'superadmin') {
        await supabase.auth.signOut();
        setAttempts(prev => prev + 1);

        if (attempts + 1 >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + WINDOW_MS);
          setError(`Too many attempts. Locked for 60 seconds.`);
        } else {
          setError('Invalid email or password');
        }

        setLoading(false);
        return;
      }

      setAttempts(0);
      setLockedUntil(null);
      router.replace('/superadmin');
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <div className="text-center mt-4 mb-8">
          <h1 className="text-2xl font-bold text-foreground">Cipher Access</h1>
          <p className="text-muted-foreground mt-2">Authorized personnel only</p>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={isLocked}
              className="w-full border-2 border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground/80 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLocked}
              className="w-full border-2 border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium disabled:opacity-50"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full h-12 flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
            </button>
          </div>

          {attempts > 0 && !isLocked && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
            </p>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-purple-500/10">
          <a
            href="/"
            className="block text-center text-sm text-muted-foreground hover:text-purple-400 transition-colors"
          >
            Return to home
          </a>
        </div>
      </div>
    </div>
  );
}
