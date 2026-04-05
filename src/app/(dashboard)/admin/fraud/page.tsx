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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Fraud & Security Alerts
          </h1>
          <p className="text-slate-500">Monitor system abuse and flagged student behaviors</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">Active Flags</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-6 flex items-start gap-4 shadow-sm md:col-span-2">
          <div className="flex-1">
             <h3 className="font-bold text-slate-900">Automated Detection Rules</h3>
             <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc list-inside">
               <li>Rapid Requests: &gt; 3 requests in 24 hours</li>
               <li>Late Returns: Returning late &gt; 2 times in 7 days</li>
               <li>Suspicious Anomalies: Detected via Claude Risk Analyzer</li>
             </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full bg-white border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b text-sm text-slate-500">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Flag Type</th>
                <th className="px-6 py-4 font-medium">Severity</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {typedFlags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No fraud flags detected.
                  </td>
                </tr>
              ) : (
                typedFlags.map((flag: any) => (
                  <tr key={flag.id} className={flag.resolved ? 'opacity-60 bg-slate-50' : 'bg-white hover:bg-slate-50'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{flag.student?.full_name}</p>
                          <p className="text-xs text-slate-500">{flag.student?.hostel || 'No Hostel Data'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        {flag.flag_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        flag.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                        flag.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {flag.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {JSON.stringify(flag.details).replace(/["{}]/g, '')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(new Date(flag.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!flag.resolved ? (
                        <button className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors">
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Resolved</span>
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
