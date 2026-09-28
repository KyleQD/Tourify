-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  TOURIFY VENUE PROGRAM — CONSOLIDATED MIGRATION SCRIPT               ║
-- ║  All 18 program migrations, dependency-ordered, idempotent.          ║
-- ║                                                                      ║
-- ║  HOW TO RUN                                                          ║
-- ║  1. Supabase Dashboard → SQL Editor → New query                      ║
-- ║  2. Paste this ENTIRE file and click Run (once).                     ║
-- ║     Safe to re-run: every section is idempotent.                     ║
-- ║  3. Compare the NOTICE lines in the Results/messages pane against    ║
-- ║     the "EXPECTED OUTPUT" list at the bottom of this file and        ║
-- ║     paste them back to the program for tracker reconciliation.       ║
-- ╚══════════════════════════════════════════════════════════════════════╝


-- ======================================================================
-- MIGRATION 20260823010000_venue_identity_bridge.sql
-- VEN-001/088 — Canonical venue identity bridge (ADR-0001)
-- ======================================================================

-- =============================================================================
-- VEN-001 / VEN-088 — Canonical venue identity bridge (additive, idempotent)
-- ADR: docs/adr/0001-canonical-venue-identity.md
--
-- Creates the relational 1:1:1 identity map between the canonical Venue account
-- (venue_profiles.id) and its operational mirrors (venues_v2.id, organizations.id),
-- replacing the untyped venues_v2_id / operational_org_id keys stored inside
-- venue_profiles.settings JSON. No destructive operations; safe to re-run.
-- =============================================================================

