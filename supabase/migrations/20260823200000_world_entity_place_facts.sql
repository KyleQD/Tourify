-- =====================================================================
-- P3 — Live Geographic Projection Layer
-- Canonical association table between Tourify operational entities and
-- geo_places. Additive; RLS-deny-by-default; writes are service/projector
-- controlled. Idempotency: one open fact per
-- (entity_table, entity_id, place_id, relation_key).
--
-- Relation vocabulary MUST come from lib/world/contracts/v1.ts
-- (RELATION_REGISTRY). Unknown pairs fail closed at the application layer;
-- this migration pins the frozen domain list at the database boundary.
-- =====================================================================

create table if not exists public.world_entity_place_facts (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in (
    'artist','venue','event','organization','track','release',
    'post','blog_article','press_release','radio_station',
    'cultural_entity','place')),
  entity_table text not null,
  entity_id text not null,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  relation_domain text not null check (relation_domain in (
    'artist_place','cultural_place','cultural_graph','track_place',
    'radio_place','event_place','org_place','content_place','ranking')),
  relation_key text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  confidence numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  is_primary boolean not null default false,
  visibility text not null default 'internal' check (visibility in (
    'private','internal','public','aggregate_only')),
  provenance jsonb not null default '{}'::jsonb,
  projector_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.world_entity_place_facts is
  'P3 projection facts: operational entity <-> canonical place associations. Idempotent upserts only; retirement via valid_until.';

-- Idempotency: a single OPEN fact per identity tuple. Expired facts are kept
-- as history (unique index is partial on open-ended validity).
create unique index if not exists world_epf_open_identity_uq
  on public.world_entity_place_facts (entity_table, entity_id, place_id, relation_key)
  where valid_until is null;

-- Read patterns
create index if not exists world_epf_place_idx
  on public.world_entity_place_facts (place_id, relation_key)
  where valid_until is null;
create index if not exists world_epf_entity_idx
  on public.world_entity_place_facts (entity_table, entity_id);
create index if not exists world_epf_public_idx
  on public.world_entity_place_facts (place_id)
  include (entity_kind, entity_id)
  where valid_until is null and visibility = 'public';

alter table public.world_entity_place_facts enable row level security;

-- Deny-by-default: NO policies for anon/authenticated. Projector writes go
-- through the privileged server client (service role bypasses RLS by design,
-- narrowly scoped server-side).

-- Reuse the platform's safe updated_at trigger.
drop trigger if exists world_epf_updated_at on public.world_entity_place_facts;
create trigger world_epf_updated_at
  before update on public.world_entity_place_facts
  for each row execute procedure public.update_updated_at_column();
