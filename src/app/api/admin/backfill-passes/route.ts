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

    // Find all approved requests with no pass
    // 1. Get all request IDs that already have passes
    const { data: passes } = await supabase.from('passes').select('request_id');
    const existingRequestIds = (passes || []).map(p => p.request_id);

    // 2. Clear query for approved requests not in that list
    let query = supabase
      .from('pass_requests')
      .select('id')
      .eq('status', 'approved');

    if (existingRequestIds.length > 0) {
      query = query.not('id', 'in', existingRequestIds);
    }

    const { data: approvedRequests } = await query;

    if (!approvedRequests || approvedRequests.length === 0) {
      return NextResponse.json({ message: 'No orphaned requests found. Already clean!', fixed: 0 });
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

    const { count: totalApproved } = await supabase.from('pass_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: totalPasses } = await supabase.from('passes').select('*', { count: 'exact', head: true });
    
    const { data: sampleRequests } = await supabase
      .from('pass_requests')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      message: `Backfill complete.`,
      debug: {
        totalApproved,
        totalPasses,
        sampleRequests,
        existingRequestIdsCount: existingRequestIds.length
      },
      ...results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