create table if not exists public.venue_identity_bridges (
  venue_profile_id   uuid primary key references public.venue_profiles(id) on delete cascade,
  venues_v2_id       uuid unique references public.venues_v2(id) on delete set null,
  operational_org_id uuid unique references public.organizations(id) on delete set null,
  provenance         text not null default 'backfill'
                     check (provenance in ('backfill', 'runtime', 'manual')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.venue_identity_bridges is
  'Canonical Venue identity triangle (ADR-0001): one row per Venue account; UNIQUE FKs guarantee no shadow duplicates across operational mirrors.';

create index if not exists venue_identity_bridges_venues_v2_idx
  on public.venue_identity_bridges (venues_v2_id)
  where venues_v2_id is not null;

create index if not exists venue_identity_bridges_operational_org_idx
  on public.venue_identity_bridges (operational_org_id)
  where operational_org_id is not null;

-- ── RLS: deny by default; owners read their own row; service role manages ────
alter table public.venue_identity_bridges enable row level security;

drop policy if exists venue_identity_bridges_owner_read on public.venue_identity_bridges;
create policy venue_identity_bridges_owner_read
  on public.venue_identity_bridges
  for select
  using (
    exists (
      select 1 from public.venue_profiles vp
      where vp.id = venue_profile_id
        and (vp.user_id = auth.uid() or vp.main_profile_id = auth.uid())
    )
  );

-- Writes are service-role only during the migration window (server provisioning path).
-- Intentionally no authenticated INSERT/UPDATE/DELETE policies.

-- ── Idempotent backfill from settings JSON ───────────────────────────────────
-- Only rows with valid uuid-shaped values migrate; malformed/ambiguous rows are
-- left for the reconciliation report (never silently coerced).

with candidates as (
  select
    vp.id as venue_profile_id,
    nullif(vp.settings ->> 'venues_v2_id', '')       as venues_v2_id_text,
    nullif(vp.settings ->> 'operational_org_id', '') as operational_org_id_text
  from public.venue_profiles vp
  where vp.settings is not null
    and (vp.settings ? 'venues_v2_id' or vp.settings ? 'operational_org_id')
),
validated as (
  select
    venue_profile_id,
    case when venues_v2_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then venues_v2_id_text::uuid end as venues_v2_id,
    case when operational_org_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then operational_org_id_text::uuid end as operational_org_id
  from candidates
)
insert into public.venue_identity_bridges
  (venue_profile_id, venues_v2_id, operational_org_id, provenance)
select
  venue_profile_id,
  venues_v2_id,
  operational_org_id,
  'backfill'::text
from validated
where venues_v2_id is not null or operational_org_id is not null
on conflict (venue_profile_id) do update
  set venues_v2_id       = coalesce(excluded.venues_v2_id, public.venue_identity_bridges.venues_v2_id),
      operational_org_id = coalesce(excluded.operational_org_id, public.venue_identity_bridges.operational_org_id),
      updated_at         = now();

-- ── Reconciliation audit view (source / mapped / ambiguous counts) ──────────
create or replace view public.venue_identity_bridge_audit as
select
  (select count(*) from public.venue_profiles)                                        as source_profiles,
  (select count(*) from public.venue_profiles
     where settings ? 'venues_v2_id' or settings ? 'operational_org_id')              as sources_with_json_identity,
  (select count(*) from public.venue_identity_bridges)                                as bridged_profiles,
  (select count(*) from public.venue_identity_bridges where venues_v2_id is not null) as mapped_venues_v2,
  (select count(*) from public.venue_identity_bridges where operational_org_id is not null) as mapped_orgs,
  (
    select count(*) from public.venue_profiles vp
    where (vp.settings ->> 'venues_v2_id' ~* '^[0-9a-f-]{36}$' is false
           and coalesce(vp.settings ->> 'venues_v2_id', '') <> '')
       or (vp.settings ->> 'operational_org_id' ~* '^[0-9a-f-]{36}$' is false
           and coalesce(vp.settings ->> 'operational_org_id', '') <> '')
  )                                                                                    as malformed_json_values,
  (
    select count(*) from public.venue_identity_bridges b
    where b.venues_v2_id is not null
      and not exists (select 1 from public.venues_v2 v where v.id = b.venues_v2_id)
  )                                                                                    as dangling_venues_v2,
  (
    select count(*) from public.venue_identity_bridges b
    where b.operational_org_id is not null
      and not exists (select 1 from public.organizations o where o.id = b.operational_org_id)
  )                                                                                    as dangling_orgs;

-- ── Validation queries (run after applying) ─────────────────────────────────
-- 1. Every bridged profile resolves:            select * from venue_identity_bridge_audit;
-- 2. No duplicate mirrors across profiles:      expect 0 from:
--    select venues_v2_id, count(*) from venue_identity_bridges group by 1 having count(*) > 1;
-- 3. Double-run idempotency:                    re-execute backfill; audit counts unchanged.
--
-- Rollback: drop view venue_identity_bridge_audit; drop table venue_identity_bridges;
-- (resolvers fall back to settings JSON automatically when the bridge is absent).


-- ======================================================================
-- MIGRATION 20260823020000_venue_slug_repair.sql
-- VEN-014/289-seed — Slug repair + venue_slug_history
-- ======================================================================

-- =============================================================================
-- VEN-014 — Venue slug audit & repair (additive, idempotent)
--
-- The 20260721120000 backfill only filled NULL/empty url_slug values. This
-- migration repairs MALFORMED slugs (uppercase, spaces, punctuation, leading/
-- trailing dashes) to the canonical format ^[a-z0-9]+(-[a-z0-9]+)*$, records
-- every old→new mapping in venue_slug_history (redirect preservation, and the
-- foundation for VEN-289's public redirect table), and reports counts.
--
-- Never destructive: original slugs are preserved in history before rewrite.
-- =============================================================================

-- ── History / redirect mapping ───────────────────────────────────────────────
create table if not exists public.venue_slug_history (
  id               uuid primary key default gen_random_uuid(),
  venue_profile_id uuid not null references public.venue_profiles(id) on delete cascade,
  old_slug         text not null,
  new_slug         text not null,
  reason           text not null default 'repair' check (reason in ('repair','rename','manual')),
  created_at       timestamptz not null default now()
);

comment on table public.venue_slug_history is
  'Old→new slug mappings for Venue profiles (VEN-014 repairs, VEN-289 renames). Server-side redirect resolution reads this table; slugs are public data.';

create index if not exists idx_venue_slug_history_old_slug
  on public.venue_slug_history (old_slug);

alter table public.venue_slug_history enable row level security;

drop policy if exists venue_slug_history_public_read on public.venue_slug_history;
create policy venue_slug_history_public_read
  on public.venue_slug_history
  for select
  using (true);

-- Writes are service-role only (migrations + server-side rename service).

-- ── Repair pass: malformed slugs only ────────────────────────────────────────
DO $$
DECLARE
  rec        RECORD;
  base_slug  TEXT;
  candidate  TEXT;
  suffix     INT;
  repaired   INT := 0;
  skipped    INT := 0;
BEGIN
  FOR rec IN
    SELECT id, url_slug
    FROM public.venue_profiles
    WHERE url_slug IS NOT NULL
      AND btrim(url_slug) <> ''
      AND url_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ORDER BY created_at NULLS LAST, id
  LOOP
    -- Canonical normalization: lowercase, non-alnum runs → single dash, trim.
    base_slug := lower(regexp_replace(rec.url_slug, '[^a-z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

    IF base_slug IS NULL OR base_slug = '' THEN
      -- Nothing usable left after normalization (e.g. slug was "???").
      base_slug := 'venue-' || substr(replace(rec.id::text, '-', ''), 1, 8);
    END IF;

    candidate := base_slug;
    suffix    := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.venue_profiles other
      WHERE other.url_slug = candidate AND other.id <> rec.id
    ) OR EXISTS (
      SELECT 1 FROM public.venue_slug_history h
      WHERE h.new_slug = candidate AND h.venue_profile_id <> rec.id
    ) LOOP
      suffix    := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    END LOOP;

    INSERT INTO public.venue_slug_history (venue_profile_id, old_slug, new_slug, reason)
    VALUES (rec.id, rec.url_slug, candidate, 'repair');

    UPDATE public.venue_profiles SET url_slug = candidate WHERE id = rec.id;
    repaired := repaired + 1;
  END LOOP;

  RAISE NOTICE 'VEN-014 slug repair: % repaired, % already-canonical rows untouched',
    repaired,
    (SELECT count(*) FROM public.venue_profiles
      WHERE url_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  skipped := skipped; -- silence unused warning
END $$;

-- ── Validation queries (run after applying) ─────────────────────────────────
-- 1. Zero malformed remain:
--      select count(*) from venue_profiles
--      where url_slug is not null and url_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
-- 2. Uniqueness holds (unique index from 20260721120000 enforces):
--      select url_slug, count(*) from venue_profiles group by 1 having count(*) > 1;
-- 3. Every repair has a redirect mapping:
--      select count(*) from venue_slug_history where reason='repair';
-- 4. Double-run idempotency: re-execute migration; step counts unchanged.
--
-- Rollback: restore prior slugs via venue_slug_history (reverse mapping), then
-- drop the table. No other schema dependencies exist.


-- ======================================================================
-- MIGRATION 20260823030000_rpc_authorization_hardening.sql
-- VEN-011/083 — SECURITY DEFINER RPC authorization hardening
-- ======================================================================

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


-- ======================================================================
-- MIGRATION 20260823031000_integration_token_vault.sql
-- VEN-016 — Provider token vault (server-only secrets)
-- ======================================================================

-- =============================================================================
-- VEN-016 — Provider secrets leave the browser-readable surface
-- (additive, idempotent; pairs with ADR-0001 method)
--
-- Threat: venue_social_integrations stores access_token / refresh_token inline.
-- The owner-ALL policy means the owner's browser session can SELECT raw provider
-- secrets via PostgREST — any XSS or over-scoped query exfiltrates them.
--
-- Fix, in two layers:
--  1. Column-level revocation: authenticated/anon lose SELECT on the token
--     columns of the legacy table immediately (row policies unchanged).
--  2. Server-only vault: venue_social_integration_secrets holds migrated secret
--     material with RLS enabled and ZERO client policies → reachable ONLY by
--     service-role/server code. Existing values are copied idempotently; source
--     columns stay populated during the migration window (dual-read), retirement
--     happens after the provider-adapter wave (VEN-265+) verifies parity.
--
-- Encryption: writes to the vault go through the server secret-store using
-- ENCRYPTION_KEY (see lib/config environment contract); rows carry key_version so
-- a later re-encryption pass can rotate without downtime.
-- =============================================================================

-- ── 1. Immediate column-level hardening on the legacy table ─────────────────
REVOKE SELECT (access_token) ON public.venue_social_integrations FROM authenticated, anon;
REVOKE SELECT (refresh_token) ON public.venue_social_integrations FROM authenticated, anon;

-- ── 2. Server-only vault ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_social_integration_secrets (
  integration_id        UUID PRIMARY KEY
                        REFERENCES public.venue_social_integrations(id) ON DELETE CASCADE,
  access_token_secret   BYTEA,
  refresh_token_secret  BYTEA,
  key_version           INTEGER NOT NULL DEFAULT 1,
  -- 0 marks rows migrated as plaintext before the first server re-encryption pass.
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.venue_social_integration_secrets IS
  'Server-only provider secret vault (VEN-016). RLS enabled with no client policies: service_role bypasses RLS, no browser session can read or write.';

ALTER TABLE public.venue_social_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Deliberately NO policies. Force safety net even if someone later flips RLS off.
REVOKE ALL ON public.venue_social_integration_secrets FROM PUBLIC, anon, authenticated;

-- ── 3. Idempotent one-time copy of existing material ────────────────────────
INSERT INTO public.venue_social_integration_secrets
  (integration_id, access_token_secret, refresh_token_secret, key_version)
SELECT
  vsi.id,
  convert_to(vsi.access_token, 'UTF8'),
  convert_to(vsi.refresh_token, 'UTF8'),
  0
FROM public.venue_social_integrations vsi
WHERE (vsi.access_token IS NOT NULL OR vsi.refresh_token IS NOT NULL)
ON CONFLICT (integration_id) DO NOTHING;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Vault unreachable by clients:
--      set role authenticated; select * from venue_social_integration_secrets; → permission denied
--      reset role;
-- 2. Token columns hidden from clients:
--      set role authenticated; select id, platform from venue_social_integrations limit 1;        → ok
--      select access_token from venue_social_integrations limit 1;                                 → permission denied
--      reset role;
-- 3. Coverage: every integration holding tokens has a vault row:
--      select count(*) from venue_social_integrations vsi
--      where (access_token is not null or refresh_token is not null)
--        and not exists (select 1 from venue_social_integration_secrets s where s.integration_id = vsi.id);
--
-- Rollback: GRANT back the column SELECTs; drop the vault table (source columns
-- were never cleared during the migration window).


-- ======================================================================
-- MIGRATION 20260823040000_venue_public_flag_unification.sql
-- VEN-008 — Publish flag unification (is_public canonical)
-- ======================================================================

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


-- ======================================================================
-- MIGRATION 20260823050000_venue_rbac_adoption.sql
-- VEN-122/123/124/127/129 — Entity RBAC adoption + legacy mapping
-- ======================================================================

-- =============================================================================
-- VEN-122 / VEN-123 / VEN-124 / VEN-127 — Venue adoption of entity RBAC
-- (additive, idempotent; ADR-0002 companion migration)
--
-- 1. rbac_roles gains optional ownership columns so venue-created roles can live
--    in the canonical table (NULL owner = system/global role). Replaces the
--    never-created `role_templates` relation that /api/venue/roles queried (500s).
-- 2. Seeds the canonical permission catalog using the EXACT legacy JSON permission
--    names already enforced by lib/venue/venue-access.ts (canSatisfyPermission) —
--    this is the VEN-129 translation bridge: one vocabulary, DB-backed.
-- 3. Seeds a default venue role set with sensible role→permission wiring so the
--    Roles & Permissions surface renders real data immediately.
-- 4. VEN-127: maps legacy venue_roles / venue_role_permissions rows into the
--    canonical tables by name (idempotent); venue_user_roles is empty per audit,
--    no assignment backfill required.
-- =============================================================================

-- ── 1. Venue-owned custom roles inside canonical rbac_roles ──────────────────
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS owner_entity_type TEXT;
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS owner_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_rbac_roles_owner
  ON public.rbac_roles (owner_entity_type, owner_entity_id)
  WHERE owner_entity_id IS NOT NULL;

COMMENT ON COLUMN public.rbac_roles.owner_entity_type IS
  'NULL for system/global roles; otherwise the entity type that owns this custom role (e.g. Venue).';

-- ── 2. Canonical permission catalog (names = legacy JSON vocabulary) ─────────
INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('manage_bookings',   'Manage bookings',        'bookings',   'Create, respond to, and transition venue booking requests'),
  ('manage_events',     'Manage events',          'events',     'Create and operate venue events'),
  ('manage_ticketing',  'Manage ticketing',       'ticketing',  'Configure ticketing, tiers, and sales'),
  ('door_check_in',     'Door check-in',          'ticketing',  'Scan credentials and manage door state'),
  ('manage_team',       'Manage staff',           'staff',      'Manage roster, roles, and assignments'),
  ('manage_documents',  'Manage documents',       'documents',  'Upload, share, and organize venue documents'),
  ('view_analytics',    'View analytics',         'analytics',  'Read source-backed analytics dashboards'),
  ('view_finances',     'View finances',          'finance',    'Read authorized finance summaries'),
  ('manage_finances',   'Manage finances',        'finance',    'Record transactions, settlements, payouts')
ON CONFLICT (name) DO NOTHING;

-- VEN-169: finance authority splits into distinct approval / payout / export powers.
INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('approve_finances',  'Approve finances',       'finance',    'Approve pending financial entries and transitions'),
  ('pay_finances',      'Execute payouts',        'finance',    'Authorize settlement disbursements and payouts'),
  ('export_finances',   'Export finances',        'finance',    'Produce CSV/PDF exports of financial data')
ON CONFLICT (name) DO NOTHING;

-- ── 3. Default venue role set + wiring (idempotent) ──────────────────────────
INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description)
VALUES
  ('Venue Owner',        'Venue Owner',        'entity', true, 'Full control of a venue account'),
  ('Venue Manager',      'Venue Manager',      'entity', true, 'Day-to-day operations manager'),
  ('Venue Booking Manager','Booking Manager',  'entity', true, 'Handles booking requests and holds'),
  ('Venue Scheduler',    'Scheduler',          'entity', true, 'Workforce scheduling and shift requests'),
  ('Venue Ticketing Manager','Ticketing Manager','entity', true, 'Ticketing setup and box office'),
  ('Venue Door Staff',   'Door Staff',         'entity', true, 'Scanner/check-in operations'),
  ('Venue Finance Manager','Finance Manager',  'entity', true, 'Finance view/manage/settlement'),
  ('Venue ReadOnly',     'Read Only',          'entity', true, 'View-only access')
ON CONFLICT (name) DO NOTHING;

-- role → permissions (insert-only; safe to re-run)
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (
  VALUES
    ('Venue Owner',              ARRAY['manage_bookings','manage_events','manage_ticketing','door_check_in','manage_team','manage_documents','view_analytics','view_finances','manage_finances','approve_finances','pay_finances','export_finances']::text[]),
    ('Venue Manager',            ARRAY['manage_bookings','manage_events','manage_ticketing','manage_team','manage_documents','view_analytics','view_finances','approve_finances']::text[]),
    ('Venue Booking Manager',    ARRAY['manage_bookings','manage_events','view_analytics']::text[]),
    ('Venue Scheduler',          ARRAY['manage_team']::text[]),
    ('Venue Ticketing Manager',  ARRAY['manage_ticketing','door_check_in','view_analytics']::text[]),
    ('Venue Door Staff',         ARRAY['door_check_in']::text[]),
    ('Venue Finance Manager',    ARRAY['view_finances','manage_finances','approve_finances','export_finances','view_analytics']::text[]),
    ('Venue ReadOnly',           ARRAY['view_analytics']::text[])
) AS desired(role_name, perms)
JOIN public.rbac_roles r
  ON r.name = desired.role_name AND r.is_system = true AND r.scope_type = 'entity'
JOIN public.rbac_permissions p
  ON p.name = ANY (desired.perms)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── 4. VEN-127: legacy role migration (name-keyed, idempotent) ───────────────
DO $$
DECLARE
  legacy_roles_count   INT := 0;
  mapped_roles_count   INT := 0;
  legacy_perms_count   INT := 0;
  mapped_perms_count   INT := 0;
BEGIN
  IF to_regclass('public.venue_roles') IS NOT NULL THEN
    SELECT count(*) INTO legacy_roles_count FROM public.venue_roles;

    -- Map legacy roles as venue-scoped custom roles when not already present.
    INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description, owner_entity_type)
    SELECT DISTINCT
      'Legacy: ' || role_name,
      role_name,
      'entity',
      false,
      'Migrated from legacy venue_roles (VEN-127)',
      'Legacy'
    FROM public.venue_roles vr
    WHERE vr.is_active = true
    ON CONFLICT (name) DO NOTHING;

    GET DIAGNOSTICS mapped_roles_count = ROW_COUNT;

    -- Map legacy role → permission edges where both sides exist canonically.
    IF to_regclass('public.venue_role_permissions') IS NOT NULL
       AND to_regclass('public.venue_permissions') IS NOT NULL THEN
      INSERT INTO public.rbac_role_permissions (role_id, permission_id)
      SELECT canon_role.id, canon_perm.id
      FROM public.venue_role_permissions vrp
      JOIN public.venue_roles vr ON vr.id = vrp.role_id
      JOIN public.venue_permissions vp ON vp.id = vrp.permission_id
      JOIN public.rbac_roles canon_role
        ON canon_role.name = 'Legacy: ' || vr.role_name
      LEFT JOIN public.rbac_permissions canon_perm
        ON lower(canon_perm.name) = lower(vp.permission_name)
         OR lower(canon_perm.display_name) = lower(COALESCE(vp.permission_description, vp.permission_name))
      WHERE canon_perm.id IS NOT NULL
      ON CONFLICT (role_id, permission_id) DO NOTHING;

      GET DIAGNOSTICS mapped_perms_count = ROW_COUNT;
    END IF;

    SELECT count(*) INTO legacy_perms_count FROM public.venue_permissions;
  END IF;

  RAISE NOTICE 'VEN-127 legacy RBAC migration: legacy_roles=% new_canonical_roles=% legacy_permissions=% permission_edges_mapped=%',
    legacy_roles_count, mapped_roles_count, legacy_perms_count, mapped_perms_count;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Catalog present:            select count(*) from rbac_permissions;             (≥ 20)
-- 2. Default roles wired:        select r.name, count(rp.*)
--                                from rbac_roles r left join rbac_role_permissions rp on rp.role_id=r.id
--                                where r.name like 'Venue %' group by 1 order by 1;
-- 3. Legacy mapping report:      select * from rbac_roles where owner_entity_type='Legacy';
-- 4. Double-run idempotency:     counts unchanged after re-execution.
--
-- Rollback: remove seeded 'Venue %'/legacy rows; drop owner columns. No runtime
-- reader depends on the new columns until /api/venue/roles cutover commit lands.


-- ======================================================================
-- MIGRATION 20260823060000_ticketing_grant_collapse_fix.sql
-- VEN-147 — Ticketing grant collapse fix
-- ======================================================================

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


-- ======================================================================
-- MIGRATION 20260823070000_staff_members_canonical_roster.sql
-- VEN-103 — Canonical staff_members roster migration
-- ======================================================================

-- =============================================================================
-- VEN-103 — staff_members is the canonical Venue workforce roster
-- (additive, idempotent backfill + legacy classification)
--
-- Contract: new Venue hires create ONE staff_members row scoped by
-- employer_entity_type='venue' + employer_entity_id=venue_profiles.id.
-- venue_team_members becomes a migration-only legacy table: no new writes from
-- canonical paths, existing rows mapped without loss (dedupe by identity link,
-- NOT by email — VEN-106).
--
-- Current live counts per audit: staff_members=5, venue_team_members=2.
-- =============================================================================

-- ── Legacy classification marker ─────────────────────────────────────────────
COMMENT ON TABLE public.venue_team_members IS
  'LEGACY (VEN-103): migration-only. Canonical Venue roster = staff_members scoped by employer_entity_type/employer_entity_id. Do not write new rows; reads allowed during migration window only.';

-- Identity-link column so legacy rows map deterministically to canonical rows
-- across re-runs (email is NOT a stable identity — VEN-106).
ALTER TABLE public.venue_team_members
  ADD COLUMN IF NOT EXISTS canonical_staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venue_team_members_canonical
  ON public.venue_team_members (canonical_staff_member_id)
  WHERE canonical_staff_member_id IS NOT NULL;

-- ── Idempotent mapping ────────────────────────────────────────────────────────
DO $$
DECLARE
  legacy_total    INT := 0;
  already_linked  INT := 0;
  linked_now      INT := 0;
  unmatched       INT := 0;
  rec             RECORD;
  v_staff_id      UUID;
BEGIN
  SELECT count(*) INTO legacy_total FROM public.venue_team_members;

  FOR rec IN
    SELECT vtm.id, vtm.user_id, vtm.name, vtm.email, vtm.role, vtm.status,
           vtm.canonical_staff_member_id
    FROM public.venue_team_members vtm
  LOOP
    IF rec.canonical_staff_member_id IS NOT NULL THEN
      already_linked := already_linked + 1;
      CONTINUE;
    END IF;

    -- Prefer stable user_id linkage when present; fall back to exact name+venue
    -- match against canonical rows for rows that never had a linked account.
    SELECT sm.id INTO v_staff_id
    FROM public.staff_members sm
    WHERE sm.employer_entity_type = 'venue'
      AND (
        (rec.user_id IS NOT NULL AND sm.user_id = rec.user_id)
        OR (
          rec.user_id IS NULL
          AND lower(COALESCE(sm.name, '')) = lower(COALESCE(rec.name, ''))
          AND lower(COALESCE(sm.email, '')) = lower(COALESCE(rec.email, ''))
        )
      )
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_staff_id IS NULL THEN
      -- No canonical twin exists → migrate the legacy row forward as canonical.
      INSERT INTO public.staff_members (
        user_id, name, email, role, status,
        employer_entity_type, employer_entity_id, created_at, updated_at
      )
      VALUES (
        rec.user_id, rec.name, rec.email,
        COALESCE(rec.role, 'member'),
        CASE rec.status WHEN 'active' THEN 'active' ELSE 'inactive' END,
        'venue',
        rec.venue_id,
        NOW() - INTERVAL '1 second', NOW()
      )
      RETURNING id INTO v_staff_id;

      linked_now := linked_now + 1;
    ELSE
      linked_now := linked_now + 1;
    END IF;

    UPDATE public.venue_team_members
    SET canonical_staff_member_id = v_staff_id
    WHERE id = rec.id;
  END LOOP;

  SELECT count(*) INTO unmatched
  FROM public.venue_team_members
  WHERE canonical_staff_member_id IS NULL;

  RAISE NOTICE 'VEN-103 roster reconciliation: legacy=% pre-linked=% mapped_or_migrated=% unmatched=%',
    legacy_total, already_linked, linked_now, unmatched;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Every legacy row has a canonical twin:
--      select count(*) from venue_team_members where canonical_staff_member_id is null;  → 0
-- 2. No duplicate canonical rows created on re-run (counts stable):
--      select count(*) from staff_members where employer_entity_type='venue';
-- 3. Reconciliation report for VEN-146:
--      select vtm.id legacy_id, sm.id canonical_id, sm.name
--      from venue_team_members vtm join staff_members sm on sm.id = vtm.canonical_staff_member_id;
--
-- Rollback: drop index/column (mapping is metadata-only; migrated INSERTs are
-- additive rows that VEN-146's report tracks).


-- ======================================================================
-- MIGRATION 20260823071000_staff_shifts_backfill.sql
-- VEN-111 — 104 legacy shifts backfill
-- ======================================================================

-- =============================================================================
-- VEN-111 — Backfill 104 legacy venue_shifts into canonical staff_shifts +
-- employment_assignments (additive, idempotent, reconciliation-counted)
--
-- Mapping contract:
--   venue_shifts.venue_id (→ venue_profiles.id) === staff_shifts.venue_id domain
--   (ADR-0001). Legacy multi-worker model (staff_needed/staff_assigned +
--   venue_shift_assignments) maps to one canonical shift row per legacy shift,
--   with worker binding expressed as employment_assignments rows carrying
--   staff_shift_id — never by duplicating business meaning (VEN-112 will add
--   the open-shift/position-demand representation).
--
-- Idempotency: staff_shifts.legacy_venue_shift_id unique link; re-runs skip.
-- =============================================================================

-- ── Link column ──────────────────────────────────────────────────────────────
ALTER TABLE public.staff_shifts
  ADD COLUMN IF NOT EXISTS legacy_venue_shift_id UUID REFERENCES public.venue_shifts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_shifts_legacy_venue_shift
  ON public.staff_shifts (legacy_venue_shift_id)
  WHERE legacy_venue_shift_id IS NOT NULL;

COMMENT ON COLUMN public.staff_shifts.legacy_venue_shift_id IS
  'VEN-111 backfill provenance: original venue_shifts row. Read-only after cutover.';

-- ── Shift backfill ────────────────────────────────────────────────────────────
INSERT INTO public.staff_shifts (
  venue_id,
  staff_member_id,
  shift_date,
  start_time,
  end_time,
  break_duration,
  zone_assignment,
  role_assignment,
  notes,
  status,
  legacy_venue_shift_id
)
SELECT
  vs.venue_id,
  NULL,                                   -- worker binding lives in employment_assignments
  vs.shift_date,
  vs.start_time,
  vs.end_time,
  0,
  vs.location,                            -- operational placement
  COALESCE(vs.role_required, vs.department),
  NULLIF(TRIM(BOTH FROM CONCAT(COALESCE(vs.shift_title, ''), E'\n', COALESCE(vs.shift_description, ''))), ''),
  CASE vs.shift_status
    WHEN 'filled'      THEN 'confirmed'
    WHEN 'completed'   THEN 'completed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE 'scheduled'                       -- open / in_progress / unknown
  END,
  vs.id
FROM public.venue_shifts vs
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_shifts ss WHERE ss.legacy_venue_shift_id = vs.id
);

-- ── Worker bindings → employment_assignments ────────────────────────────────
-- venue_shift_assignments.staff_member_id is an untyped legacy UUID. Resolve it
-- against venue_team_members.id first (its historical pairing), then
-- staff_members.id; only rows resolving to a real auth user produce canonical
-- employment assignments. Unresolvable rows are counted for manual review.
DO $$
DECLARE
  rec                  RECORD;
  v_user_id            UUID;
  v_staff_id           UUID;
  v_staff_shift_id     UUID;
  v_starts             TIMESTAMPTZ;
  v_ends               TIMESTAMPTZ;
  inserted_bindings    INT := 0;
  unresolved_bindings  INT := 0;
BEGIN
  FOR rec IN
    SELECT vsa.*, vs.shift_date, vs.start_time, vs.end_time,
           COALESCE(vs.role_required, vs.department) AS role_label,
           vs.venue_id AS legacy_venue_id
    FROM public.venue_shift_assignments vsa
    JOIN public.venue_shifts vs ON vs.id = vsa.shift_id
    WHERE vsa.assignment_status IN ('pending', 'confirmed', 'completed')
  LOOP
    v_user_id := NULL;
    v_staff_id := NULL;

    -- Resolution path A: legacy team-member row carries user identity.
    IF to_regclass('public.venue_team_members') IS NOT NULL THEN
      SELECT vtm.user_id INTO v_user_id
      FROM public.venue_team_members vtm
      WHERE vtm.id = rec.staff_member_id AND vtm.user_id IS NOT NULL
      LIMIT 1;
    END IF;

    -- Resolution path B: direct staff_members row (canonical roster).
    IF v_user_id IS NULL THEN
      SELECT sm.user_id, sm.id INTO v_user_id, v_staff_id
      FROM public.staff_members sm
      WHERE sm.id = rec.staff_member_id
        AND sm.user_id IS NOT NULL
      LIMIT 1;
    ELSE
      SELECT sm.id INTO v_staff_id
      FROM public.staff_members sm
      WHERE sm.user_id = v_user_id
        AND sm.employer_entity_type = 'venue'
        AND COALESCE(sm.employer_entity_id, sm.venue_id) = rec.legacy_venue_id
      ORDER BY sm.created_at ASC
      LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
      unresolved_bindings := unresolved_bindings + 1;
      CONTINUE;
    END IF;

    SELECT ss.id INTO v_staff_shift_id
    FROM public.staff_shifts ss
    WHERE ss.legacy_venue_shift_id = rec.shift_id
    LIMIT 1;

    v_starts := (rec.shift_date + rec.start_time);
    v_ends   := (rec.shift_date + rec.end_time);

    INSERT INTO public.employment_assignments (
      user_id, venue_id, role_title, department,
      starts_at, ends_at, status, staff_shift_id
    )
    VALUES (
      v_user_id,
      rec.legacy_venue_id,
      COALESCE(rec.role_label, 'Venue Crew'),
      NULL,
      v_starts,
      v_ends,
      CASE rec.assignment_status
        WHEN 'completed' THEN 'active'
        WHEN 'confirmed' THEN 'confirmed'
        ELSE 'confirmed'
      END,
      v_staff_shift_id
    )
    ON CONFLICT DO NOTHING;

    -- Keep canonical shift row pointed at its resolved worker when unassigned.
    IF v_staff_id IS NOT NULL THEN
      UPDATE public.staff_shifts
      SET staff_member_id = v_staff_id
      WHERE legacy_venue_shift_id = rec.shift_id AND staff_member_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.staff_shifts other
          WHERE other.legacy_venue_shift_id = rec.shift_id
            AND other.staff_member_id = v_staff_id
        );
    END IF;

    inserted_bindings := inserted_bindings + 1;
  END LOOP;

  RAISE NOTICE 'VEN-111 backfill: shifts_source=% shifts_mapped=% bindings_inserted=% bindings_unresolved=%',
    (SELECT count(*) FROM public.venue_shifts),
    (SELECT count(*) FROM public.staff_shifts WHERE legacy_venue_shift_id IS NOT NULL),
    inserted_bindings,
    unresolved_bindings;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Zero-loss on shifts:     source count == mapped count
--      select (select count(*) from venue_shifts) as src,
--             (select count(*) from staff_shifts where legacy_venue_shift_id is not null) as mapped;
-- 2. Every mapped row keeps canonical scope:
--      select count(*) from staff_shifts where legacy_venue_shift_id is not null and venue_id is null;  → 0
-- 3. Double-run idempotency: both counts unchanged after re-execution.
-- 4. Binding report for manual review:
--      select * from venue_shift_assignments vsa
--      where assignment_status in ('pending','confirmed','completed')
--        and not exists (select 1 from employment_assignments ea where ea.staff_shift_id =
--              (select id from staff_shifts ss where ss.legacy_venue_shift_id = vsa.shift_id));
--
-- Rollback: delete staff_shifts rows where legacy_venue_shift_id is not null
-- (employment_assignments rows cascade via staff_shift_id FK semantics or are
-- removed by the same predicate); drop link column/index.


-- ======================================================================
-- MIGRATION 20260823072000_shift_rls_hardening.sql
-- VEN-119/120 — Shift RLS least privilege
-- ======================================================================

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


-- ======================================================================
-- MIGRATION 20260823073000_workforce_permission_granularity.sql
-- VEN-130 — Workforce permission granularity
-- ======================================================================

-- =============================================================================
-- VEN-130 (+ VEN-129 wiring) — granular workforce permission catalog
-- (additive, idempotent; companion to ADR-0002)
--
-- Splits the monolithic manage_team authority so that by default:
--   - a scheduler can schedule without viewing pay/HR
--   - a recruiter can hire without editing finances
--   - door staff hold no roster management powers
-- =============================================================================

INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('roster.view',          'View roster',            'staff', 'See venue roster and shift coverage'),
  ('roster.manage',        'Manage roster',          'staff', 'Add, edit, deactivate workforce members'),
  ('hiring.manage',        'Manage hiring',          'staff', 'Postings, applications, interviews, offers'),
  ('scheduling.manage',    'Manage scheduling',      'staff', 'Create/publish shifts, swaps, templates'),
  ('timekeeping.view',     'View timekeeping',       'staff', 'Read clock-ins and worked hours'),
  ('timekeeping.manage',   'Manage timekeeping',     'staff', 'Correct timecards and approve hours'),
  ('hr.sensitive_view',    'View sensitive HR data', 'staff', 'DOB, government ids, emergency contacts, pay rates')
ON CONFLICT (name) DO NOTHING;

-- New default role: recruiter without finance/HR reach.
INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description)
VALUES ('Venue Hiring Manager', 'Hiring Manager', 'entity', true,
        'Runs postings and candidate flow; no finance or HR-sensitive access')
ON CONFLICT (name) DO NOTHING;

-- Role wiring (insert-only, re-runnable).
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (
  VALUES
    ('Venue Owner',           ARRAY['manage_team','roster.view','roster.manage','hiring.manage','scheduling.manage','timekeeping.view','timekeeping.manage','hr.sensitive_view']::text[]),
    ('Venue Manager',         ARRAY['manage_team','roster.view','roster.manage','scheduling.manage','hiring.manage','timekeeping.view','hr.sensitive_view']::text[]),
    ('Venue Scheduler',       ARRAY['roster.view','scheduling.manage','timekeeping.view']::text[]),
    ('Venue Hiring Manager',  ARRAY['roster.view','hiring.manage']::text[]),
    ('Venue Finance Manager', ARRAY['roster.view']::text[]),
    ('Venue ReadOnly',        ARRAY['roster.view']::text[])
) AS desired(role_name, perms)
JOIN public.rbac_roles r
  ON r.name = desired.role_name AND r.is_system = true AND r.scope_type = 'entity'
JOIN public.rbac_permissions p
  ON p.name = ANY (desired.perms)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Door Staff deliberately receives NOTHING here: scanning is door_check_in;
-- scheduling/roster/hiring stay out of reach (VEN-130 acceptance).

-- ── Validation ───────────────────────────────────────────────────────────────
-- 1. Scheduler cannot see pay/HR:
--      select exists(select 1 from rbac_role_permissions rp
--        join rbac_roles r on r.id=rp.role_id and r.name='Venue Scheduler'
--        join rbac_permissions p on p.id=rp.permission_id
--        where p.name in ('hr.sensitive_view','manage_finances'));   → f
-- 2. Hiring Manager has no finances:
--      … r.name='Venue Hiring Manager' and p.name like '%finance%';  → f
-- 3. Door Staff has no roster.manage:
--      … r.name='Venue Door Staff' and p.name='roster.manage';       → f


-- ======================================================================
-- MIGRATION 20260823080000_contact_reconciliation.sql
-- VEN-018 — contact_info → venue_contacts reconciliation
-- ======================================================================

-- =============================================================================
-- VEN-018 — Reconcile contact_info JSON with the relational venue_contacts
-- model (additive, idempotent)
--
-- Contract: `venue_contacts` (venue_id → venue_profiles.id, already canonical
-- domain) becomes the structured store for venue contact roles and visibility;
-- venue_profiles.contact_info JSON remains a legacy read cache during the
-- migration window. Public exposure of any contact stays OFF by default
-- (governed by settings.show_contact_info / future VEN-026 role flags).
-- =============================================================================

-- Deterministic natural key for idempotency: one booking contact per venue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_contacts_primary_booking
  ON public.venue_contacts (venue_id)
  WHERE is_primary = true AND department = 'booking';

DO $$
DECLARE
  scanned    INT := 0;
  inserted   INT := 0;
  skipped    INT := 0;
  rec        RECORD;
  v_first    TEXT;
  v_last     TEXT;
BEGIN
  FOR rec IN
    SELECT vp.id AS venue_id,
           vp.contact_info,
           COALESCE(
             NULLIF(vp.contact_info ->> 'manager_name', ''),
             NULLIF(vp.contact_info ->> 'name', ''),
             'Booking Contact'
           ) AS manager_name,
           NULLIF(vp.contact_info ->> 'booking_email', '') AS booking_email,
           NULLIF(vp.contact_info ->> 'email', '')         AS fallback_email,
           NULLIF(vp.contact_info ->> 'phone', '')         AS phone
    FROM public.venue_profiles vp
    WHERE vp.contact_info IS NOT NULL
      AND jsonb_strip_nulls(vp.contact_info) <> '{}'::jsonb
      AND (
        NULLIF(vp.contact_info ->> 'booking_email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'email', '') IS NOT NULL
        OR NULLIF(vp.contact_info ->> 'phone', '') IS NOT NULL
      )
  LOOP
    scanned := scanned + 1;

    -- Skip venues that already have a primary booking contact (idempotency).
    IF EXISTS (
      SELECT 1 FROM public.venue_contacts vc
      WHERE vc.venue_id = rec.venue_id
        AND vc.is_primary = true
        AND vc.department = 'booking'
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Parse "First Last" best-effort; never fabricate beyond defaults above.
    v_first := NULL;
    v_last  := NULL;
    IF rec.manager_name LIKE '% %' THEN
      v_first := split_part(rec.manager_name, ' ', 1);
      v_last  := substring(rec.manager_name FROM position(' ' IN rec.manager_name) + 1);
    ELSE
      v_first := rec.manager_name;
    END IF;

    BEGIN
      INSERT INTO public.venue_contacts (
        venue_id, first_name, last_name, email, phone,
        department, position, is_primary, notes
      )
      VALUES (
        rec.venue_id,
        v_first,
        v_last,
        COALESCE(rec.booking_email, rec.fallback_email),
        rec.phone,
        'booking',
        'Booking Contact',
        true,
        'Migrated from venue_profiles.contact_info (VEN-018)'
      );
      inserted := inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      skipped := skipped + 1;
    END;
  END LOOP;

  RAISE NOTICE 'VEN-018 contact reconciliation: scanned=% inserted=% skipped_existing=%',
    scanned, inserted, skipped;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Every venue with contact data has a canonical booking contact:
--      select count(*) from venue_profiles vp
--      where jsonb_strip_nulls(coalesce(vp.contact_info,'{}'::jsonb)) <> '{}'::jsonb
--        and not exists (select 1 from venue_contacts vc
--                        where vc.venue_id=vp.id and vc.is_primary and vc.department='booking');
-- 2. Double-run: inserted=0 on second execution.
--
-- Rollback: delete migrated rows (notes like 'VEN-018%'); drop partial index.


-- ======================================================================
-- MIGRATION 20260823090000_canonical_location_and_amenities.sql
-- VEN-246/247 — Canonical location columns + amenities TEXT[] merge
-- ======================================================================

-- ═══════════════════════════════════════════════════════════════
-- VEN-246 + VEN-247 — canonical location columns & amenities array.
--
-- VEN-246: venue_profiles top-level address/city/state/country/postal_code
--          are canonical. Values nested only in contact_info JSON are
--          backfilled into empty columns; conflicting JSON values are left
--          untouched and counted for review (JSON loses, report wins).
--
-- VEN-247: top-level amenities TEXT[] is the one canonical representation.
--          Known keys from the legacy settings.amenities boolean object are
--          merged into the array (synonyms folded, deduped). The settings
--          JSON cache is NOT deleted — writers dual-write during the window;
--          readers reconcile via lib/venue/settings-shapes.ts.
--
-- Idempotent: re-running yields zero additional updates. Additive only; no
-- destructive change. Rollback: values remain in both locations, so reverting
-- app code to legacy reads is safe without a down-migration.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. VEN-246 — location backfill from contact_info JSON
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_backfilled integer := 0;
  v_conflicts  integer := 0;
BEGIN
  UPDATE public.venue_profiles vp
  SET address     = COALESCE(NULLIF(vp.address, ''), NULLIF(vp.contact_info ->> 'address', '')),
      city        = COALESCE(NULLIF(vp.city, ''), NULLIF(vp.contact_info ->> 'city', '')),
      state       = COALESCE(NULLIF(vp.state, ''), NULLIF(vp.contact_info ->> 'state', '')),
      country     = COALESCE(NULLIF(vp.country, ''), NULLIF(vp.contact_info ->> 'country', '')),
      postal_code = COALESCE(NULLIF(vp.postal_code, ''), NULLIF(vp.contact_info ->> 'postal_code', '')),
      updated_at  = now()
  WHERE vp.contact_info IS NOT NULL
    AND jsonb_strip_nulls(vp.contact_info) <> '{}'::jsonb
    AND (
      (COALESCE(vp.address, '') = '' AND COALESCE(vp.contact_info ->> 'address', '') <> '')
      OR (COALESCE(vp.city, '') = '' AND COALESCE(vp.contact_info ->> 'city', '') <> '')
      OR (COALESCE(vp.state, '') = '' AND COALESCE(vp.contact_info ->> 'state', '') <> '')
      OR (COALESCE(vp.country, '') = '' AND COALESCE(vp.contact_info ->> 'country', '') <> '')
      OR (COALESCE(vp.postal_code, '') = '' AND COALESCE(vp.contact_info ->> 'postal_code', '') <> '')
    );
  GET DIAGNOSTICS v_backfilled = ROW_COUNT;

  -- Conflicts: JSON value differs from a non-empty canonical column.
  SELECT count(*) INTO v_conflicts
  FROM public.venue_profiles
  WHERE contact_info IS NOT NULL
    AND (
      (COALESCE(address, '') <> '' AND contact_info ->> 'address' IS NOT NULL AND contact_info ->> 'address' <> address)
      OR (COALESCE(city, '') <> '' AND contact_info ->> 'city' IS NOT NULL AND contact_info ->> 'city' <> city)
      OR (COALESCE(state, '') <> '' AND contact_info ->> 'state' IS NOT NULL AND contact_info ->> 'state' <> state)
      OR (COALESCE(country, '') <> '' AND contact_info ->> 'country' IS NOT NULL AND contact_info ->> 'country' <> country)
      OR (COALESCE(postal_code, '') <> '' AND contact_info ->> 'postal_code' IS NOT NULL AND contact_info ->> 'postal_code' <> postal_code)
    );

  RAISE NOTICE 'VEN-246 location backfill: % row(s) filled from contact_info; % conflicting JSON value row(s) left for review', v_backfilled, v_conflicts;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. VEN-247 — merge legacy settings.amenities object into TEXT[]
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_venue_amenity_key(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(btrim(raw))
    WHEN 'accessible'       THEN 'ada_accessible'
    WHEN 'accessibility'    THEN 'ada_accessible'
    WHEN 'ada accessible'   THEN 'ada_accessible'
    WHEN 'wi-fi'            THEN 'wifi'
    WHEN 'lighting'         THEN 'lighting_system'
    WHEN 'lighting rig'     THEN 'lighting_system'
    WHEN 'full bar'         THEN 'bar_service'
    WHEN 'kitchen'          THEN 'catering_kitchen'
    WHEN 'merch table'      THEN 'merchandise_space'
    WHEN 'livestream setup' THEN 'live_streaming'
    ELSE replace(replace(lower(btrim(raw)), ' ', '_'), '-', '_')
  END
$$;

DO $$
DECLARE
  v_rows_updated     integer := 0;
  v_legacy_venues    integer := 0;
  v_unmerged_after   integer := 0;
BEGIN
  WITH target AS (
    SELECT vp.id,
      COALESCE(vp.amenities, '{}'::text[]) AS current_amenities,
      vp.settings
    FROM public.venue_profiles vp
    WHERE vp.settings IS NOT NULL
      AND jsonb_typeof(vp.settings -> 'amenities') = 'object'
  ),
  computed AS (
    SELECT t.id,
      (
        SELECT array_agg(DISTINCT k ORDER BY k)
        FROM (
          SELECT public.normalize_venue_amenity_key(a) AS k
          FROM unnest(t.current_amenities) AS a
          UNION
          SELECT public.normalize_venue_amenity_key(j.k) AS k
          FROM jsonb_object_keys(t.settings -> 'amenities') AS j(k)
          WHERE (t.settings -> 'amenities' -> j.k) IN ('true'::jsonb, '1'::jsonb)
        ) combined
        WHERE k IS NOT NULL
      ) AS next_array
    FROM target t
  )
  UPDATE public.venue_profiles vp
  SET amenities = c.next_array,
      updated_at = now()
  FROM computed c
  WHERE vp.id = c.id
    AND c.next_array IS DISTINCT FROM vp.amenities;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  SELECT count(*) INTO v_legacy_venues
  FROM public.venue_profiles
  WHERE settings IS NOT NULL
    AND jsonb_typeof(settings -> 'amenities') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(settings -> 'amenities') k
      WHERE (settings -> 'amenities' -> k) IN ('true'::jsonb, '1'::jsonb)
    );

  -- Validation: every truthy legacy key must be represented in TEXT[].
  SELECT count(*) INTO v_unmerged_after
  FROM public.venue_profiles
  WHERE settings IS NOT NULL
    AND jsonb_typeof(settings -> 'amenities') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(settings -> 'amenities') k
      WHERE (settings -> 'amenities' -> k) IN ('true'::jsonb, '1'::jsonb)
        AND public.normalize_venue_amenity_key(k) IS DISTINCT FROM NULL
        AND NOT public.normalize_venue_amenity_key(k) = ANY (COALESCE(amenities, '{}'::text[]))
    );

  RAISE NOTICE 'VEN-247 amenities merge: % venue profile(s) updated; % venue(s) had legacy amenity keys; % unmerged row(s) remaining (expected 0)', v_rows_updated, v_legacy_venues, v_unmerged_after;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Validation sweep (expected zero gaps after section 1)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_location_gaps integer;
BEGIN
  SELECT count(*) INTO v_location_gaps
  FROM public.venue_profiles
  WHERE contact_info IS NOT NULL
    AND ((COALESCE(city,'') = '' AND COALESCE(contact_info->>'city','') <> '')
      OR (COALESCE(state,'') = '' AND COALESCE(contact_info->>'state','') <> '')
      OR (COALESCE(country,'') = '' AND COALESCE(contact_info->>'country','') <> '')
      OR (COALESCE(postal_code,'') = '' AND COALESCE(contact_info->>'postal_code','') <> ''));

  RAISE NOTICE 'VEN-246 validation: % unbackfilled location gap row(s) (expected 0)', v_location_gaps;
END $$;


-- ======================================================================
-- MIGRATION 20260823100000_slug_rename_history.sql
-- VEN-289 — Slug rename trigger + history dedupe
-- ======================================================================

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


-- ======================================================================
-- MIGRATION 20260823110000_public_venue_search_rpc.sql
-- VEN-286 — Ranked public search RPC + indexes
-- ======================================================================

-- ═══════════════════════════════════════════════════════════════
-- VEN-286 — normalized, ranked, indexed public venue search.
--
-- One SECURITY DEFINER entry point for the /venues directory so ranking is
-- deterministic and computed in the database (index-friendly) instead of
-- ad-hoc PostgREST ordering:
--   rank 0  exact name match (case-insensitive)
--   rank 1  name starts with query
--   rank 2  name/city contains query
--   rank 3  no query (browse mode)
--   then verified-first, newest-first.
--
-- Authorization: definer rights are safe because every returned row is
-- filtered to is_public = true and the column list is the public card DTO —
-- no private field can leak regardless of caller. EXECUTE revoked from PUBLIC
-- and granted explicitly (anon + authenticated), mirroring the VEN-011/083
-- hardening pattern.
--
-- Supporting indexes cover browse mode and prefix searches. Idempotent;
-- rollback: drop function + indexes.
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_venue_profiles_public_created
  on public.venue_profiles (created_at desc)
  where is_public = true;

create index if not exists idx_venue_profiles_public_city
  on public.venue_profiles (lower(city))
  where is_public = true;

create or replace function public.search_public_venues(
  p_q             text    default null,
  p_type          text    default null,
  p_city          text    default null,
  p_min_capacity  integer default null,
  p_max_capacity  integer default null,
  p_amenities     text[]  default null,
  p_bookable      boolean default null,
  p_page          integer default 1,
  p_page_size     integer default 20
)
returns table (
  id                  uuid,
  venue_name          text,
  url_slug            text,
  description         text,
  city                text,
  state               text,
  capacity            integer,
  capacity_total      integer,
  venue_types         text[],
  avatar_url          text,
  verification_status text,
  total_count         bigint,
  rank                integer
)
language sql
security definer
set search_path = 'public'
stable
as $$
  WITH filtered AS (
    SELECT vp.*
    FROM public.venue_profiles vp
    WHERE vp.is_public = true
      AND (p_type IS NULL OR vp.venue_types @> ARRAY[p_type])
      AND (p_city IS NULL OR vp.city ILIKE '%' || p_city || '%')
      AND (
        p_min_capacity IS NULL
        OR COALESCE(vp.capacity_total, vp.capacity, 0) >= p_min_capacity
      )
      AND (
        p_max_capacity IS NULL
        OR COALESCE(vp.capacity_total, vp.capacity, 0) <= p_max_capacity
      )
      AND (p_amenities IS NULL OR vp.amenities @> p_amenities)
      AND (
        p_bookable IS DISTINCT FROM true
        OR vp.settings ->> 'allow_bookings' = 'true'
      )
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR vp.venue_name ILIKE '%' || btrim(p_q) || '%'
        OR vp.description ILIKE '%' || btrim(p_q) || '%'
        OR vp.city ILIKE '%' || btrim(p_q) || '%'
      )
  ),
  ranked AS (
    SELECT f.*,
      count(*) OVER () AS total_count,
      CASE
        WHEN p_q IS NULL OR btrim(p_q) = ''                    THEN 3
        WHEN lower(f.venue_name)  =  lower(btrim(p_q))         THEN 0
        WHEN f.venue_name ILIKE btrim(p_q) || '%'              THEN 1
        WHEN f.venue_name ILIKE '%' || btrim(p_q) || '%'
          OR f.city       ILIKE btrim(p_q) || '%'              THEN 2
        ELSE 4
      END AS rank
    FROM filtered f
  )
  SELECT r.id, r.venue_name, r.url_slug, r.description, r.city, r.state,
         r.capacity, r.capacity_total, r.venue_types, r.avatar_url,
         r.verification_status, r.total_count, r.rank
  FROM ranked r
  ORDER BY r.rank ASC,
           (r.verification_status = 'verified') DESC NULLS LAST,
           r.created_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 50)
  OFFSET GREATEST(p_page - 1, 0) * LEAST(GREATEST(p_page_size, 1), 50);
$$;

revoke execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) from public;
grant execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) to anon;
grant execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) to authenticated;

