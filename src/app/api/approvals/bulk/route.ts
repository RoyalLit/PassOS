import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { bulkApprovalSchema } from '@/lib/validators/request-schema';
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
    const profile = await requireRole('admin', 'warden');
    const supabase = createAdminClient();

    // 3. Parse & Validate Body
    const body = await request.json();
    const result = bulkApprovalSchema.safeParse(body);
    
    if (!result.success) {
      console.error('[Bulk Approval] Validation failed:', result.error.format());
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: result.error.issues.map(e => e.message) 
      }, { status: 400, headers: getRateLimitHeaders(rateLimit) });
    }
    
    const { requestIds, decision, reason } = result.data;

    // 4. Fetch the requests to verify they are in pending state
    const { data: requests } = await supabase
      .from('pass_requests')
      .select('id, status, tenant_id')
      .in('id', requestIds)
      .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved']);

    if (!requests || requests.length === 0) {
      return NextResponse.json({ error: 'No valid pending requests found in selection.' }, { status: 400, headers: getRateLimitHeaders(rateLimit) });
    }

    const validRequestIds = requests.map(r => r.id);

    // 5. Create Approval Audit Records
    const approvalsToInsert = requests.map(req => ({
      request_id: req.id,
      tenant_id: req.tenant_id,
      approver_id: profile.id,
      approver_type: profile.role,
      decision,
      reason: reason || (decision === 'approved' ? 'Bulk approved' : 'Bulk rejected'),
      ip_address: clientIp,
    }));

    const { error: approvalError } = await supabase.from('approvals').insert(approvalsToInsert);
    if (approvalError) {
      console.error('[Bulk Approval] Registration failure:', approvalError);
      return NextResponse.json({ error: 'Failed to register approvals' }, { status: 500, headers: getRateLimitHeaders(rateLimit) });
    }

    // 6. Update Pass Requests
    const finalStatus = decision === 'approved' ? 'approved' : 'rejected';
    
    const { error: updateError } = await supabase
      .from('pass_requests')
      .update({ status: finalStatus })
      .in('id', validRequestIds);

    if (updateError) {
      console.error('[Bulk Approval] Status update failure:', updateError);
      return NextResponse.json({ error: 'Failed to update request statuses' }, { status: 500, headers: getRateLimitHeaders(rateLimit) });
    }

    // 7. Generate Passes if Approved (Synchronous/Sequential to avoid DB hammering)
    const results = { successful: 0, failed: 0 };
    
    if (finalStatus === 'approved') {
      console.log(`Spawning passes for ${validRequestIds.length} bulk approved requests...`);
      for (const reqId of validRequestIds) {
        try {
          await generatePass(reqId);
          results.successful++;
        } catch (e: unknown) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          console.error(`Failed to generate pass for request ${reqId}:`, errorMsg);
          results.failed++;
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
    }, { headers: getRateLimitHeaders(rateLimit) });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'An unexpected server error occurred';
    console.error('Bulk approval handler error:', errorMsg);
    
    const isAuthError = errorMsg.includes('Unauthorized');
    const isForbiddenError = errorMsg.includes('Forbidden');

    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : (isForbiddenError ? 'Forbidden' : 'An unexpected server error occurred') },
      { status: isAuthError ? 401 : (isForbiddenError ? 403 : 500) }
    );
  }
}
