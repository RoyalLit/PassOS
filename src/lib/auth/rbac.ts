import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole, Profile } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    console.log('[getCurrentUser] Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[getCurrentUser] Auth result:', { 
      hasUser: !!user, 
      userId: user?.id,
      error: authError?.message,
      userMetadata: user?.user_metadata
    });
    
    if (authError || !user) {
      console.log('[getCurrentUser] No user or auth error, returning null');
      return null;
    }

    console.log('[getCurrentUser] Fetching profile for user:', user.id);
    
    // First try without tenant join to see if that's the issue
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[getCurrentUser] Profile fetch error:', profileError.message, profileError.code);
      return null;
    }
    
    console.log('[getCurrentUser] Profile found:', profile?.id, profile?.role);
    return profile as Profile;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Don't log or suppress Next.js internal dynamic rendering errors
    if (message.includes('Dynamic server usage')) {
      throw error;
    }

    console.error('[getCurrentUser] Unexpected error:', message, error);
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
