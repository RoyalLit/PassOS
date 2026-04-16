import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Env check: Ensure service role key exists
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Users] SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    // 2. Auth check: Must be a superadmin
    await validateSuperAdminServer();

    // 3. Data fetch using admin client (bypasses RLS)
    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*, tenant:tenants(id, name, slug)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/Superadmin/Users] Fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
