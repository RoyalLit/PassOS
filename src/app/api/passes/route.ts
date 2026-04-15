import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { signQRPayload, generateNonce } from '@/lib/crypto/qr-signer';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip');
}

// Internal Pass Generator logic that avoids loopback fetches
export async function generatePass(request_id: string) {
  if (!request_id) {
    throw new Error('request_id required');
  }

  const supabase = createAdminClient();

  // Verify request is approved and pass not already generated
  const { data: passReq, error: reqError } = await supabase
    .from('pass_requests')
    .select('*')
    .eq('id', request_id)
    .single();

  if (reqError) {
    throw new Error('Failed to fetch request: ' + reqError.message);
  }

  if (!passReq || passReq.status !== 'approved') {
    throw new Error('Request not approved');
  }

  // Get tenant_id from request, or fallback to student's tenant
  let tenantId = passReq.tenant_id;
  if (!tenantId) {
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', passReq.student_id)
      .single();
    tenantId = studentProfile?.tenant_id;
    if (!tenantId) {
      throw new Error('Cannot determine tenant for pass generation');
    }
  }

  const { data: existingPass } = await supabase
    .from('passes')
    .select('id')
    .eq('request_id', request_id)
    .maybeSingle();

  if (existingPass) {
    throw new Error('Pass already exists for this request');
  }

  // Generate secure QR payload
  const nonce = generateNonce();
  // Valid from departure time, valid until return by. Add 1 hour buffer to expiry.
  const validUntil = new Date(new Date(passReq.return_by).getTime() + 60 * 60 * 1000).toISOString();

  // We need a pre-generated ID to sign into the JWT before inserting
  const { data: idData } = await supabase.rpc('get_uuid').single();
  const generatedId = (idData as string) || crypto.randomUUID();

  const signedPayload = await signQRPayload({
    pass_id: generatedId,
    student_id: passReq.student_id,
    nonce: nonce,
    valid_until: validUntil,
  });

  // Store the newly issued pass
  const { data: newPass, error: passError } = await supabase
    .from('passes')
    .insert({
      id: generatedId,
      request_id: passReq.id,
      student_id: passReq.student_id,
      tenant_id: tenantId,
      qr_payload: signedPayload,
      qr_nonce: nonce,
      valid_from: passReq.departure_at,
      valid_until: validUntil,
      status: 'active',
    })
    .select()
    .single();

  if (passError) throw passError;

  // Update student state active pass ID
  await supabase
    .from('student_states')
    .update({ active_pass_id: newPass.id })
    .eq('student_id', passReq.student_id);

  return newPass;
}

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const clientIp = getClientIp(request.headers) || 'unknown';
    const rateLimit = await checkRateLimit(`passes_post:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Require admin role for direct pass generation API calls
    await requireRole('admin');
    
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }
    const pass = await generatePass(request_id);
    return NextResponse.json({ success: true, pass });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
