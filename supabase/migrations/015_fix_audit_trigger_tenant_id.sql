-- ============================================================
-- PassOS Migration 015: Fix audit_log_trigger to include tenant_id
-- ============================================================
-- The audit_logs table now has a NOT NULL tenant_id column (from migration 011),
-- but the audit_log_trigger() function wasn't updated to populate it.
-- This fixes all audit trigger inserts to include tenant_id from the triggering row.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Extract tenant_id from the row being audited
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_tenant_id := NEW.tenant_id;
  ELSE
    v_tenant_id := OLD.tenant_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tenant_id, action, entity_type, entity_id, new_data)
    VALUES (v_tenant_id, 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tenant_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (v_tenant_id, 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tenant_id, action, entity_type, entity_id, old_data)
    VALUES (v_tenant_id, 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
