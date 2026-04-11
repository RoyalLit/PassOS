-- Update rapid request threshold to match frontend constants (10 requests/day)

CREATE OR REPLACE FUNCTION public.check_rapid_requests()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
  rapid_request_threshold INTEGER := 10;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.pass_requests
  WHERE student_id = NEW.student_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND id != NEW.id;

  IF request_count >= rapid_request_threshold THEN
    INSERT INTO public.fraud_flags (student_id, flag_type, severity, details)
    VALUES (
      NEW.student_id,
      'rapid_requests',
      CASE WHEN request_count >= 8 THEN 'high' ELSE 'medium' END,
      jsonb_build_object('count_24h', request_count + 1, 'request_id', NEW.id)
    );
    UPDATE public.profiles SET is_flagged = TRUE, flag_reason = 'Rapid request pattern detected'
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