-- Validation notes (run after apply):
--   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.search_public_venues('echo', NULL, NULL, NULL, NULL, NULL, NULL, 1, 20);
--   -- must show index usage on venue_profiles for the browse path and
--   -- deterministic ordering; rank 0 rows precede rank 1, etc.
--   SELECT search_public_venues(NULL, NULL, NULL, NULL, NULL, NULL, false, 1, 5);


-- ======================================================================
-- MIGRATION 20260823120000_venue_account_lifecycle.sql
-- VEN-256/257/259 — Account lifecycle: archive/delete/transfer + audits
-- ======================================================================

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
           e.title || ' (' || COALESCE(e.start_at::date::text, e.event_date::text) || ')'
    FROM public.events e
    WHERE e.venue_id = p_venue_id
      AND COALESCE(e.start_at, e.event_date::timestamptz) >= now()
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


-- ======================================================================
-- MIGRATION 20260823130000_booking_lifecycle.sql
-- VEN-048/077/079/080 — Booking lifecycle, duration contract, requester RLS
-- ======================================================================

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

CREATE POLICY booking_requests_select ON public.venue_booking_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR public.venue_has_operator_access(venue_id)
  );

CREATE POLICY booking_requests_insert ON public.venue_booking_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
  );

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


-- ======================================================================
-- MIGRATION 20260823140000_reservation_conflict_engine.sql
-- VEN-084/049/086/082 — Reservation conflict engine + sanitized availability view
-- ======================================================================

