import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth/rbac';
import type { TenantSettings } from '@/types';

const DEFAULT_SETTINGS: TenantSettings = {
  geofencing_enabled: false,
  campus_lat: 28.6139,
  campus_lng: 77.2090,
  campus_radius_meters: 500,
  parent_approval_mode: 'smart',
  gatepass_reasons: {
    day_outing: ['Personal work', 'Medical appointment', 'Family visit', 'Shopping / errands', 'Academic (exam, college work outside campus)'],
    overnight: ['Home visit', 'Family function/event', 'Medical (extended)', 'Tournament / competition'],
  },
};

export async function GET() {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();

    const { data: tenants, error } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: tenants });
  } catch (error: unknown) {
    console.error('Get tenants error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('Unauthorized') ? 401 :
                   errorMessage.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const body = await request.json();

    const { name, slug, domains, logo_url, plan } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 409 }
      );
    }

    const { data: tenant, error } = await admin
      .from('tenants')
      .insert({
        name,
        slug,
        domains: domains || [],
        logo_url: logo_url || null,
        plan: plan || 'starter',
        status: 'trial',
        settings: DEFAULT_SETTINGS,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create tenant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('Unauthorized') ? 401 :
                   errorMessage.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
