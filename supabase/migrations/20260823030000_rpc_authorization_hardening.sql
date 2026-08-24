-- =============================================================================
-- VEN-011 / VEN-083 — RPC authorization hardening (additive, idempotent)
--
-- Both functions were SECURITY DEFINER with NO internal authorization:
--   - get_venue_dashboard_stats(p_venue_id): any authenticated caller could read
--     private aggregates (booking counts, month revenue, team size) for ANY venue.
--   - generate_slots_for_template(...): any authenticated caller could mint
--     booking slots for ANY venue's templates.
--
-- Fix strategy (task cards): keep DEFINER semantics but require verified Venue
-- authority internally; lock EXECUTE to authenticated; harden search_path.
-- =============================================================================

-- ── Shared authority predicate ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venue_has_operator_access(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- 1. Account owner (direct or main-profile linkage).
    SELECT 1 FROM public.venue_profiles vp
    WHERE vp.id = p_venue_id
      AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
  ) OR EXISTS (
    -- 2. Legacy team membership.
    SELECT 1 FROM public.venue_team_members vtm
    WHERE vtm.venue_id = p_venue_id
      AND vtm.user_id = auth.uid()
      AND vtm.status = 'active'
  ) OR EXISTS (
    -- 3. Canonical workforce roster (ADR-0001 entity scoping).
    SELECT 1 FROM public.staff_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND sm.employer_entity_type = 'venue'
      AND COALESCE(sm.employer_entity_id, sm.venue_id) = p_venue_id
  ) OR EXISTS (
    -- 4. Canonical employment assignments.
    SELECT 1 FROM public.employment_assignments ea
    WHERE ea.user_id = auth.uid()
      AND ea.status IN ('confirmed', 'active')
      AND ea.employer_entity_type = 'venue'
      AND COALESCE(ea.employer_entity_id, ea.venue_id) = p_venue_id
  );
$$;

-- =============================================================================
-- VEN-011: get_venue_dashboard_stats — authorized rebuild
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.venue_has_operator_access(p_venue_id) THEN
    RAISE EXCEPTION 'forbidden: caller has no access to venue %', p_venue_id
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'totalBookings', COALESCE((
      SELECT COUNT(*) FROM venue_booking_requests
      WHERE venue_id = p_venue_id AND status = 'approved'
    ), 0),
    'pendingRequests', COALESCE((
      SELECT COUNT(*) FROM venue_booking_requests
      WHERE venue_id = p_venue_id AND status = 'pending'
    ), 0),
    'thisMonthRevenue', COALESCE((
      SELECT SUM(revenue) FROM venue_analytics
      WHERE venue_id = p_venue_id
        AND date >= date_trunc('month', CURRENT_DATE)
    ), 0),
    'averageRating', COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2) FROM venue_reviews
      WHERE venue_id = p_venue_id
    ), 0),
    'totalReviews', COALESCE((
      SELECT COUNT(*) FROM venue_reviews
      WHERE venue_id = p_venue_id
    ), 0),
    'teamMembers', COALESCE((
      SELECT COUNT(*) FROM venue_team_members
      WHERE venue_id = p_venue_id AND status = 'active'
    ), 0),
    'upcomingEvents', COALESCE((
      SELECT COUNT(*)
      FROM events e
      JOIN venue_booking_requests vbr ON e.id = vbr.event_id
      WHERE vbr.venue_id = p_venue_id AND e.start_date > NOW()
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_venue_dashboard_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_venue_dashboard_stats(UUID) TO authenticated;

-- =============================================================================
-- VEN-083: generate_slots_for_template — authorized rebuild
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_slots_for_template(
  p_template_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  t RECORD;
  d DATE;
  count_inserted INTEGER := 0;
  batch INTEGER;
  slot_start_ts TIMESTAMPTZ;
  slot_end_ts TIMESTAMPTZ;
BEGIN
  SELECT * INTO t FROM venue_recurring_templates
  WHERE id = p_template_id AND is_active = TRUE;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Guard: caller must hold operator authority over the template's venue.
  IF NOT public.venue_has_operator_access(t.venue_id) THEN
    RAISE EXCEPTION 'forbidden: caller has no access to venue %', t.venue_id
      USING ERRCODE = '42501';
  END IF;

  IF p_from < t.start_date THEN p_from := t.start_date; END IF;
  IF t.end_date IS NOT NULL AND p_to > t.end_date THEN p_to := t.end_date; END IF;

  d := p_from;
  WHILE d <= p_to LOOP
    IF EXTRACT(DOW FROM d)::INT = t.weekday THEN
      slot_start_ts := (d::TIMESTAMP + t.start_time);
      slot_end_ts := slot_start_ts + (t.duration_minutes || ' minutes')::INTERVAL;
      INSERT INTO venue_booking_slots (venue_id, template_id, slot_start, slot_end)
      VALUES (t.venue_id, t.id, slot_start_ts, slot_end_ts)
      ON CONFLICT (venue_id, slot_start) DO NOTHING;
      GET DIAGNOSTICS batch = ROW_COUNT;
      count_inserted := count_inserted + batch;
    END IF;
    d := d + INTERVAL '1 day';
  END LOOP;
  RETURN count_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_slots_for_template(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_slots_for_template(UUID, DATE, DATE) TO authenticated;

-- ── Validation queries (run after applying) ─────────────────────────────────
-- 1. Definer + locked EXECUTE:
--      select proname, prosecdef from pg_proc
--      where proname in ('get_venue_dashboard_stats','generate_slots_for_template');
--      select proacl from pg_proc where proname='get_venue_dashboard_stats';
-- 2. Unrelated authenticated caller → SQLSTATE 42501 on both RPCs (negative test).
-- 3. Owner/delegated caller → prior results unchanged (positive test).
--
-- Rollback: restore prior function bodies from 20250814124500/archive files;
-- helper venue_has_operator_access is standalone and safe to drop last.
