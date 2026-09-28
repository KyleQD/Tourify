-- =============================================================================
-- VEN-119 / VEN-120 — least-privilege RLS for legacy Venue scheduling tables
-- (policy rebuild; no schema changes; idempotent)
--
-- Defects (authenticated-wide policies):
--   venue_shift_staff_read        : SELECT  auth.uid() IS NOT NULL
--     → every signed-in user could read EVERY venue's operational schedule.
--   venue_shift_assignments_auth  : ALL     auth.uid() IS NOT NULL
--     → any user could create/modify/delete any venue's worker assignments.
--
-- New contract:
--   READ   : venue operators (owner/membership per venue_has_operator_access)
--            OR the assigned worker themselves.
--   WRITE  : workforce authority only — venue owner, membership row holding
--            manage_team, canonical staff_members with manage_team, or a
--            canonical RBAC grant (has_entity_permission 'manage_team').
-- =============================================================================

-- Shared worker-own predicate: does this assignment belong to the caller?
CREATE OR REPLACE FUNCTION public.legacy_assignment_belongs_to_caller(p_staff_member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Canonical roster link.
    SELECT 1 FROM staff_members sm
    WHERE sm.id = p_staff_member_id AND sm.user_id = auth.uid()
  ) OR EXISTS (
    -- Legacy team-member id link.
    SELECT 1 FROM venue_team_members vtm
    WHERE vtm.id = p_staff_member_id AND vtm.user_id = auth.uid()
  );
$$;

-- Workforce-manager predicate for a venue.
CREATE OR REPLACE FUNCTION public.legacy_venue_workforce_manager(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM venue_profiles vp
    WHERE vp.id = p_venue_id
      AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM venue_team_members vtm
    WHERE vtm.venue_id = p_venue_id
      AND vtm.user_id = auth.uid()
      AND vtm.status = 'active'
      AND COALESCE((vtm.permissions ->> 'manage_team')::boolean, false)
  ) OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND sm.employer_entity_type = 'venue'
      AND COALESCE(sm.employer_entity_id, sm.venue_id) = p_venue_id
      AND COALESCE((sm.permissions ->> 'manage_team')::boolean, false)
  ) OR EXISTS (
    SELECT 1 FROM employment_assignments ea
    WHERE ea.user_id = auth.uid()
      AND ea.status IN ('confirmed', 'active')
      AND ea.employer_entity_type = 'venue'
      AND COALESCE(ea.employer_entity_id, ea.venue_id) = p_venue_id
      AND COALESCE((ea.permissions ->> 'manage_team')::boolean, false)
  ) OR has_entity_permission(auth.uid(), 'Venue', p_venue_id, 'manage_team');
$$;

-- ── VEN-120: venue_shifts read scoping ───────────────────────────────────────
DROP POLICY IF EXISTS venue_shifts_staff_read ON public.venue_shifts;
DROP POLICY IF EXISTS venue_shifts_operator_read ON public.venue_shifts;
CREATE POLICY venue_shifts_operator_read ON public.venue_shifts
  FOR SELECT
  USING (
    venue_has_operator_access(venue_id)
    OR EXISTS (
      -- Assigned workers may see their own venue's shifts.
      SELECT 1 FROM venue_shift_assignments vsa
      WHERE vsa.shift_id = venue_shifts.id
        AND legacy_assignment_belongs_to_caller(vsa.staff_member_id)
    )
  );

-- ── VEN-119: venue_shift_assignments split policies ──────────────────────────
DROP POLICY IF EXISTS venue_shift_assignments_auth ON public.venue_shift_assignments;

DROP POLICY IF EXISTS venue_shift_assignments_select ON public.venue_shift_assignments;
CREATE POLICY venue_shift_assignments_select ON public.venue_shift_assignments
  FOR SELECT
  USING (
    legacy_assignment_belongs_to_caller(staff_member_id)
    OR EXISTS (
      SELECT 1 FROM venue_shifts vs
      WHERE vs.id = shift_id
        AND venue_has_operator_access(vs.venue_id)
    )
  );

DROP POLICY IF EXISTS venue_shift_assignments_manage ON public.venue_shift_assignments;
CREATE POLICY venue_shift_assignments_manage ON public.venue_shift_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM venue_shifts vs
      WHERE vs.id = shift_id
        AND legacy_venue_workforce_manager(vs.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_shifts vs
      WHERE vs.id = shift_id
        AND legacy_venue_workforce_manager(vs.venue_id)
    )
  );

-- Workers may update ONLY their own assignment status (accept/decline style),
-- never reassign to someone else.
DROP POLICY IF EXISTS venue_shift_assignments_worker_update ON public.venue_shift_assignments;
CREATE POLICY venue_shift_assignments_worker_update ON public.venue_shift_assignments
  FOR UPDATE
  USING (
    legacy_assignment_belongs_to_caller(staff_member_id)
  )
  WITH CHECK (
    legacy_assignment_belongs_to_caller(staff_member_id)
  );

REVOKE ALL ON FUNCTION public.legacy_assignment_belongs_to_caller(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legacy_assignment_belongs_to_caller(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.legacy_venue_workforce_manager(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legacy_venue_workforce_manager(UUID) TO authenticated;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Anonymous reads denied:           set role anon;
--                                        select count(*) from venue_shifts;             → 0
--                                      reset role;
-- 2. Unrelated authenticated denied:   as non-member user → 0 rows both tables.
-- 3. Worker sees own assignment only; cannot delete it (worker UPDATE lacks DELETE).
-- 4. Manager without membership row but with RBAC grant passes (canonical path).
--
-- Rollback: recreate original two policies from 20260413200000 (NOT recommended).
