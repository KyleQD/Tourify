-- =============================================================================
-- VEN-147 — remove org-membership privilege collapse from ticketing grants
-- (idempotent function/policy rebuild; no schema changes)
--
-- Defect: has_event_ticketing_grant ORed is_event_v2_org_member irrespective of
-- the requested permission, so ANY organization member implicitly held EVERY
-- granular ticketing permission (scan, refunds, box office, grant management,
-- config writes). Several policies also bypassed the helper with the same bare
-- membership check — including event_ticketing_grants_write, letting members
-- self-grant.
--
-- Contract after this migration:
--   - Organization membership implies ONLY the 'view_overview' baseline.
--   - Every other permission requires an explicit event_ticketing_grants row
--     for that exact permission.
--   - The event creator retains full authority (ownership anchor).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_event_ticketing_grant(p_event_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_ticketing_grants g
    WHERE g.event_id = p_event_id
      AND g.user_id = auth.uid()
      AND g.permission = p_permission
  ) OR (
    -- Sole membership baseline: read-only visibility. Never implies
    -- scan/refund/manage/finance/grant-admin privileges (VEN-147).
    p_permission = 'view_overview'
    AND is_event_v2_org_member(p_event_id)
  );
$$;

REVOKE ALL ON FUNCTION public.has_event_ticketing_grant(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_event_ticketing_grant(UUID, TEXT) TO authenticated;

-- ── Policy rebuilds: sensitive surfaces lose the bare membership bypass ──────

-- Ticketing config writes: explicit manage grant or event creator only.
DROP POLICY IF EXISTS event_ticketing_config_write ON event_ticketing_config;
CREATE POLICY event_ticketing_config_write ON event_ticketing_config
  FOR ALL USING (
    has_event_ticketing_grant(event_id, 'manage_ticket_types')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  )
  WITH CHECK (
    has_event_ticketing_grant(event_id, 'manage_ticket_types')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- Grant management: explicit manage_grants grant or event creator only.
-- (Previously: any org member could mint grants for themselves.)
DROP POLICY IF EXISTS event_ticketing_grants_write ON event_ticketing_grants;
CREATE POLICY event_ticketing_grants_write ON event_ticketing_grants
  FOR ALL USING (
    has_event_ticketing_grant(event_id, 'manage_grants')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  )
  WITH CHECK (
    has_event_ticketing_grant(event_id, 'manage_grants')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- Check-in writes: scanner/box-office grants or event creator.
DROP POLICY IF EXISTS ticket_checkins_insert ON ticket_checkins;
CREATE POLICY ticket_checkins_insert ON ticket_checkins
  FOR INSERT WITH CHECK (
    has_event_ticketing_grant(event_id, 'scan_tickets')
    OR has_event_ticketing_grant(event_id, 'operate_box_office')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- Ticket mutation beyond ownership: transfer/reassign grant or creator.
DROP POLICY IF EXISTS tickets_owner_update ON tickets;
CREATE POLICY tickets_owner_update ON tickets
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR has_event_ticketing_grant(event_id, 'transfer_reassign')
    OR EXISTS (
      SELECT 1 FROM events_v2 e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Helper semantics: member without grants → view_overview=true,
--    scan_tickets=false:
--      select has_event_ticketing_grant('<event>', 'view_overview');
--      select has_event_ticketing_grant('<event>', 'scan_tickets');
-- 2. Member cannot self-grant: insert into event_ticketing_grants as plain
--    member → policy violation.
-- 3. Explicit grant holder passes exact-permission checks.
--
-- Rollback: restore prior bodies from 20260712120000_event_ticketing_foundation.sql
-- (function + four policies). No data changes involved.
