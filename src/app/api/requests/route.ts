import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createRequestSchema } from '@/lib/validators/request-schema';
import { MAX_REQUESTS_PER_DAY } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const profile = await requireRole('student');
    const supabase = await createServerSupabaseClient();
    
    // Parse and validate input
    const body = await request.json();
    const result = createRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Rate limiting check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
      .from('pass_requests')
      .select('id', { count: 'exact' })
      .eq('student_id', profile.id)
      .gte('created_at', today.toISOString());

    if (countError) throw new Error('Count Check Failed: ' + JSON.stringify(countError));
    
    if ((count || 0) >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json({ 
        error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_DAY} requests allowed per day.` 
      }, { status: 429 });
    }

    let initialStatus = 'ai_review';

    const { data: insertedRequest, error: insertError } = await supabase
      .from('pass_requests')
      .insert({
        student_id: profile.id,
        request_type: data.request_type,
        reason: data.reason,
        destination: data.destination,
        departure_at: data.departure_at,
        return_by: data.return_by,
        proof_urls: data.proof_urls,
        geo_lat: data.geo_lat,
        geo_lng: data.geo_lng,
        geo_valid: body.geo_valid,
        status: initialStatus,
      })
      .select()
      .single();

    if (insertError) throw new Error('Insert Failed: ' + JSON.stringify(insertError));

    // Fire off async webhook for AI analysis
    // In production, you would probably hit a background queue here.
    // For now, we trigger the endpoint without waiting.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: insertedRequest.id }),
    }).catch(e => console.error('Failed to trigger AI review:', e));

    return NextResponse.json({ data: insertedRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Request creation error:', error);
    return NextResponse.json(
      { 
        error: error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Internal server error',
        details: error 
      },
      { status: error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
