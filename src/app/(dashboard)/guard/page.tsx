import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export default async function GuardDashboardPage() {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== 'guard') {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  const { data: scans } = await supabase
    .from('pass_scans')
    .select(`
      *,
      passes (
        id,
        request_id,
        student_id,
        profiles!passes_student_id_fkey (
          full_name,
          hostel,
          room_number
        )
      )
    `)
    .eq('guard_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-12 md:pt-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recent Scans</h1>
          <p className="text-slate-500 text-sm">Review the most recent activity at your gate station.</p>
        </div>
        <div className="hidden sm:block">
          <Badge variant="outline" className="px-3 py-1">Guard: {profile.full_name}</Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scans?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No scans recorded yet.
                  </td>
                </tr>
              )}
              {scans?.map((scan: any) => {
                const student = scan.passes?.profiles;
                return (
                  <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{student?.full_name || 'Unknown Student'}</span>
                        <span className="text-xs text-slate-500">{student?.hostel} - Room {student?.room_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 capitalize font-medium text-slate-700">
                        {scan.scan_type === 'exit' ? (
                          <ShieldAlert className="w-4 h-4 text-orange-500" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        )}
                        {scan.scan_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(scan.created_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={scan.scan_result === 'valid' ? 'success' : 'destructive'} className="capitalize">
                        {scan.scan_result}
                      </Badge>
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
