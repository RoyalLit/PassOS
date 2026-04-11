import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/rbac';

export async function GET() {
  const profile = await getCurrentUser();
  if (!profile) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const adminClient = createAdminClient();

  // 1. Query with the student's session (respects RLS)
  const { data: sessionPasses, error: sessionError } = await supabase
    .from('passes')
    .select('id, student_id, status, valid_until, tenant_id, created_at')
    .eq('student_id', profile.id);

  // 2. Query with the admin client (bypasses RLS) — ground truth
  const { data: adminPasses, error: adminError } = await adminClient
    .from('passes')
    .select('id, student_id, status, valid_until, tenant_id, created_at')
    .eq('student_id', profile.id);

  // 3. Check RLS policies on passes table
  const { data: policies } = await adminClient
    .from('pg_policies')
    .select('policyname, cmd, qual')
    .eq('tablename', 'passes')
    .limit(20);

  return NextResponse.json({
    user: {
      id: profile.id,
      role: profile.role,
      tenant_id: profile.tenant_id,
    },
    sessionQuery: {
      count: sessionPasses?.length ?? 0,
      passes: sessionPasses,
      error: sessionError?.message,
    },
    adminQuery: {
      count: adminPasses?.length ?? 0,
      passes: adminPasses,
      error: adminError?.message,
    },
    policies: policies ?? [],
  });
}
