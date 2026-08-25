-- ═══════════════════════════════════════════════════════════════
-- VEN-224 / VEN-225 / VEN-227 — site-map entity bridge & collaboration.
--
-- 1. Canonical association (VEN-224): site_maps gains venue_profile_id
--    (FK to the canonical Venue account) + deterministic backfill from
--    created_by → venue_profiles.user_id.
-- 2. Collaboration semantics (VEN-225): accepted/active/non-expired enforced
--    via a CHECK + helper predicate; expiry respected in RLS.
-- 3. Entity permission bridge (VEN-227): venue operators (via the existing
--    venue_has_operator_access predicate) gain read/update on their venue's
--    maps WITHOUT per-user collaborator duplication.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.site_maps
  ADD COLUMN IF NOT EXISTS venue_profile_id uuid REFERENCES public.venue_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_site_maps_venue_profile
  ON public.site_maps (venue_profile_id) WHERE venue_profile_id IS NOT NULL;

COMMENT ON COLUMN public.site_maps.venue_profile_id IS
  'VEN-224: canonical owning Venue account. Deterministic owner/event relation lives here, not in per-user rows.';

-- Deterministic backfill: creator's active venue ownership.
DO $$
DECLARE v_backfilled int;
BEGIN
  UPDATE public.site_maps sm
  SET venue_profile_id = vp.id
  FROM public.venue_profiles vp
  WHERE sm.venue_profile_id IS NULL
    AND vp.user_id = sm.created_by;
  GET DIAGNOSTICS v_backfilled = ROW_COUNT;
  RAISE NOTICE 'VEN-224 venue association backfill: % site map(s) linked via creator ownership', v_backfilled;

  UPDATE public.site_maps sm
  SET venue_profile_id = vp.id
  FROM public.site_map_collaborators c
  JOIN public.venue_profiles vp ON vp.user_id = c.invited_by
  WHERE sm.venue_profile_id IS NULL AND c.site_map_id = sm.id;
  RAISE NOTICE 'VEN-224 secondary pass complete';
END $$;

-- ── VEN-225: collaborator state normalization ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_map_collaborators_state_check'
  ) THEN
    ALTER TABLE public.site_map_collaborators
      ADD CONSTRAINT site_map_collaborators_state_check
      CHECK (
        (is_active = false)
        OR (accepted_at IS NOT NULL AND (expires_at IS NULL OR expires_at > now()))
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.site_map_collaborator_active(
  p_site_map_id uuid,
  p_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_map_collaborators c
    WHERE c.site_map_id = p_site_map_id
      AND c.user_id = p_user_id
      AND c.is_active = true
      AND c.accepted_at IS NOT NULL
      AND (c.expires_at IS NULL OR c.expires_at > now())
  )
$$;

-- ── VEN-227: operator access bridged onto site maps ─────────────────────────
DROP POLICY IF EXISTS site_maps_operator_read ON public.site_maps;
CREATE POLICY site_maps_operator_read ON public.site_maps
  FOR SELECT USING (
    venue_profile_id IS NOT NULL
    AND public.venue_has_operator_access(venue_profile_id)
  );

DROP POLICY IF EXISTS site_maps_operator_write ON public.site_maps;
CREATE POLICY site_maps_operator_write ON public.site_maps
  FOR UPDATE USING (
    venue_profile_id IS NOT NULL
    AND public.venue_has_operator_access(venue_profile_id)
  );

DO $$
DECLARE v_policies int;
BEGIN
  SELECT count(*) INTO v_policies FROM pg_policies
  WHERE tablename='site_maps' AND policyname LIKE 'site_maps_operator%';
  RAISE NOTICE 'VEN-223/224/225/227 site-map bridge installed: % operator polic(ies), backfill + state CHECK applied', v_policies;
END $$;
