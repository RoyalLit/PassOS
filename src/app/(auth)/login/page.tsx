'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, XCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        const role = profile?.role || session.user.user_metadata?.role || 'student';
        const targetPath =
          role === 'superadmin' ? '/superadmin' :
          role === 'admin' ? '/admin' :
          role === 'guard' ? '/guard/scan' :
          role === 'parent' ? '/parent' : '/student';
        router.replace(targetPath);
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Login timed out. Please check your internet connection and try again.');
      }
    }, 15000);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        clearTimeout(timeoutId);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user?.id)
        .single();

      if (profileError) {
        console.warn('Profile fetch error (using metadata fallback):', profileError.message);
      }

      const role = profileData?.role || data.user?.user_metadata?.role || 'student';
      const targetPath =
        role === 'superadmin' ? '/superadmin' :
        role === 'admin' ? '/admin' :
        role === 'guard' ? '/guard/scan' :
        role === 'parent' ? '/parent' : '/student';

      clearTimeout(timeoutId);
      router.replace(targetPath);
    } catch (err) {
      clearTimeout(timeoutId);
      setError('An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in to PassOS</h1>
          <p className="text-muted-foreground mt-2">Enter your credentials to access the system</p>
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
              placeholder="name@example.com"
              className="w-full border-2 border-border rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium"
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
              className="w-full border-2 border-border rounded-xl px-4 py-3 bg-background focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/40 font-medium"
              required
            />
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
              className="w-full text-center text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
