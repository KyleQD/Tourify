-- Admin Audit Log
-- Captures all critical mutations performed by org admins for compliance and debugging.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  org_id       uuid NOT NULL,
  action       text NOT NULL,        -- 'create' | 'update' | 'delete' | 'publish' | 'settle' | 'refund' | 'hire' | 'fire' | 'flag'
  entity_type  text NOT NULL,        -- 'event' | 'tour' | 'transaction' | 'settlement' | 'staff' | 'rbac' | 'ticket' | 'feature_flag'
  entity_id    uuid,
  old_values   jsonb,
  new_values   jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_org_time_idx   ON admin_audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx     ON admin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx      ON admin_audit_log (actor_id);

-- RLS: only org admins may read their own org's audit log; no direct user writes (service role only)
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_org_read" ON admin_audit_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Helper function used by API routes to insert audit events without boilerplate
CREATE OR REPLACE FUNCTION log_admin_action(
  p_actor_id   uuid,
  p_org_id     uuid,
  p_action     text,
  p_entity_type text,
  p_entity_id  uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO admin_audit_log (actor_id, org_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
  VALUES (p_actor_id, p_org_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_ip_address, p_user_agent)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
