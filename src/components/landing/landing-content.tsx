'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, Zap, Server } from 'lucide-react';
import { LoginModal } from '@/components/auth/login-modal';

function LoginChecker({ onLoginOpen }: { onLoginOpen: () => void }) {
  const searchParams = useSearchParams();
  if (searchParams.get('login') === 'true') {
    onLoginOpen();
  }
  return null;
}

export function LandingContent() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginChecker onLoginOpen={() => setIsLoginOpen(true)} />
      <div className="flex flex-col min-h-screen bg-background">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <Link className="flex items-center justify-center gap-2" href="#">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight text-foreground">PassOS</span>
          </Link>
          <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
            <button
              onClick={() => router.push('/?login=true')}
              className="text-sm font-bold text-foreground/70 hover:text-blue-600 transition-colors"
            >
              Login
            </button>
            <Link
              href="/signup"
              className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/10"
            >
              Sign Up
            </Link>
          </nav>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-8 border border-blue-500/20">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Now live on Campus
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-foreground mb-6">
            <span className="text-blue-600">Smart</span> Gate Pass & Student Mobility System
          </h1>
          
          <p className="max-w-[600px] text-lg text-muted-foreground mb-10 leading-relaxed">
            The real-time, secure, and intelligent access control system for modern campuses. 
            Powered by multi-level approvals, real-time monitoring, and secure QR passes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <button
              onClick={() => router.push('/?login=true')}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-sm font-bold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-5xl w-full text-left">
            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:border-amber-500/30 transition-colors group">
              <Zap className="h-10 w-10 text-amber-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 text-foreground">Automated Approvals</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Multi-level workflows with parent/guardian signed links and admin validation.</p>
            </div>
            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:border-emerald-500/30 transition-colors group">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 text-foreground">Tamper-Proof QR</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Cryptographically signed passes with anti-replay protection for physical gate scanners.</p>
            </div>
            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:border-indigo-500/30 transition-colors group">
              <Server className="h-10 w-10 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 text-foreground">Real-Time Monitoring</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Live pass status tracking, audit logs, and instant alerts for security and compliance.</p>
            </div>
          </div>
        </main>

        <LoginModal isOpen={isLoginOpen} onClose={() => {
        setIsLoginOpen(false);
        window.history.replaceState({}, '', window.location.pathname);
      }} />
      </div>
    </Suspense>
  );
}
