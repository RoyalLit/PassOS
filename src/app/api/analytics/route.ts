import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';

export async function GET() {
  // Guard: only signed-in admins can read aggregate analytics
  await requireRole('admin');
  const supabase = createAdminClient();

  try {
    // Fetch all stats in parallel for better performance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [
      activePassesRes,
      outsideRes,
      overdueRes,
      pendingRes,
      flagsRes,
      recentPassesRes,
    ] = await Promise.all([
      supabase
        .from('passes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active']),
      supabase
        .from('student_states')
        .select('*', { count: 'exact', head: true })
        .eq('current_state', 'outside'),
      supabase
        .from('student_states')
        .select('*', { count: 'exact', head: true })
        .eq('current_state', 'overdue'),
      supabase
        .from('pass_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'parent_pending', 'admin_pending']),
      supabase
        .from('fraud_flags')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),
      supabase
        .from('passes')
        .select('created_at, status')
        .gte('created_at', sevenDaysAgo.toISOString()),
    ]);

    const activePasses = activePassesRes.count;
    const outsideCount = outsideRes.count;
    const overdueCount = overdueRes.count;
    const pendingRequests = pendingRes.count;
    const activeFlags = flagsRes.count;
    const recentPasses = recentPassesRes.data;

    // Aggregate passes by day for a simple chart
    const dailyVolume: Record<string, number> = {};
    if (recentPasses) {
      recentPasses.forEach(pass => {
        const date = new Date(pass.created_at).toISOString().split('T')[0];
        dailyVolume[date] = (dailyVolume[date] || 0) + 1;
      });
    }

    const chartData = Object.entries(dailyVolume)
      .map(([date, passes]) => ({ date, passes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      stats: {
        active_passes: activePasses || 0,
        outside: outsideCount || 0,
        overdue: overdueCount || 0,
        pending_requests: pendingRequests || 0,
        active_fraud_flags: activeFlags || 0,
      },
      chart_data: chartData
    });
  } catch (error) {
    console.error('Analytics aggregation error', error);
    return NextResponse.json({ error: 'Failed to aggregate stats' }, { status: 500 });
  }
}
