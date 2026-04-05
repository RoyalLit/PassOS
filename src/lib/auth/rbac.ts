import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole, Profile } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Auto-rectify missing profiles caused by Auth / RLS race conditions
  if (!profile) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    
    const { data: newProfile, error } = await admin.from('profiles').upsert({
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'student',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User'
    }, { onConflict: 'id' }).select().single();
    
    if (error) {
      console.error('CRITICAL: Failed to auto-recover user profile:', JSON.stringify(error, null, 2));
      console.error('Raw Error:', error);
      return null;
    }
    profile = newProfile;
  }

  return profile;
}

export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) {
    throw new Error('Unauthorized: Not authenticated');
  }
  if (!roles.includes(profile.role)) {
    throw new Error(`Forbidden: Requires role ${roles.join(' or ')}`);
  }
  return profile;
}

export { canAccessRoute, getRoleDashboardPath } from './routes';
