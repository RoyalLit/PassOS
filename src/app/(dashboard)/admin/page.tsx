import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApprovalPanel } from '@/components/admin/approval-panel';
import { Filter, Search } from 'lucide-react';

export default async function AdminDashboard() {
  await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  // Fetch requests that require admin attention (AI reviewed, parent pending, or admin pending)
  const { data: requests } = await supabase
    .from('pass_requests')
    .select('*, student:profiles(*), ai_analysis(*), approvals(*)')
    .in('status', ['ai_review', 'admin_pending', 'parent_pending', 'parent_approved'])
    .order('created_at', { ascending: false });

  // Get active passes count
  const { count: activePasses } = await supabase
    .from('passes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'used_exit']);

  const pendingRequests = requests || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview and pending approvals</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border group hover:border-blue-500/30 transition-all">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Needs Review</p>
          <p className="text-4xl font-black text-blue-500 tracking-tighter">{pendingRequests.length}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border group hover:border-green-500/30 transition-all">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Active Passes</p>
          <p className="text-4xl font-black text-green-500 tracking-tighter">{activePasses || 0}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border opacity-50">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Overdue Inside</p>
          <p className="text-4xl font-black text-foreground/20 tracking-tighter">0</p>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border opacity-50">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Fraud Flags</p>
          <p className="text-4xl font-black text-red-500/20 tracking-tighter">0</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Action Center <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-xs">{pendingRequests.length}</span>
          </h2>
          <div className="flex gap-2">
            <button className="p-2 border border-border rounded-lg bg-card text-muted-foreground hover:bg-muted">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 border border-border rounded-lg bg-card text-muted-foreground hover:bg-muted">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check />
            </div>
            <h3 className="font-semibold text-foreground">All caught up</h3>
            <p className="text-sm text-muted-foreground mt-1">There are no pending requests to review.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {pendingRequests.map((req: any) => (
              <ApprovalPanel key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  );
}
