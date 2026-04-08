import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await requireRole('admin');
    const supabase = await createServerSupabaseClient();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid IDs' }, { status: 400 });
    }

    const { error } = await supabase
      .from('fraud_flags')
      .update({ 
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .in('id', ids);

    if (error) {
      console.error('Database error resolving fraud flags:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('API Error in fraud resolve:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
