import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UNIVERSITY_SLUG = "git-global";

async function cleanup() {
  console.log('🧹 Starting Cleanup Process...');

  // 1. Get Tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', UNIVERSITY_SLUG)
    .single();

  if (!tenant) {
    console.log('ℹ️ No mock tenant found. Nothing to clean.');
    return;
  }

  const tenantId = tenant.id;

  // 2. Delete all data associated with this tenant
  // Note: Due to Cascade deletes in some DBs, deleting tenant might be enough, 
  // but we'll be explicit to avoid orphaned Auth users.
  
  console.log('🗑️ Deleting data for tenant:', UNIVERSITY_SLUG);
  
  // We need to delete Auth users manually because they aren't in the same schema
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId);

  if (profiles && profiles.length > 0) {
    console.log(`👤 Deleting ${profiles.length} auth users...`);
    for (const profile of profiles) {
      await supabase.auth.admin.deleteUser(profile.id);
    }
  }

  // Finally delete the tenant (should cascade to other tables if configured)
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId);

  if (error) {
    console.error('❌ Cleanup error:', error);
  } else {
    console.log('✨ Cleanup Completed!');
  }
}

cleanup().catch(console.error);