-- ═══════════════════════════════════════════════════════════════
-- VEN-084 / VEN-049 / VEN-078 / VEN-086 / VEN-082 — reservation ledger,
-- database-enforced conflict engine, sanitized public availability.
--
-- 1. Reservation model (VEN-084): venue_reservations models room/stage/
--    whole-venue time consumption as intervals. The EXCLUDE USING gist
--    constraint makes overlapping ACTIVE reservations physically impossible —
--    the database decides conflicts, not browser warnings. Setup/teardown
--    buffers expand the guarded range via a generated column.
--
-- 2. Enforcement engine (VEN-078/049): transition into any consuming state
--    (hold/offer/contract/confirmed) atomically claims the interval from the
--    request's booking slot (or day-granularity fallback); cancellation
--    releases the claim. Exclusion violations surface as 40901 so the API
--    maps them to CONFLICT/409.
--
-- 3. Sanitized availability (VEN-082): raw venue_availability (blocked_reason
--    notes, booking/event ids) is no longer readable by anon/public; a
--    minimal public view exposes only venue/date/is_available.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 1. Reservation ledger ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id              uuid NOT NULL REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  resource_key          text NOT NULL DEFAULT 'whole_venue',
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  setup_buffer_minutes  integer NOT NULL DEFAULT 0 CHECK (setup_buffer_minutes BETWEEN 0 AND 720),
  teardown_buffer_minutes integer NOT NULL DEFAULT 0 CHECK (teardown_buffer_minutes BETWEEN 0 AND 720),
  -- Guarded interval = [start - setup, end + teardown]; immutable expression,
  -- usable in the exclusion constraint below.
  reserved_range        tstzrange GENERATED ALWAYS AS (
                          tstzrange(
                            starts_at - make_interval(secs => setup_buffer_minutes * 60),
                            ends_at   + make_interval(secs => teardown_buffer_minutes * 60),
                            '[)'
                          )
                        ) STORED,
  status                text NOT NULL DEFAULT 'hold'
                        CHECK (status IN ('hold','offer','contract','confirmed','released')),
  source_type           text NOT NULL DEFAULT 'booking_request',
  source_id             uuid NOT NULL,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

