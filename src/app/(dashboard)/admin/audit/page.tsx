import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';

export default async function AdminAuditPage() {
  const profile = await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:profiles!audit_logs_actor_id_fkey (
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500">Immutable record of all administrative actions and system events.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Entity</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
              {logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{log.actor?.full_name || 'System'}</span>
                      <span className="text-xs text-slate-400 capitalize">{log.actor?.role || 'Service'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono uppercase tracking-tighter">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-700 capitalize">{log.entity_type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.entity_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
