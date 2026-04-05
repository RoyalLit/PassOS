import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { verifyQRPayload } from '@/lib/crypto/qr-signer';
import { scanSchema } from '@/lib/validators/request-schema';

export async function POST(request: Request) {
  try {
    const profile = await requireRole('guard');
    const supabase = createAdminClient();

    const body = await request.json();
    const result = scanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { qr_payload, scan_type, geo_lat, geo_lng } = result.data;

    // 1. Cryptographic Verification
    const verification = await verifyQRPayload(qr_payload);
    
    // If it's a completely invalid/forged signature, we stop early and don't reveal user data
    if (!verification.success && verification.error === 'invalid') {
      await logScan(supabase, null, profile.id, scan_type, 'invalid_signature');
      return NextResponse.json({ 
        valid: false, 
        result: 'invalid_signature', 
        message: 'Invalid or forged QR code signature' 
      }, { status: 400 });
    }

    // 2. Extact identifiers (even if expired, verification.payload will have them)
    const pass_id = verification.payload?.pass_id;
    const student_id = verification.payload?.student_id;

    if (!pass_id) {
       return NextResponse.json({ 
        valid: false, 
        result: 'invalid_signature', 
        message: 'QR code contains malformed data' 
      }, { status: 400 });
    }

    // 3. Database Verification & Profile Retrieval
    // We fetch the student profile even if the token is expired to provide a better UX for the guard
    const { data: pass } = await supabase
      .from('passes')
      .select('*, student:profiles(*)')
      .eq('id', pass_id)
      .single();

    if (!pass) {
      return NextResponse.json({ 
        valid: false, result: 'error', message: 'Pass record not found in database' 
      }, { status: 404 });
    }

    // Capture the student profile for the response
    const student = pass.student;

    // 4. Handle Clock/Signature Expiry
    if (!verification.success && verification.error === 'expired') {
      await logScan(supabase, pass.id, profile.id, scan_type, 'expired');
      await supabase.from('passes').update({ status: 'expired' }).eq('id', pass.id);
      return NextResponse.json({ 
        valid: false, 
        result: 'expired', 
        message: 'Pass signature has expired',
        student 
      });
    }

    // 5. Database-level Status and Expiry Logic
    if (pass.status === 'revoked') {
      await logScan(supabase, pass.id, profile.id, scan_type, 'revoked');
      return NextResponse.json({ 
        valid: false, 
        result: 'revoked', 
        message: 'Pass has been revoked by admin',
        student 
      });
    }

    // Check database-side expiration (just in case it differs from JWT)
    if (new Date() > new Date(pass.valid_until)) {
      await logScan(supabase, pass.id, profile.id, scan_type, 'expired');
      await supabase.from('passes').update({ status: 'expired' }).eq('id', pass.id);
      return NextResponse.json({ 
        valid: false, 
        result: 'expired', 
        message: 'Pass validity period has ended',
        student 
      });
    }

    // 6. Scan Context Logic (State machine enforcement)
    if (scan_type === 'exit') {
      if (pass.status !== 'active') {
        const alreadyUsed = pass.status === 'used_exit' || pass.status === 'used_entry';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyUsed ? 'already_used' : 'error');
        return NextResponse.json({ 
          valid: false, 
          result: alreadyUsed ? 'already_used' : 'error', 
          message: alreadyUsed ? 'Pass already used for exit' : 'Invalid pass state for exit',
          student 
        });
      }

      // Record successful exit
      await supabase.from('passes').update({ status: 'used_exit', exit_at: new Date().toISOString() }).eq('id', pass.id);
      await supabase.from('student_states').upsert({ student_id: pass.student_id, current_state: 'outside', last_exit: new Date().toISOString() });
      await logScan(supabase, pass.id, profile.id, scan_type, 'valid', { lat: geo_lat, lng: geo_lng });

      return NextResponse.json({ valid: true, result: 'valid', pass, student, message: 'Exit granted' });
    }

    if (scan_type === 'entry') {
      if (pass.status !== 'used_exit') {
        const alreadyUsed = pass.status === 'used_entry';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyUsed ? 'already_used' : 'error');
        return NextResponse.json({ 
          valid: false, 
          result: alreadyUsed ? 'already_used' : 'error', 
          message: alreadyUsed ? 'Pass already used for entry' : 'Pass not marked as exited',
          student 
        });
      }

      // Record successful entry
      await supabase.from('passes').update({ status: 'used_entry', entry_at: new Date().toISOString() }).eq('id', pass.id);
      await supabase.from('student_states').upsert({ student_id: pass.student_id, current_state: 'inside', active_pass_id: null, last_entry: new Date().toISOString() });
      await logScan(supabase, pass.id, profile.id, scan_type, 'valid', { lat: geo_lat, lng: geo_lng });

      return NextResponse.json({ valid: true, result: 'valid', pass, student, message: 'Welcome back' });
    }

    return NextResponse.json({ error: 'Unknown scan type' }, { status: 400 });

  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function logScan(supabase: any, passId: string | null, guardId: string, scanType: string, result: string, geo?: {lat?: number, lng?: number}) {
  await supabase.from('pass_scans').insert({
    pass_id: passId,
    guard_id: guardId,
    scan_type: scanType,
    scan_result: result,
    geo_lat: geo?.lat,
    geo_lng: geo?.lng,
    device_info: { timestamp: Date.now() },
  });
}
