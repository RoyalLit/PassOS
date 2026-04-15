import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { ShieldCheck, ShieldAlert, User } from 'lucide-react';

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
          enrollment_number,
          hostel,
          room_number,
          avatar_url
        )
      )
    `)
    .eq('guard_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-12 md:pt-20">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recent Scans</h1>
          <p className="text-muted-foreground text-sm">Review the most recent activity at your gate station.</p>
        </div>
        <div className="hidden sm:block">
          <Badge variant="outline" className="px-3 py-1 border-border text-foreground/70">Guard: {profile.full_name}</Badge>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scans?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No scans recorded yet.
                  </td>
                </tr>
              )}
              {scans?.map((scan) => {
                const student = scan.passes?.profiles;
                return (
                  <tr key={scan.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {student?.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{student?.full_name || 'Unknown Student'}</span>
                            {student?.enrollment_number && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded uppercase">
                                {student.enrollment_number}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{student?.hostel} - Room {student?.room_number}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 capitalize font-medium text-foreground/80">
                        {scan.scan_type === 'exit' ? (
                          <ShieldAlert className="w-4 h-4 text-orange-500" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        )}
                        {scan.scan_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">
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
