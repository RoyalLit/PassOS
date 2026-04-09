-- ============================================================
-- PassOS Migration 007: Persistent Rate Limiting Table + RPC
-- ============================================================
-- Fix #5: In-memory Map rate limiter resets on serverless cold starts.
-- Solution: Replace with a Supabase-persisted rate_limits table that
-- survives across function invocations. Includes an atomic RPC for
-- safe concurrent increments.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT NOT NULL UNIQUE,
  count       INTEGER NOT NULL DEFAULT 1,
  reset_at    TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);

-- Auto-expire old rate limit rows daily (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Atomic increment with ceiling check.
-- Uses INSERT ... ON CONFLICT DO UPDATE with a WHERE clause to prevent
-- over-counting beyond MAX_REQUESTS even under concurrent requests.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_identifier TEXT,
  p_now       TIMESTAMPTZ,
  p_reset_at  TIMESTAMPTZ,
  p_max       INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE public.rate_limits
  SET
    count = count + 1,
    updated_at = NOW()
  WHERE identifier = p_identifier
    AND reset_at >= p_now
    AND count < p_max
  RETURNING count INTO v_new_count;

  IF v_new_count IS NULL THEN
    -- Either expired or already at limit — re-insert to reset
    INSERT INTO public.rate_limits (identifier, count, reset_at)
    VALUES (p_identifier, 1, p_reset_at)
    ON CONFLICT (identifier) DO UPDATE
      SET count = 1, reset_at = p_reset_at, updated_at = NOW();
    v_new_count := 1;
  END IF;

  RETURN jsonb_build_object('count', v_new_count, 'identifier', p_identifier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_rate_limit TO service_role;
