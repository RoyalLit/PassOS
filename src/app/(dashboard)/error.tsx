'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
          <AlertCircle className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Application Error</h1>
          <p className="text-muted-foreground font-medium">
            Something went wrong while loading this page.
          </p>
          <div className="text-[10px] font-mono p-4 bg-muted rounded-xl text-left text-muted-foreground overflow-auto max-h-32">
            {error.message || 'Unknown runtime error'}
            {error.digest && <div className="mt-1 opacity-50">Digest: {error.digest}</div>}
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <RefreshCcw className="w-5 h-5" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
        
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-50">
          Identity Protection Active
        </p>
      </div>
    </div>
  );
}
