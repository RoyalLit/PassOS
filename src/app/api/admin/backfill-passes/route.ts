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

    // 1. Get ALL approved requests
    const { data: allApproved } = await supabase
      .from('pass_requests')
      .select('id, student_id, created_at')
      .eq('status', 'approved');

    // 2. Get ALL request IDs that already have passes
    const { data: allPassesData } = await supabase.from('passes').select('request_id');
    const existingPassRequestIds = new Set((allPassesData || []).map(p => p.request_id));

    // 3. Find the delta
    const orphanedRequests = (allApproved || []).filter(req => !existingPassRequestIds.has(req.id));

    const results = { fixed: 0, failed: 0, fixedIds: [] as string[], errors: [] as string[] };

    if (orphanedRequests.length > 0) {
      for (const req of orphanedRequests) {
        try {
          await generatePass(req.id);
          results.fixed++;
          results.fixedIds.push(req.id);
        } catch (e: any) {
          results.failed++;
          results.errors.push(`${req.id}: ${e.message}`);
        }
      }
    }

    const debug = {
      totalApproved: allApproved?.length || 0,
      totalPasses: allPassesData?.length || 0,
      orphanedCount: orphanedRequests.length,
      orphanedIds: orphanedRequests.map(r => r.id),
      statusDistribution: requestStatusCounts,
      passDistribution: passStatusCounts,
    };

    return NextResponse.json({
      message: orphanedRequests.length > 0 ? `Backfill fixed ${results.fixed} passes.` : 'No orphaned requests found.',
      debug,
      results
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
