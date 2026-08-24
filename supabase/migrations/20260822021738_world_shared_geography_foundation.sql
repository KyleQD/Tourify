-- TOURIFY WORLD OF MUSIC — PHASE 1 MIGRATION BODY
-- Timestamp-neutral handoff artifact. Do not copy this filename into supabase/migrations.
-- Materialize with: supabase migration new <migration_name>
-- Baseline: integration/tourify-reconcile-2026-08 + isolated Supabase validation DB.
-- NEVER apply directly to Tourify Demo without explicit authorization.

-- MIGRATION A — SHARED TOURIFY GEOGRAPHY
-- Suggested migration name: world_shared_geography_foundation
-- ============================================================================

begin;
set local client_min_messages = warning;

-- Supabase recommends installing PostGIS in a dedicated extension schema.
-- No VERSION clause: extension version pinning is deprecated on Supabase.
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- geo_places
-- Canonical geographic identity used by Discover, World of Music, events,
-- venues, search, tours, and future map surfaces. World of Music consumes this
-- table but does not own it.
-- ---------------------------------------------------------------------------
create table if not exists public.geo_places (
  id uuid primary key default gen_random_uuid(),

  -- Local slug is unique among siblings. canonical_path is the stable globally
  -- unique route/search key (examples: 'world', 'ng', 'ng/lagos', 'us/mi/detroit').
  slug text not null,
  canonical_path text not null unique,
  name text not null,
  display_name text,

  place_type text not null
    check (place_type in (
      'world',
      'continent',
      'country',
      'territory',
      'cultural_region',
      'region',
      'state_province',
      'city',
      'neighborhood',
      'landmark'
    )),

  parent_place_id uuid references public.geo_places(id) on delete set null,

  -- ISO-3166-1 alpha-2 where applicable. Cultural/transnational regions may be null.
  country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  admin1_code text,
  timezone text,
  primary_language_codes text[] not null default '{}'::text[],

  -- POINT(longitude latitude), SRID 4326. Never reverse coordinate order.
  center extensions.geography(Point, 4326),

  metadata jsonb not null default '{}'::jsonb,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),

  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(canonical_path, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(country_code, '') || ' ' || coalesce(admin1_code, '')), 'C')
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint geo_places_parent_not_self check (parent_place_id is null or parent_place_id <> id),
  constraint geo_places_slug_nonempty check (length(btrim(slug)) > 0),
  constraint geo_places_path_nonempty check (length(btrim(canonical_path)) > 0),
  constraint geo_places_name_nonempty check (length(btrim(name)) > 0),

  -- PostgreSQL 15: NULLS NOT DISTINCT prevents duplicate root slugs while still
  -- allowing the same city slug under different parents.
  unique nulls not distinct (parent_place_id, slug)
);

create index if not exists geo_places_parent_idx
  on public.geo_places (parent_place_id);
create index if not exists geo_places_type_country_idx
  on public.geo_places (place_type, country_code);
create index if not exists geo_places_public_type_idx
  on public.geo_places (place_type, canonical_path)
  where publication_status = 'published';
create index if not exists geo_places_center_gist
  on public.geo_places using gist (center)
  where center is not null;
create index if not exists geo_places_search_gin
  on public.geo_places using gin (search_document);

-- ---------------------------------------------------------------------------
-- geo_external_references
-- Stable identity crosswalk to Wikidata/MusicBrainz/Who's On First/etc.
-- ---------------------------------------------------------------------------
create table if not exists public.geo_external_references (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.geo_places(id) on delete cascade,
  provider text not null,
  external_type text not null default 'place',
  external_id text not null,
  canonical_url text,
  attribution_text text,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint geo_external_references_provider_nonempty check (length(btrim(provider)) > 0),
  constraint geo_external_references_type_nonempty check (length(btrim(external_type)) > 0),
  constraint geo_external_references_id_nonempty check (length(btrim(external_id)) > 0),
  unique (provider, external_type, external_id)
);

create index if not exists geo_external_references_place_idx
  on public.geo_external_references (place_id);
create index if not exists geo_external_references_place_provider_idx
  on public.geo_external_references (place_id, provider);

-- ---------------------------------------------------------------------------
-- geo_place_aliases
-- Multilingual, historical, abbreviated, and search aliases.
-- ---------------------------------------------------------------------------
create table if not exists public.geo_place_aliases (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.geo_places(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (lower(btrim(alias))) stored,
  language_code text,
  alias_type text not null default 'alternate'
    check (alias_type in ('alternate', 'local', 'historical', 'abbreviation', 'search')),
  source_external_reference_id uuid
    references public.geo_external_references(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint geo_place_aliases_nonempty check (length(btrim(alias)) > 0)
);

create unique index if not exists geo_place_aliases_unique_idx
  on public.geo_place_aliases (
    place_id,
    normalized_alias,
    coalesce(language_code, ''),
    alias_type
  );
create index if not exists geo_place_aliases_normalized_idx
  on public.geo_place_aliases (normalized_alias);
-- pg_trgm is already active in Tourify's reconciled migration chain.
create index if not exists geo_place_aliases_trgm_idx
  on public.geo_place_aliases using gin (normalized_alias extensions.gin_trgm_ops);

-- Existing safe shared updated_at helper. Do not create another public
-- SECURITY DEFINER trigger function for this package.
drop trigger if exists geo_places_updated_at on public.geo_places;
create trigger geo_places_updated_at
  before update on public.geo_places
  for each row execute function public.update_updated_at_column();

drop trigger if exists geo_external_references_updated_at on public.geo_external_references;
create trigger geo_external_references_updated_at
  before update on public.geo_external_references
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS / GRANTS — public identity is read-only in v0.1.
-- ---------------------------------------------------------------------------
alter table public.geo_places enable row level security;
alter table public.geo_external_references enable row level security;
alter table public.geo_place_aliases enable row level security;

-- Remove any broad default privileges before adding minimum intended access.
revoke all on table public.geo_places from anon, authenticated;
revoke all on table public.geo_external_references from anon, authenticated;
revoke all on table public.geo_place_aliases from anon, authenticated;

-- Server-side application/ingestion access.
grant select, insert, update, delete on table public.geo_places to service_role;
grant select, insert, update, delete on table public.geo_external_references to service_role;
grant select, insert, update, delete on table public.geo_place_aliases to service_role;

-- Public/read-only access. RLS still determines which rows are visible.
grant select on table public.geo_places to anon, authenticated;
grant select on table public.geo_external_references to anon, authenticated;
grant select on table public.geo_place_aliases to anon, authenticated;

drop policy if exists geo_places_public_read on public.geo_places;
create policy geo_places_public_read
  on public.geo_places
  for select
  to anon, authenticated
  using (publication_status = 'published');

drop policy if exists geo_external_references_public_read on public.geo_external_references;
create policy geo_external_references_public_read
  on public.geo_external_references
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.geo_places p
      where p.id = geo_external_references.place_id
        and p.publication_status = 'published'
    )
  );

drop policy if exists geo_place_aliases_public_read on public.geo_place_aliases;
create policy geo_place_aliases_public_read
  on public.geo_place_aliases
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.geo_places p
      where p.id = geo_place_aliases.place_id
        and p.publication_status = 'published'
    )
  );

commit;
