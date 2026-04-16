import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  // Verify caller is a superadmin
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: callerProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single();

  if (callerProfile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all data cross-tenant using service-role (bypasses RLS)
  const [tenantsRes, profilesRes, passesRes, requestsRes, fraudFlagsRes] = await Promise.all([
    adminClient.from('tenants').select('id, status, plan, created_at'),
    adminClient.from('profiles').select('id, role, created_at'),
    adminClient.from('passes').select('id, status, created_at'),
    adminClient.from('pass_requests').select('id, status, created_at'),
    adminClient.from('fraud_flags').select('id, created_at'),
  ]);

  return NextResponse.json({
    tenants: tenantsRes.data || [],
    profiles: profilesRes.data || [],
    passes: passesRes.data || [],
    requests: requestsRes.data || [],
    fraudFlags: fraudFlagsRes.data || [],
  });
}
