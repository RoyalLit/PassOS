import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('🧹 Starting Nuclear Cleanup Process...');

  // 1. Get all mock tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug')
    .or('slug.ilike.amity-pb%,slug.eq.git-global');

  if (!tenants || tenants.length === 0) {
    console.log('ℹ️ No mock tenants found. Nothing to clean.');
    return;
  }

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`🗑️ Deep cleaning tenant: ${tenant.slug} (${tenantId})`);

    // 2. Identify Student IDs for this tenant
    const { data: tenantProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId);
    
    const profileIds = tenantProfiles?.map(p => p.id) || [];

    // 3. Delete dependent table records in order
    const { data: tenantPasses } = await supabase
      .from('passes')
      .select('id')
      .eq('tenant_id', tenantId);
    
    const passIds = tenantPasses?.map(p => p.id) || [];

    if (passIds.length > 0) {
      console.log(`  └─ Wiping pass_scans for ${passIds.length} passes...`);
      await supabase.from('pass_scans').delete().in('pass_id', passIds);
    }

    const tablesToWipe = [
      'audit_logs', 
      'fraud_flags', 
      'notifications',
      'escalation_rules',
      'app_settings'
    ];

    for (const table of tablesToWipe) {
      console.log(`  └─ Wiping ${table}...`);
      const { error } = await supabase.from(table).delete().eq('tenant_id', tenantId);
      if (error) console.error(`     ❌ Failed to wipe ${table}:`, error.message);
    }

    if (profileIds.length > 0) {
      console.log(`  └─ Unlinking profiles from app_settings...`);
      await supabase.from('app_settings').update({ updated_by: null }).in('updated_by', profileIds);

      console.log(`  └─ Wiping student_states for ${profileIds.length} profiles...`);
      const { error } = await supabase.from('student_states').delete().in('student_id', profileIds);
      if (error) console.error(`     ❌ Failed to wipe student_states:`, error.message);
    }

    console.log(`  └─ Wiping passes and pass_requests...`);
    const { error: pErr } = await supabase.from('passes').delete().eq('tenant_id', tenantId);
    if (pErr) console.error(`     ❌ Failed to wipe passes:`, pErr.message);
    
    const { error: prErr } = await supabase.from('pass_requests').delete().eq('tenant_id', tenantId);
    if (prErr) console.error(`     ❌ Failed to wipe pass_requests:`, prErr.message);

    // 4. Delete Auth users and Profiles
    if (profileIds.length > 0) {
      console.log(`  └─ Deleting ${profileIds.length} auth users...`);
      for (const id of profileIds) {
        try {
          await supabase.auth.admin.deleteUser(id);
        } catch (e) {
          // Ignore
        }
      }

      console.log(`  └─ Wiping profile records...`);
      const { error: profErr } = await supabase.from('profiles').delete().eq('tenant_id', tenantId);
      if (profErr) console.error(`     ❌ Failed to wipe profiles:`, profErr.message);
    }

    // 5. Finally delete the tenant
    const { error: tenantError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (tenantError) {
      console.error(`  ❌ Error deleting tenant ${tenant.slug}:`, tenantError.message);
    } else {
      console.log(`  ✅ ${tenant.slug} completely removed.`);
    }
  }

  console.log('✨ Nuclear Cleanup Completed!');
}

cleanup().catch(console.error);
