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
