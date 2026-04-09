import { AlertTriangle, Mail, Phone, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Access Suspended</h1>
          <p className="text-muted-foreground font-medium">
            Your university's access to PassOS has been temporarily suspended by the platform administrator.
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-2xl border border-border text-left space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">How to resolve</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm font-medium">
              <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <span>Contact University IT / Warden</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium">
              <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-green-500" />
              </div>
              <Link href="https://passos.com/support" className="hover:underline">Contact PassOS Support</Link>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Link 
            href="/login" 
            className="inline-block py-3 px-8 bg-foreground text-background font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-foreground/10 hover:opacity-90 active:scale-95"
          >
            Go Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
