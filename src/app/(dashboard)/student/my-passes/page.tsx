import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QRDisplay } from '@/components/passes/qr-display';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Pass } from '@/types';

export default async function MyPassesPage() {
  const profile = await requireRole('student');
  const supabase = await createServerSupabaseClient();

  const { data: passes } = await supabase
    .from('passes')
    .select('*, request:pass_requests(*)')
    .eq('student_id', profile.id)
    .in('status', ['active', 'used_exit'])
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/student" className="p-2 bg-white rounded-full border shadow-sm hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Passes</h1>
          <p className="text-slate-500">Your active digital gate passes</p>
        </div>
      </div>

      {!passes || passes.length === 0 ? (
        <div className="text-center py-24 bg-white border rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-slate-400 text-2xl">🎟️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">No active passes</h2>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">You don't have any active passes right now. Request a new pass to leave the campus.</p>
          <Link 
            href="/student/new-request" 
            className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
              <div className="mt-6 bg-white border rounded-2xl p-5 shadow-sm max-w-sm mx-auto">
                <h3 className="font-semibold text-slate-900 mb-2 border-b pb-2">Destined For</h3>
                <p className="text-slate-700">{pass.request?.destination}</p>
                <p className="text-sm text-slate-500 italic mt-1">"{pass.request?.reason}"</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
