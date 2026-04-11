import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePass } from '@/app/api/passes/route';

// ONE-TIME backfill endpoint — generates passes for all approved requests
// that somehow ended up without a corresponding pass record.
// DELETE this file after running it once.
export async function POST() {
  try {
    // Must be an admin to trigger this
    const supabaseSession = await createServerSupabaseClient();
    const { data: { user } } = await supabaseSession.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // DEBUG GATHERING
    const { count: totalApproved } = await supabase.from('pass_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { data: allPasses } = await supabase.from('passes').select('status, student_id');
    const passStatusCounts = (allPasses || []).reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    
    const { data: allStatuses } = await supabase.from('pass_requests').select('status');
    const requestStatusCounts = (allStatuses || []).reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    // Find all approved requests with no pass
    const { data: passesData } = await supabase.from('passes').select('request_id');
    const existingRequestIds = (passesData || []).map(p => p.request_id);

    let query = supabase
      .from('pass_requests')
      .select('id, student_id, status, created_at')
      .eq('status', 'approved');

    if (existingRequestIds.length > 0) {
      query = query.not('id', 'in', existingRequestIds);
    }

    const { data: approvedRequests } = await query;

    const debug = {
      requests: {
        totalApproved: totalApproved,
        distribution: requestStatusCounts,
        orphaned: approvedRequests?.length || 0,
      },
      passes: {
        total: allPasses?.length || 0,
        distribution: passStatusCounts,
      },
      orphanedList: approvedRequests?.slice(0, 5)
    };

    if (!approvedRequests || approvedRequests.length === 0) {
      return NextResponse.json({ message: 'No orphaned requests found.', debug });
    }

    const results = { fixed: 0, failed: 0, errors: [] as string[] };

    for (const req of approvedRequests) {
      try {
        await generatePass(req.id);
        results.fixed++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${req.id}: ${e.message}`);
      }
    }

    return NextResponse.json({
      message: `Backfill complete.`,
      debug,
      ...results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
