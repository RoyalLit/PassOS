import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';

export async function GET() {
  try {
    await requireRole('admin');
    const supabase = createAdminClient();
    
    const { data: limits, error } = await supabase
      .from('pass_time_limits')
      .select('*')
      .is('tenant_id', null) // Get global limits for now
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
    const { limits } = body; // Array of { pass_type, enabled, allowed_start, allowed_end, max_duration_hours }
    
    if (!Array.isArray(limits)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Upsert each limit
    for (const limit of limits) {
      const { error } = await supabase
        .from('pass_time_limits')
        .upsert({
          pass_type: limit.pass_type,
          enabled: limit.enabled ?? true,
          allowed_start: limit.allowed_start || null,
          allowed_end: limit.allowed_end || null,
          max_duration_hours: limit.max_duration_hours || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,pass_type',
        });
      
      if (error) throw error;
    }
    
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
