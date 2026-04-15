import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { verifyQRPayload } from '@/lib/crypto/qr-signer';
import { scanSchema } from '@/lib/validators/request-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

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

    // Capture if the signature is expired but otherwise valid
    const isExpired = !verification.success && verification.error === 'expired';
    const pass_id = verification.payload?.pass_id;

    if (!pass_id) {
       return NextResponse.json({ 
        valid: false, 
        result: 'invalid_signature', 
        message: 'QR code contains malformed data' 
      }, { status: 400 });
    }
    // We fetch the student profile even if the token is expired to provide a better UX for the guard.
    // Intentionally select only the fields a guard needs — never expose phone, parent_id, metadata etc.
    const { data: pass } = await supabase
      .from('passes')
      .select('*, student:profiles(id, full_name, enrollment_number, avatar_url, hostel, room_number)')
      .eq('id', pass_id)
      .single();

    if (!pass) {
      return NextResponse.json({ 
        valid: false, result: 'error', message: 'Pass record not found in database' 
      }, { status: 404 });
    }

    const student = pass.student;

    // Defensive: orphaned pass (profile deleted but pass remains) should not show as "Unknown User"
    // The DB-level ON DELETE CASCADE in migration 006 prevents future orphans,
    // but we handle the null-student case gracefully for any remaining legacy orphans.
    if (!student) {
      await logScan(supabase, pass.id, profile.id, scan_type, 'error', undefined, pass.tenant_id);
      return NextResponse.json({
        valid: false,
        result: 'error',
        message: 'Student profile not found — pass may be orphaned. Please contact administration.',
      });
    }

    // 3. Database-level status check (High Priority)
    if (pass.status === 'revoked') {
      await logScan(supabase, pass.id, profile.id, scan_type, 'revoked', undefined, pass.tenant_id);
      return NextResponse.json({ 
        valid: false, result: 'revoked', message: 'Pass has been revoked', student 
      });
    }

    // 4. Scan Type Specific Logic
    if (scan_type === 'exit') {
      // ⚠️ STRICT: No exit allowed if expired (either JWT or DB)
      if (isExpired || new Date() > new Date(pass.valid_until)) {
        await logScan(supabase, pass.id, profile.id, scan_type, 'expired', undefined, pass.tenant_id);
        await supabase.from('passes').update({ status: 'expired' }).eq('id', pass.id);
        return NextResponse.json({ 
          valid: false, result: 'expired', message: 'Pass has expired. Exit denied.', student 
        });
      }

      // ⚠️ STRICT: No exit allowed before the pass window opens (with 15min grace period)
      const EARLY_GRACE_MS = 15 * 60 * 1000; // 15 minutes
      const validFrom = new Date(pass.valid_from);
      if (new Date().getTime() < validFrom.getTime() - EARLY_GRACE_MS) {
        await logScan(supabase, pass.id, profile.id, scan_type, 'error', undefined, pass.tenant_id);
        return NextResponse.json({ 
          valid: false, 
          result: 'too_early', 
          message: `Pass is not valid until ${validFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Exit denied.`,
          student 
        });
      }

      if (pass.status !== 'active') {
        const alreadyUsed = pass.status === 'used_exit' || pass.status === 'used_entry';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyUsed ? 'already_used' : 'error', undefined, pass.tenant_id);
        return NextResponse.json({ 
          valid: false, 
          result: alreadyUsed ? 'already_used' : 'error', 
          message: alreadyUsed ? 'Pass already used for exit' : 'Invalid pass state for exit',
          student 
        });
      }

      // Parallelize: RPC call + student_states fetch
      const [rpcResult, stateResult] = await Promise.all([
        supabase.rpc('process_scan', {
          p_pass_id:     pass.id,
          p_guard_id:    profile.id,
          p_scan_type:   'exit',
          p_scan_result: 'valid',
          p_geo_lat:     geo_lat ?? null,
          p_geo_lng:     geo_lng ?? null,
        }),
        supabase
          .from('student_states')
          .select('current_state')
          .eq('student_id', pass.student_id)
          .single(),
      ]);

      if (rpcResult.error) throw rpcResult.error;

      // Defensive: verify student_states was updated. If not, fix it.
      if (stateResult.data?.current_state !== 'outside') {
        await supabase
          .from('student_states')
          .upsert({
            student_id:    pass.student_id,
            tenant_id:     pass.tenant_id,
            current_state: 'outside',
            last_exit:     new Date().toISOString(),
            updated_at:    new Date().toISOString(),
          }, { onConflict: 'student_id' });
      }

      return NextResponse.json({ valid: true, result: 'valid', pass, student, message: 'Exit granted' });
    }

    if (scan_type === 'entry') {
      // ✅ RELAXED: Entry allowed even if expired to ensure student can return to campus
      const dbExpired = new Date() > new Date(pass.valid_until);
      const lateEntry = isExpired || dbExpired || pass.status === 'expired';

      // Only allow entry if the student has actually exited first.
      // We no longer accept 'active' status here — if they somehow haven't exited,
      // the guard should scan them out first. Allows 'expired' for late returns.
      if (pass.status !== 'used_exit' && pass.status !== 'expired') {
        const alreadyReturned = pass.status === 'used_entry';
        const neverExited = pass.status === 'active';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyReturned ? 'already_used' : 'error', undefined, pass.tenant_id);
        return NextResponse.json({ 
          valid: false, 
          result: alreadyReturned ? 'already_used' : 'error', 
          message: alreadyReturned 
            ? 'Student has already returned to campus' 
            : neverExited
            ? 'Student has not exited yet — please scan as EXIT first'
            : 'Pass is not in a valid state for entry',
          student 
        });
      }

      // Parallelize: RPC call + student_states fetch
      const [rpcResult, stateResult] = await Promise.all([
        supabase.rpc('process_scan', {
          p_pass_id:     pass.id,
          p_guard_id:    profile.id,
          p_scan_type:   'entry',
          p_scan_result: lateEntry ? 'late_entry' : 'valid',
          p_geo_lat:     geo_lat ?? null,
          p_geo_lng:     geo_lng ?? null,
        }),
        supabase
          .from('student_states')
          .select('current_state')
          .eq('student_id', pass.student_id)
          .single(),
      ]);

      if (rpcResult.error) throw rpcResult.error;

      // Defensive: verify student_states was updated to 'inside'.
      if (stateResult.data?.current_state !== 'inside') {
        await supabase
          .from('student_states')
          .upsert({
            student_id:    pass.student_id,
            tenant_id:     pass.tenant_id,
            current_state: 'inside',
            last_entry:    new Date().toISOString(),
            updated_at:    new Date().toISOString(),
          }, { onConflict: 'student_id' });
      }

      return NextResponse.json({ 
        valid: true, 
        result: 'valid', 
        pass, 
        student, 
        message: lateEntry ? 'Welcome back (Late Arrival)' : 'Welcome back' 
      });
    }

    return NextResponse.json({ error: 'Unknown scan type' }, { status: 400 });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function logScan(supabase: SupabaseClient, passId: string | null, guardId: string, scanType: string, result: string, geo?: {lat?: number, lng?: number}, tenantId?: string) {
  if (!passId) return; // pass_scans.pass_id is NOT NULL — skip logging when no pass exists
  await supabase.from('pass_scans').insert({
    pass_id: passId,
    tenant_id: tenantId,
    guard_id: guardId,
    scan_type: scanType,
    scan_result: result,
    geo_lat: geo?.lat,
    geo_lng: geo?.lng,
    device_info: { timestamp: Date.now() },
  });
}