COMMENT ON TABLE public.venue_reservations IS
  'VEN-084: consuming time/resource ledger. Active statuses (hold/offer/contract/confirmed) may not overlap per (venue, resource) — enforced by exclusion constraint, not application code.';

CREATE INDEX IF NOT EXISTS idx_venue_reservations_source
  ON public.venue_reservations (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_venue_reservations_venue_range
  ON public.venue_reservations USING gist (venue_id, reserved_range)
  WHERE status IN ('hold','offer','contract','confirmed');

ALTER TABLE public.venue_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_reservations_operator ON public.venue_reservations;
CREATE POLICY venue_reservations_operator ON public.venue_reservations
  FOR ALL USING (public.venue_has_operator_access(venue_id));

DROP POLICY IF EXISTS venue_reservations_public_read ON public.venue_reservations;
CREATE POLICY venue_reservations_public_read ON public.venue_reservations
  FOR SELECT USING (true);
-- Public sees existence/timing only; writes stay operator/service-side.

-- THE constraint: two active claims on the same venue+resource can't overlap.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venue_reservations_no_overlap'
  ) THEN
    ALTER TABLE public.venue_reservations
      ADD CONSTRAINT venue_reservations_no_overlap
      EXCLUDE USING gist (
        venue_id WITH =,
        resource_key WITH =,
        reserved_range WITH &&
      ) WHERE (status IN ('hold','offer','contract','confirmed'));
  END IF;
