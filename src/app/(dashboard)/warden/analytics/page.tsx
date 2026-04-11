import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WardenAnalyticsCharts } from '@/components/warden/warden-analytics-charts';
import { format, subDays } from 'date-fns';

export default async function WardenAnalyticsPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // Get all students in hostels
  const { data: hostelStudents } = await supabase
    .from('profiles')
    .select('id, hostel')
    .eq('role', 'student')
    .in('hostel', hostels);
  
  const studentIds = hostelStudents?.map(s => s.id) || [];
  
  // Get student states
  const { data: studentStates } = studentIds.length > 0
    ? await supabase
        .from('student_states')
        .select('*')
        .in('student_id', studentIds)
    : { data: [] };
  
  const insideCount = studentStates?.filter(s => s.current_state === 'inside').length || 0;
  const outsideCount = studentStates?.filter(s => s.current_state === 'outside').length || 0;
  const overdueCount = studentStates?.filter(s => s.current_state === 'overdue').length || 0;
  
  // Get passes data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      day: format(date, 'EEE'),
    };
  });
  
  const passesPerDay = await Promise.all(
    last7Days.map(async ({ date, day }) => {
      const { count } = studentIds.length > 0
        ? await supabase
            .from('passes')
            .select('id', { count: 'exact', head: true })
            .in('student_id', studentIds)
            .gte('created_at', `${date}T00:00:00`)
            .lt('created_at', `${date}T23:59:59`)
        : { count: 0 };
      
      return { day, passes: count || 0 };
    })
  );

  // Get approved/rejected counts per day
  const activityData = await Promise.all(
    last7Days.map(async ({ date, day }) => {
      const { data: requests } = studentIds.length > 0
        ? await supabase
            .from('pass_requests')
            .select('status')
            .in('student_id', studentIds)
            .gte('created_at', `${date}T00:00:00`)
            .lt('created_at', `${date}T23:59:59`)
        : { data: [] };

      const reqs = requests || [];
      return {
        day,
        requests: reqs.length,
        approved: reqs.filter((r: { status: string }) => r.status === 'approved').length,
        rejected: reqs.filter((r: { status: string }) => r.status === 'rejected').length,
      };
    })
  );
  
  // Get requests by status
  const { data: allRequests } = studentIds.length > 0
    ? await supabase
        .from('pass_requests')
        .select('status')
        .in('student_id', studentIds)
        .gte('created_at', `${format(subDays(new Date(), 30), 'yyyy-MM-dd')}T00:00:00`)
    : { data: [] };
  
  const statusCounts = (allRequests || []).reduce((acc: Record<string, number>, req: { status: string }) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = [
    { name: 'Inside', value: insideCount, color: '#22c55e' },
    { name: 'Outside', value: outsideCount, color: '#3b82f6' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' },
  ].filter(d => d.value > 0);
  
  const pendingRequests = (statusCounts['pending'] || 0) + 
    (statusCounts['parent_pending'] || 0) + 
    (statusCounts['admin_pending'] || 0);

  const stats = {
    totalStudents: studentIds.length,
    insideCount,
    outsideCount,
    overdueCount,
    pendingRequests,
    todayPasses: passesPerDay[passesPerDay.length - 1]?.passes || 0,
    weekActivity: activityData,
    statusDistribution: pieData,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <WardenAnalyticsCharts stats={stats} hostels={hostels} />
    </div>
  );
}
