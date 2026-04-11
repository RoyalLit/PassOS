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
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('Error fetching user profile:', dbError.message);
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

export async function requireWarden(): Promise<Profile & { wardens?: Warden[] }> {
  const profile = await requireRole('warden') as Profile & { wardens?: Warden[] };
  
  // Fetch wardens data for this user
  const supabase = await createServerSupabaseClient();
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
