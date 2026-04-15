import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 30; // Max requests per window

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const supabase = createAdminClient();
  const now = Date.now();
  const resetAt = now + WINDOW_MS;

  const { data, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .gte('reset_at', new Date(now).toISOString())
    .single();

  if (error || !data) {
    // No record or expired — insert fresh
    await supabase.from('rate_limits').upsert({
      identifier,
      count: 1,
      reset_at: new Date(resetAt).toISOString(),
    }, { onConflict: 'identifier' });

    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (data.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment atomically via RPC to avoid check-then-act race condition
  const { error: updateError } = await supabase.rpc('increment_rate_limit', {
    p_identifier: identifier,
    p_now: new Date(now).toISOString(),
    p_reset_at: new Date(resetAt).toISOString(),
    p_max: MAX_REQUESTS,
  });

  if (updateError) {
    // RPC failed — deny the request to be safe rather than allowing unlimited through
    console.error('Rate limit RPC failed, denying request conservatively:', updateError.message);
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining: Math.max(0, MAX_REQUESTS - data.count - 1), resetAt };
}

export function getRateLimitHeaders(result: { allowed: boolean; remaining: number; resetAt: number }): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}
