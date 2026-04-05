import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();

  try {
    // Basic stats via parallel aggregation queries for the dashboard MVP
    
    // 1. Total Active Passes
    const { count: activePasses } = await supabase
      .from('passes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active']);

    // 2. Students Outside (Pass used for exit but not entry)
    const { count: outsideCount } = await supabase
      .from('student_states')
      .select('*', { count: 'exact', head: true })
      .eq('current_state', 'outside');

    // 3. Students Overdue
    const { count: overdueCount } = await supabase
      .from('student_states')
      .select('*', { count: 'exact', head: true })
      .eq('current_state', 'overdue');

    // 4. Pending Requests
    const { count: pendingRequests } = await supabase
      .from('pass_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'ai_review', 'parent_pending', 'admin_pending']);

    // 5. Active Fraud Flags
    const { count: activeFlags } = await supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    // 6. Time series data for charing (last 7 days of passes)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentPasses } = await supabase
      .from('passes')
      .select('created_at, status')
      .gte('created_at', sevenDaysAgo.toISOString());

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
