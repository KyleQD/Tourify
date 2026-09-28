-- ═══════════════════════════════════════════════════════════════
-- VEN-077 / VEN-048 / VEN-079 / VEN-080 — booking lifecycle foundation.
--
-- 1. Duration contract (VEN-077): venue_booking_requests.event_duration is
--    CANONICAL MINUTES. The public form already submits minutes and approval
--    already adds minutes; only the Venue list UI mislabeled minutes as
--    hours (fixed in app code). Column comment locks the contract.
--
-- 2. Lifecycle states (VEN-048): lifecycle_status mirrors the canonical
--    state machine in lib/venue/booking-lifecycle.ts
--    (inquiry → hold → offer → contract → confirmed | cancelled);
--    legacy status stays mirrored for compatibility.
--
-- 3. Backfill (VEN-080): deterministic mapping of every existing row;
--    idempotent by construction.
--
-- 4. Transition service: transactional RPC with row lock, optimistic
--    revision check, server-side transition validation, actor authorization
--    (defense-in-depth re-check on top of the API layer), and idempotent
--    retry via unique client_request_id. Full audit history retained.
--
-- 5. RLS least privilege (VEN-079): requester ALL-policy replaced with
--    read-own / create-own-pending / cancel-or-edit-own-pending only;
--    operators keep management rights through venue_has_operator_access;
--    DELETE is operator-only (requesters cancel instead).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Duration contract ─────────────────────────────────────────────────────
COMMENT ON COLUMN public.venue_booking_requests.event_duration IS
  'VEN-077: duration is CANONICAL MINUTES across form/API/UI/event conversion.';

-- ── 2. Lifecycle columns ─────────────────────────────────────────────────────
ALTER TABLE public.venue_booking_requests
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS lifecycle_revision integer NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venue_booking_requests_lifecycle_status_check'
  ) THEN
    ALTER TABLE public.venue_booking_requests
      ADD CONSTRAINT venue_booking_requests_lifecycle_status_check
      CHECK (lifecycle_status IN ('inquiry','hold','offer','contract','confirmed','cancelled'));
  END IF;
END $$;

-- ── 3. Audit history ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_booking_lifecycle_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid NOT NULL REFERENCES public.venue_booking_requests(id) ON DELETE CASCADE,
  from_status       text NOT NULL,
  to_status         text NOT NULL,
  actor_user_id     uuid REFERENCES auth.users(id),
  note              text,
  client_request_id uuid UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vblh_request ON public.venue_booking_lifecycle_history (request_id, created_at);

ALTER TABLE public.venue_booking_lifecycle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vblh_operator_read ON public.venue_booking_lifecycle_history;
CREATE POLICY vblh_operator_read ON public.venue_booking_lifecycle_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.venue_booking_requests r
      WHERE r.id = request_id
        AND (r.requester_id = auth.uid() OR public.venue_has_operator_access(r.venue_id))
    )
  );
-- Writes happen exclusively inside the transition RPC (definer).

-- ── 4. Deterministic backfill (VEN-080) ─────────────────────────────────────
DO $$
DECLARE
  v_backfilled integer := 0;
BEGIN
  UPDATE public.venue_booking_requests r
  SET lifecycle_status = CASE r.status
        WHEN 'approved' THEN 'confirmed'
        WHEN 'rejected' THEN 'cancelled'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'inquiry'
      END::text
  WHERE r.lifecycle_status IS NULL;
  GET DIAGNOSTICS v_backfilled = ROW_COUNT;
  RAISE NOTICE 'VEN-080 lifecycle backfill: % booking request(s) mapped from legacy status', v_backfilled;
END $$;

-- Keep the mirror aligned for legacy readers/writers going forward.
CREATE OR REPLACE FUNCTION public.sync_booking_legacy_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    NEW.status := CASE NEW.lifecycle_status
      WHEN 'confirmed' THEN 'approved'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE 'pending'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_sync_legacy ON public.venue_booking_requests;
CREATE TRIGGER trg_booking_sync_legacy
  BEFORE UPDATE ON public.venue_booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_legacy_status();

