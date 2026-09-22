-- ═══════════════════════════════════════════════════════════════
-- VEN-256 / VEN-257 / VEN-259 — server-side Venue account lifecycle:
-- archive/delete with dependency preflight, ownership transfer, audit trail.
--
-- Replaces direct client-side `venue_profiles.delete()` (AccountManagement)
-- with owner-only SECURITY DEFINER RPCs that are internally authorized and
-- audited (rbac_permission_audit_log). Hard DELETE additionally requires the
-- venue to be ARCHIVED first — a deliberate two-step with a recovery window.
--
-- Public identity (url_slug, id) never changes through any lifecycle action;
-- ownership transfer changes user_id only.
-- ═══════════════════════════════════════════════════════════════

-- The lifecycle contract uses the canonical timestamp carried by the live
-- events schema, while the oldest active baseline still exposes `date` and a
-- later additive migration exposes `event_date`. Capture start_at and backfill
-- only from source columns that actually exist on the target database.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'date'
  ) THEN
    EXECUTE 'UPDATE public.events SET start_at = date WHERE start_at IS NULL AND date IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date'
  ) THEN
    EXECUTE 'UPDATE public.events SET start_at = event_date::timestamptz WHERE start_at IS NULL AND event_date IS NOT NULL';
  END IF;
END $$;

-- ── 1. Archived state ────────────────────────────────────────────────────────
ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.venue_profiles.archived_at IS
  'Set when the owner archives the venue (VEN-256); public surfaces treat archived as unpublished. NULL = active.';

