import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Server } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center gap-2" href="#">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl tracking-tight">PassOS</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/signup">
            Sign Up
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-8">
          <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
          Now live on Campus
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-900 mb-6">
          <span className="text-blue-600">Smart</span> Gate Pass & Student Mobility System
        </h1>
        
        <p className="max-w-[600px] text-lg text-slate-600 mb-10">
          The real-time, secure, and intelligent access control system for modern campuses. 
          Powered by multi-level approvals, AI risk intelligence, and secure QR passes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-8 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors shrink-0"
          >
            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <div className="p-6 bg-white rounded-2xl border shadow-sm">
            <Zap className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Automated Approvals</h3>
            <p className="text-slate-600 leading-relaxed">Multi-level workflows with parent/guardian signed links and admin validation.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border shadow-sm">
            <ShieldCheck className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Tamper-Proof QR</h3>
            <p className="text-slate-600 leading-relaxed">Cryptographically signed passes with anti-replay protection for physical gate scanners.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border shadow-sm">
            <Server className="h-10 w-10 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Intelligence</h3>
            <p className="text-slate-600 leading-relaxed">Real-time risk scoring, anomaly detection, and fraud pattern recognition via Claude.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
