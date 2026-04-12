import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QRDisplay } from '@/components/passes/qr-display';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, ShieldX } from 'lucide-react';
import type { Pass } from '@/types';

export default async function MyPassesPage() {
  const profile = await requireRole('student');
  const supabase = await createServerSupabaseClient();

  const { data: passes, error: passError } = await supabase
    .from('passes')
    .select('*, request:pass_requests!request_id(*)')
    .eq('student_id', profile.id)
    .in('status', ['active', 'used_exit'])
    .order('created_at', { ascending: false });

  if (passError) {
    console.error('[MyPasses] Error fetching passes:', passError.message, passError.code);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/student" className="p-2 bg-card rounded-full border border-border shadow-sm hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground/80" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Passes</h1>
          <p className="text-muted-foreground">Your active digital gate passes</p>
        </div>
      </div>

      {!passes || passes.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-muted-foreground text-2xl">🎟️</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">No active passes</h2>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">You don&apos;t have any active passes right now. Request a new pass to leave the campus.</p>
          <Link 
            href="/student/new-request" 
            className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
          >
            Request a Pass
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {passes.map((pass: Pass) => (
            <div key={pass.id} className="relative">
              <QRDisplay pass={pass} />
              
              {/* Context card showing where they are going */}
              <div className="mt-6 bg-card border border-border rounded-2xl p-5 shadow-sm max-w-sm mx-auto">
                <h3 className="font-semibold text-foreground mb-2 border-b border-border pb-2">Destined For</h3>
                <p className="text-foreground/80">{pass.request?.destination}</p>
                <p className="text-sm text-muted-foreground italic mt-1">&ldquo;{pass.request?.reason}&rdquo;</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