-- ── 2. Ownership transfer requests (VEN-257) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_ownership_transfers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_profile_id uuid NOT NULL REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  from_user_id     uuid NOT NULL REFERENCES auth.users(id),
  to_user_id       uuid NOT NULL REFERENCES auth.users(id),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','cancelled','expired')),
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_ownership_transfers_one_pending
  ON public.venue_ownership_transfers (venue_profile_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_venue_ownership_transfers_to_user
  ON public.venue_ownership_transfers (to_user_id, status);

ALTER TABLE public.venue_ownership_transfers ENABLE ROW LEVEL SECURITY;

-- Participants can watch their own requests; everything else is RPC-only.
DROP POLICY IF EXISTS venue_ownership_transfers_participant_read ON public.venue_ownership_transfers;
CREATE POLICY venue_ownership_transfers_participant_read
  ON public.venue_ownership_transfers FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- ── 3. Shared helpers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venue_is_owner(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_profiles vp
    WHERE vp.id = p_venue_id
      AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_venue_transfers()
RETURNS void LANGUAGE sql SET search_path = 'public' AS $$
  UPDATE public.venue_ownership_transfers
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
$$;

CREATE OR REPLACE FUNCTION public.write_venue_lifecycle_audit(
  p_action text, p_venue_id uuid, p_target uuid default null
)
RETURNS void LANGUAGE sql SET search_path = 'public' AS $$
  INSERT INTO public.rbac_permission_audit_log
    (permission_name, action, actor_id, entity_type, entity_id, target_user_id)
  VALUES ('venue.lifecycle', p_action, auth.uid(), 'venue', p_venue_id, p_target);
$$;

-- ── 4. Dependency preflight (VEN-256) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.preflight_venue_archive(p_venue_id uuid)
RETURNS TABLE (dependency text, detail text)
LANGUAGE sql STABLE SET search_path = 'public' AS $$
  SELECT * FROM (
    -- Upcoming public events on the canonical events relation
    SELECT 'upcoming_event'::text,
           e.title || ' (' || COALESCE(e.start_at::date::text, e.event_date::text, 'date unavailable') || ')'
    FROM public.events e
    WHERE e.venue_id = p_venue_id
      AND (
        COALESCE(e.start_at, e.event_date::timestamptz) >= now()
        OR (e.start_at IS NULL AND e.event_date IS NULL)
      )
      AND COALESCE(e.status, '') NOT IN ('cancelled','completed')

    UNION ALL

    -- Active workforce roster
    SELECT 'active_staff',
           sm.name || ' (' || COALESCE(sm.role, 'staff') || ')'
    FROM public.staff_members sm
    WHERE sm.employer_entity_type = 'venue'
      AND sm.employer_entity_id = p_venue_id
      AND sm.status = 'active'

    UNION ALL

    -- In-flight ownership transfer
    SELECT 'pending_transfer',
           'Ownership transfer pending since ' || t.created_at::date::text
    FROM public.venue_ownership_transfers t
    WHERE t.venue_profile_id = p_venue_id AND t.status = 'pending'
  ) blocks;
$$;

-- ── 5. Archive / restore / delete (VEN-256) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_venue_profile(
  p_venue_id uuid, p_confirm_name text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_name text;
  v_blocks int;
BEGIN
  IF NOT public.venue_is_owner(p_venue_id) THEN
    RAISE EXCEPTION 'Only the venue owner can archive this venue' USING ERRCODE = '42501';
  END IF;

  SELECT venue_name INTO v_name FROM public.venue_profiles WHERE id = p_venue_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Venue not found' USING ERRCODE = 'P0002'; END IF;
  IF COALESCE(p_confirm_name, '') <> v_name THEN
    RAISE EXCEPTION 'Confirmation text does not match the venue name' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_blocks FROM public.preflight_venue_archive(p_venue_id);
  IF v_blocks > 0 THEN
    RAISE EXCEPTION '% unresolved dependency(ies) — resolve or reassign first', v_blocks
      USING ERRCODE = '40901', DETAIL = 'Run preflight_venue_archive for the list.';
  END IF;

  UPDATE public.venue_profiles
  SET archived_at = now(), is_public = false, updated_at = now()
  WHERE id = p_venue_id;

  PERFORM public.write_venue_lifecycle_audit('archive', p_venue_id);
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_venue_profile(p_venue_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.venue_is_owner(p_venue_id) THEN
    RAISE EXCEPTION 'Only the venue owner can restore this venue' USING ERRCODE = '42501';
  END IF;
  UPDATE public.venue_profiles
  SET archived_at = NULL, updated_at = now()
  WHERE id = p_venue_id;
  PERFORM public.write_venue_lifecycle_audit('unarchive', p_venue_id);
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_venue_profile(
  p_venue_id uuid, p_confirm_name text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_name text;
  v_archived timestamptz;
BEGIN
  IF NOT public.venue_is_owner(p_venue_id) THEN
    RAISE EXCEPTION 'Only the venue owner can delete this venue' USING ERRCODE = '42501';
  END IF;

  SELECT venue_name, archived_at INTO v_name, v_archived
  FROM public.venue_profiles WHERE id = p_venue_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Venue not found' USING ERRCODE = 'P0002'; END IF;
  IF COALESCE(p_confirm_name, '') <> v_name THEN
    RAISE EXCEPTION 'Confirmation text does not match the venue name' USING ERRCODE = '22023';
  END IF;
  IF v_archived IS NULL THEN
    RAISE EXCEPTION 'Archive the venue before deleting (recovery window)'
      USING ERRCODE = '40902';
  END IF;

  PERFORM public.expire_stale_venue_transfers();
  IF EXISTS (
    SELECT 1 FROM public.preflight_venue_archive(p_venue_id)
  ) THEN
    RAISE EXCEPTION 'Unresolved dependencies re-appeared — resolve before deletion'
      USING ERRCODE = '40901';
  END IF;

  PERFORM public.write_venue_lifecycle_audit('delete', p_venue_id);
  DELETE FROM public.venue_profiles WHERE id = p_venue_id;
  RETURN 1;
END;
$$;

-- ── 6. Ownership transfer (VEN-257) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_venue_ownership_transfer(
  p_venue_id uuid, p_to_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_owner uuid;
  v_existing uuid;
  v_transfer uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.venue_profiles WHERE id = p_venue_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Venue not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.venue_is_owner(p_venue_id) THEN
    RAISE EXCEPTION 'Only the venue owner can transfer ownership' USING ERRCODE = '42501';
  END IF;
  IF p_to_user_id = v_owner THEN
    RAISE EXCEPTION 'Venue is already owned by this account' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_to_user_id) THEN
    RAISE EXCEPTION 'Target account not found' USING ERRCODE = '22023';
  END IF;

  PERFORM public.expire_stale_venue_transfers();

  -- Supersede any prior pending request (unique partial index guarantees one).
  UPDATE public.venue_ownership_transfers
  SET status = 'cancelled'
  WHERE venue_profile_id = p_venue_id AND status = 'pending'
  RETURNING id INTO v_existing;

  INSERT INTO public.venue_ownership_transfers
    (venue_profile_id, from_user_id, to_user_id)
  VALUES (p_venue_id, v_owner, p_to_user_id)
  RETURNING id INTO v_transfer;

  PERFORM public.write_venue_lifecycle_audit('transfer_request', p_venue_id, p_to_user_id);
  RETURN v_transfer;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_venue_ownership_transfer(p_venue_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE v_rows int;
BEGIN
  IF NOT public.venue_is_owner(p_venue_id) THEN
    RAISE EXCEPTION 'Only the venue owner can cancel the transfer' USING ERRCODE = '42501';
  END IF;
  UPDATE public.venue_ownership_transfers
  SET status = 'cancelled'
  WHERE venue_profile_id = p_venue_id AND status = 'pending';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows > 0 THEN
    PERFORM public.write_venue_lifecycle_audit('transfer_cancel', p_venue_id);
  END IF;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_venue_ownership_transfer(p_transfer_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  r public.venue_ownership_transfers%ROWTYPE;
  v_manager_role uuid;
BEGIN
  PERFORM public.expire_stale_venue_transfers();

  SELECT * INTO r FROM public.venue_ownership_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Transfer not found' USING ERRCODE = 'P0002'; END IF;
  IF auth.uid() IS DISTINCT FROM r.to_user_id THEN
    RAISE EXCEPTION 'Only the named recipient can accept this transfer' USING ERRCODE = '42501';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Transfer is no longer pending (%)', r.status USING ERRCODE = '40903';
  END IF;

  -- Atomic swap: new owner takes user_id; public identity columns untouched.
  UPDATE public.venue_profiles
  SET user_id = r.to_user_id, updated_at = now()
  WHERE id = r.venue_profile_id;

  UPDATE public.venue_ownership_transfers
  SET status = 'accepted', accepted_at = now()
  WHERE id = r.id;

  -- Prior owner keeps day-to-day access via the seeded Venue Manager role
  -- (rollback window), instead of silent lockout.
  SELECT id INTO v_manager_role FROM public.rbac_roles
  WHERE name = 'Venue Manager' AND is_system = true AND scope_type = 'entity'
  LIMIT 1;
  IF v_manager_role IS NOT NULL THEN
    -- No unique constraint exists on assignments; guard against duplicates.
    IF NOT EXISTS (
      SELECT 1 FROM public.rbac_user_entity_roles
      WHERE user_id = r.from_user_id AND entity_type = 'venue'
        AND entity_id = r.venue_profile_id AND role_id = v_manager_role
        AND is_active = true
    ) THEN
      INSERT INTO public.rbac_user_entity_roles
        (user_id, entity_type, entity_id, role_id, is_active, start_at)
      VALUES (r.from_user_id, 'venue', r.venue_profile_id, v_manager_role, true, now());
    END IF;
  END IF;

  PERFORM public.write_venue_lifecycle_audit('transfer_accept', r.venue_profile_id, r.to_user_id);
  RETURN 1;
END;
$$;

-- ── 7. Validation ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT count(*) INTO v_missing FROM (
    SELECT 1 FROM pg_proc WHERE proname IN
      ('venue_is_owner','preflight_venue_archive','archive_venue_profile',
       'unarchive_venue_profile','delete_venue_profile','request_venue_ownership_transfer',
       'cancel_venue_ownership_transfer','accept_venue_ownership_transfer',
       'expire_stale_venue_transfers','write_venue_lifecycle_audit')
  ) s;
  RAISE NOTICE 'VEN-256/257 lifecycle installed: % of 10 expected routines present', v_missing;
END $$;
