import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ShieldAlert, User, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default async function FraudDashboard() {
  await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  const { data: flags } = await supabase
    .from('fraud_flags')
    .select('*, student:profiles(*)')
    .order('created_at', { ascending: false });

  const typedFlags = flags || [];
  const activeCount = typedFlags.filter(f => !f.resolved).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Fraud & Security Alerts
          </h1>
          <p className="text-muted-foreground">Monitor system abuse and flagged student behaviors</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-500/80">Active Flags</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-6 flex items-start gap-4 shadow-sm md:col-span-2 hover:shadow-md transition-shadow">
          <div className="flex-1">
             <h3 className="font-bold text-foreground">Detection Rules</h3>
             <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
               <li>Rapid Requests: &gt; 3 requests in 24 hours</li>
               <li>Late Returns: Returning late &gt; 2 times in 7 days</li>
               <li>Suspicious Anomalies: Flagged by the system</li>
             </ul>
          </div>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
            <button className="p-2 border border-border rounded-lg bg-card/60 backdrop-blur-md text-muted-foreground hover:bg-muted transition-colors">
              <Filter className="w-4 h-4" />
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 border-b border-border text-sm text-muted-foreground">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Flag Type</th>
                <th className="px-6 py-4 font-medium">Severity</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {typedFlags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No fraud flags detected.
                  </td>
                </tr>
              ) : (
                typedFlags.map((flag) => (
                  <tr key={flag.id} className={flag.resolved ? 'opacity-60 bg-muted/5' : 'hover:bg-muted/30 transition-colors'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{flag.student?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{flag.student?.hostel || 'No Hostel Data'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground/70 capitalize">
                        {flag.flag_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        flag.severity === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        flag.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {flag.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(flag.details).replace(/["{}]/g, '')}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(flag.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!flag.resolved ? (
                        <button className="px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-colors border border-blue-500/20">
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
