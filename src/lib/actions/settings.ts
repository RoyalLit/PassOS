'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type ParentApprovalMode = 'none' | 'smart' | 'all';

export interface AppSettings {
  id: string;
  geofencing_enabled: boolean;
  campus_lat: number;
  campus_lng: number;
  campus_radius_meters: number;
  parent_approval_mode: ParentApprovalMode;
  updated_at: string;
  updated_by?: string;
}

export async function getSettings(): Promise<AppSettings> {
  // Use admin client for fetching global config to ensure reliability (bypasses RLS)
  const supabase = createAdminClient();
  
  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('*')
    .single();

  if (error) {
    const isNoRows = error.code === 'PGRST116';
    
    if (!isNoRows) {
      // Detailed logging for non-expected errors
      console.error(`[Settings] Fetch Error (${error.code}):`, error.message);
      if (error.details) console.error('[Settings] Details:', error.details);
    }
    
    // Return standard defaults if the row is missing/unavailable
    return {
      id: '',
      geofencing_enabled: false,
      campus_lat: 28.6139,
      campus_lng: 77.2090,
      campus_radius_meters: 500,
      parent_approval_mode: 'smart',
      updated_at: new Date().toISOString(),
    };
  }

  // Merging DB data with defaults to handle partial/old records
  return {
    parent_approval_mode: 'smart',
    ...settings
  } as AppSettings;
}

export async function updateSettings(data: Partial<AppSettings>) {
  const supabase = await createServerSupabaseClient();
  
  // Get current user to set updated_by
  const { data: { user } } = await supabase.auth.getUser();

  const currentSettings = await getSettings();

  if (!currentSettings.id) {
    // This happens if the table is empty or missing
    throw new Error('No configuration found. Please apply the database migration: /supabase/migrations/002_app_settings.sql');
  }

  const { error } = await supabase
    .from('app_settings')
    .update({
      ...data,
      updated_by: user?.id,
    })
    .match({ id: currentSettings.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/settings');
  revalidatePath('/student/new-request');
  return { success: true };
}
