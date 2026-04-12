import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { REQUEST_TYPES } from '@/lib/constants';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';

export default async function StudentHistoryPage() {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== 'student') {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  const { data: requests } = await supabase
    .from('pass_requests')
    .select(`
      *,
      passes (
        id,
        status,
        exit_at,
        entry_at
      )
    `)
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Request History</h1>
      <p className="text-slate-500">View all your past gate pass requests and their final generated outcomes.</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Pass Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No requests found in your history.
                  </td>
                </tr>
              )}
              {requests?.map((req) => {
                const pass = req.passes && req.passes.length > 0 ? req.passes[0] : null;
                const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES];
                
                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          typeConfig?.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                          typeConfig?.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          <RequestIcon iconName={typeConfig?.icon || 'AlertCircle'} className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-900 capitalize">
                          {typeConfig?.label || req.request_type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={req.destination}>
                      {req.destination}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="capitalize" variant={
                        req.status === 'approved' ? 'success' :
                        req.status.includes('rejected') ? 'destructive' : 'default'
                      }>
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {pass ? (
                        <div className="flex flex-col text-xs text-slate-500">
                          {pass.status === 'revoked' && (
                            <span className="text-red-600 font-black mb-1 p-1 bg-red-50 inline-block rounded text-center border border-red-100">Pass Revoked</span>
                          )}
                          {pass.exit_at ? (
                            <span className="text-slate-700">Exited: {format(new Date(pass.exit_at), 'HH:mm')}</span>
                          ) : pass.status !== 'revoked' ? (
                            <span>Never exited</span>
                          ) : null}
                          {pass.entry_at && (
                            <span className="text-green-600">Returned: {format(new Date(pass.entry_at), 'HH:mm')}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No pass issued</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
