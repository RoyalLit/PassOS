'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, User, ShieldCheck, Users, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Sign up user
    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          role: formData.role,
          full_name: formData.full_name,
        },
      },
    });

    if (authError || !data.user) {
      setError(authError?.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    // 2. Insert into profiles (bypassing RLS with trigger in production)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      role: formData.role,
      full_name: formData.full_name,
      email: formData.email,
    });

    if (profileError) {
      console.warn('Profile creation might be blocked by RLS. Please ensure DB triggers are set up.');
    }

    setSuccess(true);
    setLoading(false);
    
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-sm border border-border p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Account Created!</h2>
          <p className="text-muted-foreground mt-2">You can now sign in with your credentials.</p>
          <p className="text-sm text-muted-foreground/60 mt-6">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-sm border border-border p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">Join PassOS</h1>
          <p className="text-muted-foreground mt-2">Smart Gate Pass Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 flex items-start gap-3 text-sm">
            <XCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-muted-foreground/40"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-muted-foreground/40"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-muted-foreground/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-4">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'student', label: 'Student', icon: GraduationCap },
                { id: 'parent', label: 'Parent', icon: Users },
                { id: 'guard', label: 'Security', icon: ShieldCheck },
                { id: 'admin', label: 'Admin', icon: User },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.id })}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                    formData.role === role.id 
                      ? "border-blue-600 bg-blue-500/10 text-blue-500" 
                      : "border-border hover:border-blue-500/30 text-muted-foreground"
                  )}
                >
                  <role.icon className={clsx("w-5 h-5", formData.role === role.id ? "text-blue-500" : "text-muted-foreground/50")} />
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
            <Link
              href="/login"
              className="w-full text-center text-sm text-muted-foreground hover:text-blue-500 font-medium transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
