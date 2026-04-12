import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { z } from 'zod';

const timeLimitSchema = z.object({
  pass_type: z.enum(['day_outing', 'overnight', 'emergency', 'medical', 'academic']),
  enabled: z.boolean().default(true),
  allowed_start: z.string().nullable().optional(),
  allowed_end: z.string().nullable().optional(),
  max_duration_hours: z.number().nullable().optional(),
});

const updateTimeLimitsSchema = z.object({
  limits: z.array(timeLimitSchema),
});

export async function GET() {
  try {
    await requireRole('admin');
    const supabase = createAdminClient();
    
    const { data: limits, error } = await supabase
      .from('pass_time_limits')
      .select('*')
      .is('tenant_id', null)
      .order('pass_type');
    
    if (error) throw error;
    
    return NextResponse.json({ limits });
  } catch (error) {
    console.error('Error fetching time limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time limits' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole('admin');
    const supabase = createAdminClient();
    
    const body = await request.json();
    const parseResult = updateTimeLimitsSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { limits } = parseResult.data;
    
    // Bulk upsert - prepare all rows
    const upsertData = limits.map(limit => ({
      tenant_id: null,
      pass_type: limit.pass_type,
      enabled: limit.enabled,
      allowed_start: limit.allowed_start ?? null,
      allowed_end: limit.allowed_end ?? null,
      max_duration_hours: limit.max_duration_hours ?? null,
      updated_at: new Date().toISOString(),
    }));
    
    // Single bulk upsert instead of looping
    const { error: upsertError } = await supabase
      .from('pass_time_limits')
      .upsert(upsertData, {
        onConflict: 'tenant_id,pass_type',
      });
    
    if (upsertError) throw upsertError;
    
    // Fetch updated limits
    const { data: updatedLimits, error: fetchError } = await supabase
      .from('pass_time_limits')
      .select('*')
      .is('tenant_id', null)
      .order('pass_type');
    
    if (fetchError) throw fetchError;
    
    return NextResponse.json({ 
      success: true, 
      limits: updatedLimits 
    });
  } catch (error) {
    console.error('Error updating time limits:', error);
    return NextResponse.json(
      { error: 'Failed to update time limits' },
      { status: 500 }
    );
  }
}
