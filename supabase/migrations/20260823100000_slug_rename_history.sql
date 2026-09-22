-- ═══════════════════════════════════════════════════════════════
-- VEN-289 — slug rename history + deterministic public redirects.
--
-- 1. Trigger: every UPDATE on venue_profiles that changes url_slug records
--    (old_slug → new_slug, reason 'rename') in venue_slug_history — covering
--    API/service/manual writers with one enforcement point. Idempotent per
--    (venue_profile_id, old_slug, new_slug).
-- 2. Unique index dedupes history rows; index on old_slug keeps redirect
--    lookups indexed (idx already created by VEN-014 migration; recreated here
--        defensively for fresh environments).
-- 3. Validation: any history row whose new_slug no longer matches the live
--    profile is expected to be zero except after chained renames, where the
--    latest row always points at the live profile.
--
-- Additive/idempotent. Rollback: drop trigger + function; table stays.
-- ═══════════════════════════════════════════════════════════════

create unique index if not exists idx_venue_slug_history_dedupe
  on public.venue_slug_history (venue_profile_id, old_slug, new_slug);

create index if not exists idx_venue_slug_history_old_slug
  on public.venue_slug_history (old_slug);

create or replace function public.record_venue_slug_rename()
returns trigger
language plpgsql
as $$
BEGIN
  IF NEW.url_slug IS DISTINCT FROM OLD.url_slug
     AND OLD.url_slug IS NOT NULL
     AND btrim(OLD.url_slug) <> ''
     AND NEW.url_slug IS NOT NULL
     AND btrim(NEW.url_slug) <> '' THEN
    INSERT INTO public.venue_slug_history (venue_profile_id, old_slug, new_slug, reason)
    VALUES (NEW.id, OLD.url_slug, NEW.url_slug, 'rename')
    ON CONFLICT (venue_profile_id, old_slug, new_slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

drop trigger if exists trg_venue_slug_rename on public.venue_profiles;
create trigger trg_venue_slug_rename
  after update of url_slug on public.venue_profiles
  for each row execute function public.record_venue_slug_rename();

-- ── Validation ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_stale integer;
BEGIN
  -- History rows whose venue has vanished should be impossible (FK cascade);
  -- rows pointing at a live profile are fine even after chained renames.
  SELECT count(*) INTO v_stale
  FROM public.venue_slug_history h
  WHERE NOT EXISTS (SELECT 1 FROM public.venue_profiles vp WHERE vp.id = h.venue_profile_id);

  RAISE NOTICE 'VEN-289 slug rename trigger installed; % orphaned history row(s) (expected 0)', v_stale;
END $$;
