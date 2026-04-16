import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
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

  const [tenantsAll, profilesSummary, tenantsRecent] = await Promise.all([
    adminClient.from('tenants').select('id, status, plan'),
    adminClient.from('profiles').select('id, role, tenant_id'),
    adminClient.from('tenants').select('id, name, slug, status, plan, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    tenants: tenantsAll.data || [],
    profiles: profilesSummary.data || [],
    recentTenants: tenantsRecent.data || [],
  });
}
