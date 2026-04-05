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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">Overview and pending approvals</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <p className="text-sm font-medium text-slate-500">Needs Review</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{pendingRequests.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <p className="text-sm font-medium text-slate-500">Active Passes</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activePasses || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border opacity-50">
          <p className="text-sm font-medium text-slate-500">Overdue Inside</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border opacity-50">
          <p className="text-sm font-medium text-slate-500">Fraud Flags</p>
          <p className="text-3xl font-bold text-red-600 mt-1">0</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Action Center <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{pendingRequests.length}</span>
          </h2>
          <div className="flex gap-2">
            <button className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-50">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border shadow-sm">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check />
            </div>
            <h3 className="font-semibold text-slate-900">All caught up</h3>
            <p className="text-sm text-slate-500 mt-1">There are no pending requests to review.</p>
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