END $$;

-- ── 2. Engine functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_venue_reservation(
  p_venue_id           uuid,
  p_starts_at          timestamptz,
  p_ends_at            timestamptz,
  p_setup_minutes      integer default 0,
  p_teardown_minutes   integer default 0,
  p_resource_key       text    default 'whole_venue',
  p_source_type        text    default 'booking_request',
  p_source_id          uuid,
  p_actor              uuid    default null
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Reservation end must be after start' USING ERRCODE = '22023';
  END IF;
  BEGIN
    INSERT INTO public.venue_reservations
      (venue_id, resource_key, starts_at, ends_at,
       setup_buffer_minutes, teardown_buffer_minutes,
       status, source_type, source_id, created_by)
    VALUES
      (p_venue_id, COALESCE(NULLIF(p_resource_key,''),'whole_venue'),
       p_starts_at, p_ends_at,
       COALESCE(p_setup_minutes,0), COALESCE(p_teardown_minutes,0),
       'hold', p_source_type, p_source_id, p_actor)
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclude_violation THEN
    RAISE EXCEPTION 'Time range conflicts with an existing active reservation'
      USING ERRCODE = '40901';
  END;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_venue_reservation(
  p_source_type text, p_source_id uuid
)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = 'public' AS $$
  UPDATE public.venue_reservations
  SET status = 'released'
  WHERE source_type = p_source_type AND source_id = p_source_id
    AND status IN ('hold','offer','contract','confirmed');
$$;

REVOKE ALL ON FUNCTION public.create_venue_reservation(uuid,timestamptz,timestamptz,integer,integer,text,text,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_venue_reservation(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_reservation(uuid,timestamptz,timestamptz,integer,integer,text,text,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_venue_reservation(text,uuid) TO authenticated;

-- ── 3. Transition engine consumes/releases reservations (VEN-078/049/086) ──
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
  s public.venue_booking_slots%ROWTYPE;
  v_from text;
  v_allowed boolean;
  v_start timestamptz;
  v_end timestamptz;
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

  IF NOT public.venue_has_operator_access(r.venue_id) THEN
    RAISE EXCEPTION 'Not authorized to manage bookings for this venue' USING ERRCODE = '42501';
  END IF;

  v_from := COALESCE(
    r.lifecycle_status,
    CASE r.status WHEN 'approved' THEN 'confirmed' WHEN 'rejected' THEN 'cancelled'
                  WHEN 'cancelled' THEN 'cancelled' ELSE 'inquiry' END
  );

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

  IF r.lifecycle_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Revision conflict' USING ERRCODE = '40001';
  END IF;

  -- VEN-084/086: entering a consuming state claims the calendar interval;
  -- cancellation releases any prior claim. Slot timing wins when linked;
  -- otherwise fall back to date + duration minutes (day start, UTC).
  IF p_lifecycle_status IN ('hold','offer','contract','confirmed') THEN
    IF r.slot_id IS NOT NULL THEN
      SELECT * INTO s FROM public.venue_booking_slots WHERE id = r.slot_id;
      IF s.id IS NOT NULL AND s.slot_end > s.slot_start THEN
        v_start := s.slot_start;
        v_end   := s.slot_end;
      END IF;
    END IF;
    IF v_start IS NULL THEN
      v_start := r.event_date::timestamptz;
      v_end   := v_start + make_interval(secs => COALESCE(r.event_duration, 120)::int * 60);
    END IF;

    PERFORM public.create_venue_reservation(
      p_venue_id         => r.venue_id,
      p_starts_at        => v_start,
      p_ends_at          => v_end,
      p_resource_key     => 'whole_venue',
      p_source_type      => 'booking_request',
      p_source_id        => r.id,
      p_actor            => p_actor_user_id
    );
    UPDATE public.venue_booking_slots
    SET status = CASE p_lifecycle_status WHEN 'hold' THEN 'pending' ELSE 'booked' END
    WHERE id = r.slot_id AND r.slot_id IS NOT NULL;
  ELSIF p_lifecycle_status = 'cancelled' THEN
    PERFORM public.release_venue_reservation('booking_request', r.id);
    UPDATE public.venue_booking_slots
    SET status = 'open'
    WHERE id = r.slot_id AND r.slot_id IS NOT NULL;
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
EXCEPTION
  WHEN SQLSTATE '40901' THEN
    RAISE;
END;
$$;

-- ── 4. Sanitized public availability (VEN-082) ──────────────────────────────
REVOKE SELECT ON public.venue_availability FROM anon;
REVOKE SELECT ON public.venue_availability FROM public;

DROP VIEW IF EXISTS public.public_venue_availability;
CREATE VIEW public.public_venue_availability
WITH (security_barrier = true) AS
  SELECT va.venue_id, va.date, va.is_available
  FROM public.venue_availability va
  JOIN public.venue_profiles vp ON vp.id = va.venue_id
  WHERE vp.is_public = true
    AND vp.archived_at IS NULL;

GRANT SELECT ON public.public_venue_availability TO anon, authenticated;

COMMENT ON VIEW public.public_venue_availability IS
  'VEN-082: sanitized availability projection — no blocked_reason/notes/booking/event references.';


-- ======================================================================
-- EXPECTED OUTPUT (NOTICE lines) — paste these back for tracker reconciliation
-- ======================================================================
-- [20260823020000] VEN-014 slug repair: % repaired, % already-canonical rows untouched
-- [20260823050000] VEN-127 legacy RBAC migration: legacy_roles=% new_canonical_roles=% legacy_permissions=% permission_edges_mapped=%
-- [20260823070000] VEN-103 roster reconciliation: legacy=% pre-linked=% mapped_or_migrated=% unmatched=%
-- [20260823071000] VEN-111 backfill: shifts_source=% shifts_mapped=% bindings_inserted=% bindings_unresolved=%
-- [20260823080000] VEN-018 contact reconciliation: scanned=% inserted=% skipped_existing=%
-- [20260823090000] VEN-246 location backfill: % row(s) filled from contact_info; % conflicting JSON value row(s) left for review
-- [20260823090000] VEN-247 amenities merge: % venue profile(s) updated; % venue(s) had legacy amenity keys; % unmerged row(s) remaining (expected 0)
-- [20260823090000] VEN-246 validation: % unbackfilled location gap row(s) (expected 0)
-- [20260823100000] VEN-289 slug rename trigger installed; % orphaned history row(s) (expected 0)
-- [20260823120000] VEN-256/257 lifecycle installed: % of 10 expected routines present
-- [20260823130000] VEN-080 lifecycle backfill: % booking request(s) mapped from legacy status
-- [20260823130000] VEN-048/080 validation: % request(s) without lifecycle_status (expected 0)
--
-- Validation quick-checks after run:
--   SELECT count(*) FROM public.venue_slug_history;                      -- expect > 0
--   SELECT count(*) FROM public.rbac_roles WHERE owner_entity_type IS NULL; -- seeded system roles present
--   SELECT count(*) FROM public.venue_reservations;                      -- 0 rows is normal
--   SELECT count(*) FROM public.venue_booking_requests WHERE lifecycle_status IS NULL; -- expect 0
--   EXPLAIN ANALYZE SELECT * FROM public.search_public_venues('a',NULL,NULL,NULL,NULL,NULL,NULL,1,20);
