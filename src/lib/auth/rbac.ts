import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole, Profile } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('*, tenant:tenants(*)')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('Error fetching user profile:', dbError.message);
      return null;
    }

    return profile;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Don't log or suppress Next.js internal dynamic rendering errors
    if (message.includes('Dynamic server usage')) {
      throw error;
    }

    console.error('Unexpected error in getCurrentUser:', message);
    return null;
  }
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