-- ── 5. Transition service (VEN-048) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transition_venue_booking_lifecycle(
  p_booking_request_id uuid,
  p_expected_revision  integer,
  p_lifecycle_status   text,
  p_actor_user_id      uuid,
  p_client_request_id  uuid,
  p_note               text default null
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  r public.venue_booking_requests%ROWTYPE;
  v_from text;
  v_allowed boolean;
BEGIN
  -- Idempotent retry: same client request returns the recorded outcome.
  IF EXISTS (
    SELECT 1 FROM public.venue_booking_lifecycle_history
    WHERE client_request_id = p_client_request_id
      AND request_id = p_booking_request_id
  ) THEN
    RETURN (
      SELECT jsonb_build_object('idempotent', true, 'to', h.to_status)
      FROM public.venue_booking_lifecycle_history h
      WHERE h.client_request_id = p_client_request_id
        AND h.request_id = p_booking_request_id
      ORDER BY created_at DESC LIMIT 1
    );
  END IF;

  SELECT * INTO r FROM public.venue_booking_requests
  WHERE id = p_booking_request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Booking request not found' USING ERRCODE = 'P0002'; END IF;

  -- Defense-in-depth: API layer already checks manage_bookings; the service
  -- re-verifies operator authority before any mutation.
  IF NOT public.venue_has_operator_access(r.venue_id) THEN
    RAISE EXCEPTION 'Not authorized to manage bookings for this venue' USING ERRCODE = '42501';
  END IF;

  v_from := COALESCE(
    r.lifecycle_status,
    CASE r.status WHEN 'approved' THEN 'confirmed' WHEN 'rejected' THEN 'cancelled'
                  WHEN 'cancelled' THEN 'cancelled' ELSE 'inquiry' END
  );

  -- Canonical transition matrix (mirrors lib/venue/booking-lifecycle.ts).
  v_allowed := CASE
    WHEN v_from = 'inquiry'   THEN p_lifecycle_status IN ('hold','offer','cancelled')
    WHEN v_from = 'hold'      THEN p_lifecycle_status IN ('inquiry','offer','cancelled')
    WHEN v_from = 'offer'     THEN p_lifecycle_status IN ('hold','contract','cancelled')
    WHEN v_from = 'contract'  THEN p_lifecycle_status IN ('offer','confirmed','cancelled')
    WHEN v_from = 'confirmed' THEN p_lifecycle_status = 'cancelled'
    ELSE false
  END;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid transition % -> %', v_from, p_lifecycle_status USING ERRCODE = '22023';
  END IF;

  -- Optimistic concurrency.
  IF r.lifecycle_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Revision conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.venue_booking_requests
  SET lifecycle_status = p_lifecycle_status,
      lifecycle_revision = lifecycle_revision + 1,
      response_message = COALESCE(p_note, response_message),
      responded_at = now(),
      updated_at = now()
  WHERE id = p_booking_request_id
  RETURNING * INTO r;

  INSERT INTO public.venue_booking_lifecycle_history
    (request_id, from_status, to_status, actor_user_id, note, client_request_id)
  VALUES (p_booking_request_id, v_from, p_lifecycle_status, p_actor_user_id, p_note, p_client_request_id);

  RETURN jsonb_build_object(
    'id', r.id,
    'from', v_from,
    'to', p_lifecycle_status,
    'revision', r.lifecycle_revision,
    'legacy_status', r.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_venue_booking_lifecycle(uuid, integer, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_venue_booking_lifecycle(uuid, integer, text, uuid, uuid, text) TO authenticated;

-- ── 6. Requester least privilege (VEN-079) ─────────────────────────────────
DROP POLICY IF EXISTS "Venue owners can manage all booking requests for their venues" ON public.venue_booking_requests;
DROP POLICY IF EXISTS "Users can view and manage their own booking requests" ON public.venue_booking_requests;

DROP POLICY IF EXISTS booking_requests_select ON public.venue_booking_requests;
CREATE POLICY booking_requests_select ON public.venue_booking_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR public.venue_has_operator_access(venue_id)
  );

DROP POLICY IF EXISTS booking_requests_insert ON public.venue_booking_requests;
CREATE POLICY booking_requests_insert ON public.venue_booking_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS booking_requests_update ON public.venue_booking_requests;
CREATE POLICY booking_requests_update ON public.venue_booking_requests
  FOR UPDATE
  USING (
    public.venue_has_operator_access(venue_id)
    OR (requester_id = auth.uid() AND status = 'pending')
  )
  WITH CHECK (
    public.venue_has_operator_access(venue_id)
    OR (requester_id = auth.uid() AND status IN ('pending','cancelled'))
  );

DROP POLICY IF EXISTS booking_requests_delete ON public.venue_booking_requests;
CREATE POLICY booking_requests_delete ON public.venue_booking_requests
  FOR DELETE USING (public.venue_has_operator_access(venue_id));

-- ── 7. Validation ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_unmapped integer;
BEGIN
  SELECT count(*) INTO v_unmapped FROM public.venue_booking_requests WHERE lifecycle_status IS NULL;
  RAISE NOTICE 'VEN-048/080 validation: % request(s) without lifecycle_status (expected 0)', v_unmapped;
END $$;
