import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { generatePass } from '@/app/api/passes/route';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip');
}

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const clientIp = getClientIp(request.headers) || 'unknown';
    const rateLimit = await checkRateLimit(`bulk_approval:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 2. Auth & Role Verification
    // Both admins and wardens can bulk approve, assuming they pass the RLS checks or custom logic
    const supabaseSession = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
    
    // Check if the user is authorized as admin or warden (we'll fetch profile directly to be safe)
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'warden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse Body
    const body = await request.json();
    const { requestIds, decision, reason } = body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: 'invalid_request_ids' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'invalid_decision' }, { status: 400 });
    }

    // 4. Fetch the requests to verify they are in pending state
    const { data: requests } = await supabase
      .from('pass_requests')
      .select('id, status, tenant_id')
      .in('id', requestIds)
      .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved']);

    if (!requests || requests.length === 0) {
      return NextResponse.json({ error: 'No valid pending requests found in selection.' }, { status: 400 });
    }

    const validRequestIds = requests.map(r => r.id);
    const tenantId = requests[0]?.tenant_id; // Assuming all requests belong to the same tenant

    // 5. Create Approval Audit Records
    const approvalsToInsert = requests.map(req => ({
      request_id: req.id,
      tenant_id: req.tenant_id,
      approver_id: profile.id,
      // DB check constraint only allows 'parent','admin','system' — map warden to 'admin'
      approver_type: profile.role === 'warden' ? 'admin' : profile.role,
      decision,
      reason: reason || (decision === 'approved' ? 'Bulk approved' : 'Bulk rejected'),
      ip_address: clientIp,
    }));

    await supabase.from('approvals').insert(approvalsToInsert);

    // 6. Update Pass Requests
    const finalStatus = decision === 'approved' ? 'approved' : 'rejected';
    
    await supabase
      .from('pass_requests')
      .update({ status: finalStatus })
      .in('id', validRequestIds);

    // 7. Generate Passes if Approved (Synchronous/Sequential to avoid DB hammering)
    const results = { successful: 0, failed: 0, errors: [] as string[] };
    
    if (finalStatus === 'approved') {
      console.log(`Spawning passes for ${validRequestIds.length} bulk approved requests...`);
      for (const reqId of validRequestIds) {
        try {
          await generatePass(reqId);
          results.successful++;
        } catch (e: any) {
          console.error(`Failed to generate pass for request ${reqId}:`, e);
          results.failed++;
          results.errors.push(`Req ${reqId}: ${e.message}`);
        }
      }
    } else {
      results.successful = validRequestIds.length;
    }

    return NextResponse.json({ 
      success: true, 
      processed: validRequestIds.length,
      final_status: finalStatus,
      pass_generation: finalStatus === 'approved' ? results : undefined
    });

  } catch (error: any) {
    console.error('Bulk approval handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
