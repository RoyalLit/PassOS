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
        <h1 className="text-2xl font-bold text-foreground font-black">Audit Logs</h1>
        <p className="text-muted-foreground text-sm font-medium">Immutable record of all administrative actions and system events.</p>
      </div>
 
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 border-b border-border font-black tracking-widest">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Entity</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
              {logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{log.actor?.full_name || 'System'}</span>
                      <span className="text-[10px] text-muted-foreground/60 uppercase font-black tracking-wider leading-none mt-0.5">{log.actor?.role || 'Service'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-muted text-foreground/80 rounded border border-border text-[10px] font-mono uppercase tracking-tighter shadow-sm">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-foreground/80 font-medium capitalize">{log.entity_type}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">{log.entity_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground/60 text-xs font-mono">
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
