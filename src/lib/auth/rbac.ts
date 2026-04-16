import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole, Profile, Warden } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('*, tenant:tenants!tenant_id (*)')
      .eq('id', user.id)
      .single();

    if (dbError) {
      // Identity Sync Error: User exists in Auth but not in Profiles
      // This is a critical state that causes redirect loops.
      // We log it specifically so we can see it in server logs.
      console.error('SYSTEM IDENTITY ERROR: User exists but profile lookup failed.', {
        userId: user.id,
        error: dbError.message,
        code: dbError.code
      });
      return null;
    }

    return profile as Profile;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('Dynamic server usage')) {
      throw error;
    }

    console.error('Unexpected error in getCurrentUser:', message);
    return null;
  }
}

/**
 * Diagnostic helper to detect the exact nature of an auth failure.
 * Returns null if no user is signed in at all.
 * Returns { user } but no profile if the identity sync is broken.
 */
export async function getAuthDiagnostics() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { authenticated: false, profile: null };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, tenant:tenants!tenant_id (*)')
    .eq('id', user.id)
    .single();

  return {
    authenticated: true,
    user,
    profile: profile as Profile | null,
    error: error ? {
      message: error.message,
      code: error.code
    } : null
  };
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

/**
 * Validates superadmin status specifically for API routes.
 * Checks JWT metadata first (fast, bypasses RLS).
 * Then checks DB with service-role (robust, bypasses RLS).
 */
export async function validateSuperAdminServer(): Promise<{ user: any, profile: Profile | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // 1. Fast path: Check JWT metadata role
    if (user.user_metadata?.role === 'superadmin') {
      return { user, profile: null }; // Profile can be lazy-loaded later if needed
    }

    // 2. Fallback: Check database using service-role (bypasses RLS)
    // We import createAdminClient here to avoid circular dependencies if any
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    
    const { data: profile } = await admin
      .from('profiles')
      .select('*, tenant:tenants!tenant_id (*)')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'superadmin') {
      return { user, profile: profile as Profile };
    }

    throw new Error('Forbidden');
  } catch (error) {
    console.error('[validateSuperAdminServer] Validation failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function requireWarden(): Promise<Profile & { wardens?: Warden[] }> {
  const profile = await requireRole('warden') as Profile & { wardens?: Warden[] };
  const supabase = await createServerSupabaseClient();

  // In production a warden must always have a tenant_id. A missing tenant_id means
  // the account was misconfigured — surface it clearly rather than auto-assigning
  // to an arbitrary tenant (which could expose the wrong institution's data).
  if (!profile.tenant_id) {
    console.error(`[requireWarden] Warden ${profile.id} has no tenant_id — account is misconfigured.`);
    throw new Error('Warden account is not assigned to a university. Please contact your administrator.');
  }
  
  // Fetch wardens data for this user
  const { data: wardens } = await supabase
    .from('wardens')
    .select('*')
    .eq('profile_id', profile.id);
  
  profile.wardens = wardens as Warden[] || [];
  
  return profile;
}

export async function getWardenHostels(profileId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wardens')
    .select('hostel')
    .eq('profile_id', profileId);
  
  if (error || !data) {
    return [];
  }
  
  return data.map(w => w.hostel);
}

export async function wardenCanAccessStudent(wardenId: string, studentId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .rpc('warden_can_access_student', {
      p_warden_id: wardenId,
      p_student_id: studentId
    });
  
  if (error) {
    console.error('Error checking warden access:', error);
    return false;
  }
  
  return data === true;
}

export async function getWardenStudents(profileId: string): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .rpc('get_warden_students', {
      p_warden_id: profileId
    });
  
  if (error) {
    console.error('Error fetching warden students:', error);
    return [];
  }
  
  return data || [];
}

export async function isStudentInWardenHostel(studentHostel: string | null, wardenHostels: string[]): Promise<boolean> {
  if (!studentHostel) return false;
  return wardenHostels.includes(studentHostel);
}

export { canAccessRoute, getRoleDashboardPath } from './routes';
