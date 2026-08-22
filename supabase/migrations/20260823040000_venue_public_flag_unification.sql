-- =============================================================================
-- VEN-008 — One publish flag: is_public becomes the single anonymous-visibility
-- contract for venue_profiles (additive, idempotent)
--
-- Defect: two flags diverged across enforcement points.
--   - RLS select policy gated public reads on  settings->>'public_profile'
--   - API (/api/venues/[id]) and global search gate on  is_public
-- A venue with is_public=false but seeded settings.public_profile=true was still
-- anonymously readable via PostgREST.
--
-- Contract after this migration:
--   is_public                      = canonical publish control
--   settings.public_profile        = derived cache kept in sync by trigger
-- =============================================================================

-- ── 1. Canonical column (idempotent) ─────────────────────────────────────────
ALTER TABLE public.venue_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN;

-- ── 2. Reconcile: explicit opt-outs win over defaults; never silently publish ─
UPDATE public.venue_profiles
SET is_public = CASE
  WHEN is_public IS NOT NULL THEN is_public
  WHEN settings ? 'public_profile' THEN COALESCE((settings->>'public_profile')::boolean, true)
  ELSE true
END;

ALTER TABLE public.venue_profiles ALTER COLUMN is_public SET DEFAULT true;
ALTER TABLE public.venue_profiles ALTER COLUMN is_public SET NOT NULL;

-- Write-through: settings cache mirrors the canonical flag everywhere.
UPDATE public.venue_profiles
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{public_profile}',
  to_jsonb(is_public)
)
WHERE settings IS NULL OR (settings->>'public_profile')::boolean IS DISTINCT FROM is_public;

-- ── 3. Keep-in-sync trigger (single source of truth enforced in DB) ──────────
CREATE OR REPLACE FUNCTION public.sync_venue_public_profile_setting()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.settings IS DISTINCT FROM OLD.settings OR NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    NEW.settings := jsonb_set(
      COALESCE(NEW.settings, '{}'::jsonb),
      '{public_profile}',
      to_jsonb(NEW.is_public)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_public_flag_sync ON public.venue_profiles;
CREATE TRIGGER trg_venue_public_flag_sync
  BEFORE INSERT OR UPDATE OF is_public, settings
  ON public.venue_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_public_profile_setting();

-- ── 4. Anonymous visibility now enforces the canonical flag ───────────────────
DROP POLICY IF EXISTS "venue_profiles_select_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "Users can view their own venue profiles" ON public.venue_profiles;
CREATE POLICY "venue_profiles_select_policy"
  ON public.venue_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      main_profile_id IS NOT NULL
      AND auth.uid() = main_profile_id
    )
    -- Public branch now enforces the SAME flag as API/search (VEN-008).
    OR is_public = true
  );

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. No divergence remains:
--      select count(*) from venue_profiles
--      where (settings->>'public_profile')::boolean is distinct from is_public;
-- 2. Unpublished venues are anonymous-hidden at the row level:
--      begin; set local role anon;
--        select count(*) from venue_profiles where is_public = false;  → 0
--      rollback;
-- 3. Trigger keeps cache aligned:
--      update venue_profiles set is_public = false where id = '<test>';
--      select settings->>'public_profile' from venue_profiles where id = '<test>';  → "false"
--
-- Rollback: recreate prior policy from archive/VENUE_ACCESS_FIX.sql lines ~230;
-- drop trigger; columns/settings remain consistent either way.
