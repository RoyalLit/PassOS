import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole, Profile } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*, tenant:tenants(*)')
    .eq('id', user.id)
    .single();

  // Auto-rectify missing profiles caused by Auth / RLS race conditions.
  // The handle_new_user() DB trigger should create profiles on signup, but
  // it can fail if RLS policies or timing issues prevent insertion.
  // This serves as a safety net. We use upsert to handle the race where
  // two concurrent requests both see !profile and both try to upsert —
  // the conflict is resolved by the ON CONFLICT clause.
  if (!profile) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();

    // Try upsert first (handles normal case and most races)
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        role: (user.user_metadata?.role as UserRole) || 'student',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (upsertError) {
      // If upsert fails (e.g. unique constraint race between concurrent requests),
      // fall back to a fresh select. The other request likely just inserted it.
      console.error('Profile upsert failed (possible race), retrying fetch:', upsertError.message);
    }

    // Always re-fetch after upsert to get the authoritative row
    const { data: refreshedProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    profile = refreshedProfile ?? null;
  }

  return profile;
}

import { redirect } from 'next/navigation';

export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) {
    throw new Error('Unauthorized: Not authenticated');
  }

  // Enforcement: Block access if the university is suspended
  // Superadmins can always access (they belong to __system__)
  if (profile.tenant?.status === 'suspended' && profile.role !== 'superadmin') {
    redirect('/suspended');
  }

  if (!roles.includes(profile.role)) {
    throw new Error(`Forbidden: Requires role ${roles.join(' or ')}`);
  }
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  return requireRole('superadmin');
}

export { canAccessRoute, getRoleDashboardPath } from './routes';
