import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Clock, Users, Copy, CheckCircle2 } from 'lucide-react';
import { STATUS_CONFIG, REQUEST_TYPES } from '@/lib/constants';
import { clsx } from 'clsx';
import type { PassRequest, Profile } from '@/types';
import { RequestIcon } from '@/components/requests/request-icon';
import { CopyButton } from '@/components/ui/copy-button';

export default async function StudentDashboard() {
  const profile = await requireRole('student');
  const supabase = await createServerSupabaseClient();

  // Get active passes
  const { data: activePasses } = await supabase
    .from('passes')
    .select('*, request:pass_requests(*)')
    .eq('student_id', profile.id)
    .in('status', ['active', 'used_exit'])
    .order('created_at', { ascending: false });

  // Get recent requests
  const { data: recentRequests } = await supabase
    .from('pass_requests')
    .select('*')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Check for any PENDING or ACTIVE request specifically for the "One Pass" rule
  const { data: pendingRequests } = await supabase
    .from('pass_requests')
    .select('id')
    .eq('student_id', profile.id)
    .in('status', ['pending', 'parent_pending', 'admin_pending', 'approved'])
    .limit(1);

  // Parent Info
  let parentInfo = null;
  if (profile.parent_id) {
    const { data: parent } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profile.parent_id)
      .single();
    parentInfo = parent;
  }

  const hasActivePass = activePasses && activePasses.length > 0;
  const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
  const canRequestNew = !hasActivePass && !hasPendingRequest;
  const typedRequests = (recentRequests || []) as PassRequest[];
  
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, {profile.full_name.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Manage your passes and requests</p>
        </div>
        {canRequestNew ? (
          <Link
            href="/student/new-request"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="mr-2 h-4 w-4" />
            Request Pass
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center rounded-xl bg-muted px-5 py-2.5 text-sm font-bold text-muted-foreground border border-border cursor-not-allowed opacity-75"
          >
            <Plus className="mr-2 h-4 w-4" />
            {hasPendingRequest ? 'Request Pending' : 'Pass Active'}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pass Status & Parent Info */}
        <div className="lg:col-span-2 space-y-6">
          {hasActivePass ? (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-white">
                <CheckCircle2 className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Active Pass Available</h2>
                  <p className="text-blue-100 text-sm">Valid until {activePasses[0].valid_until && new Date(activePasses[0].valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-3">
                  <Link 
                    href={`/student/new-request?extension_of=${activePasses[0].id}`}
                    className="bg-blue-500/30 text-white hover:bg-blue-500/50 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border border-white/20 active:scale-95"
                  >
                    Extend
                  </Link>
                  <Link 
                    href="/student/my-passes"
                    className="bg-card text-blue-600 hover:bg-muted px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm active:scale-95 whitespace-nowrap border border-border"
                  >
                    Show QR
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-6 border shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-colors">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">No Active Passes</h2>
                <p className="text-muted-foreground text-sm">You are currently inside the campus.</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Recent Requests */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/10 flex justify-between items-center">
              <h2 className="font-bold text-foreground">Recent Activity</h2>
              <Link href="/student/history" className="text-xs font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider">
                Full History
              </Link>
            </div>
            
            {typedRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">No recent pass requests found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {typedRequests.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG];
                  const typeConfig = (REQUEST_TYPES as any)[request.request_type] || {
                    label: request.request_type.replace('_', ' '),
                    icon: 'AlertCircle',
                    color: 'slate'
                  };
                  
                  return (
                    <div key={request.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between hover:bg-muted/5 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 uppercase text-[10px] font-black",
                          typeConfig.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                          typeConfig.color === 'purple' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-muted text-muted-foreground'
                        )}>
                          <RequestIcon iconName={typeConfig.icon} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground">{typeConfig.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1 truncate">{request.reason}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(request.departure_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="truncate">{request.destination}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                        <span className={clsx("px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", statusConfig.color)}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", statusConfig.dot)}></span>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Parent Connection */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-foreground">Parent Connection</h2>
            </div>
            
            {parentInfo ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Linked Guardian</p>
                  <p className="font-bold text-foreground">{parentInfo.full_name}</p>
                  <p className="text-sm text-muted-foreground">{parentInfo.email}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your guardian will receive notifications for high-risk or overnight requests based on campus policy.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
                  <p className="text-sm text-orange-500 font-medium leading-relaxed">
                    No parent linked yet. Your requests currently go directly to administrators.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Student ID</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted/30 rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground border border-border truncate flex items-center">
                      {profile.id}
                    </div>
                    <CopyButton value={profile.id} />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Give this code to your parent to link their account in the Parent Portal.
                </p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-2 text-lg text-foreground">Need Assistance?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you're having trouble with your parent connection or pass validation, please visit the warden's office for support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
