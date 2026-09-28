-- TOURIFY WORLD OF MUSIC — PHASE 1 MIGRATION BODY
-- Timestamp-neutral handoff artifact. Do not copy this filename into supabase/migrations.
-- Materialize with: supabase migration new <migration_name>
-- Baseline: integration/tourify-reconcile-2026-08 + isolated Supabase validation DB.
-- NEVER apply directly to Tourify Demo without explicit authorization.

-- MIGRATION B — WORLD KNOWLEDGE + MEDIA CORE
-- Suggested migration name: world_music_knowledge_media_foundation
-- Dependency: Migration A
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- world_sources
-- Rights/provenance registry. This table describes what Tourify is allowed to
-- ingest/present; it is not a place to store copied source articles.
-- ---------------------------------------------------------------------------
create table if not exists public.world_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  source_type text not null
    check (source_type in (
      'music_metadata', 'geographic_metadata', 'archive', 'museum',
      'academic', 'cultural_institution', 'radio_directory', 'chart_provider',
      'partner', 'editorial', 'community', 'other'
    )),
  homepage_url text,
  terms_url text,
  license_class text not null default 'unknown'
    check (license_class in (
      'cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'open_data',
      'proprietary', 'partner', 'mixed', 'unknown'
    )),
  attribution_requirements text,
  ingestion_permission text not null default 'unknown'
    check (ingestion_permission in (
      'allowed', 'metadata_only', 'partner_only', 'manual_reference',
      'prohibited', 'unknown'
    )),
  media_reuse_permission text not null default 'unknown'
    check (media_reuse_permission in (
      'allowed', 'attribution_required', 'link_only', 'restricted', 'unknown'
    )),
  commercial_use_permission text not null default 'unknown'
    check (commercial_use_permission in ('allowed', 'conditional', 'prohibited', 'unknown')),
  is_active boolean not null default true,
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'reviewed', 'restricted', 'retired')),
  terms_last_reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_sources_key_nonempty check (length(btrim(source_key)) > 0),
  constraint world_sources_name_nonempty check (length(btrim(name)) > 0)
);

-- ---------------------------------------------------------------------------
-- world_relation_types
-- Controlled vocabulary for graph edges. New relationship types can be added
-- without altering every bridge-table CHECK constraint.
-- ---------------------------------------------------------------------------
create table if not exists public.world_relation_types (
  id uuid primary key default gen_random_uuid(),
  domain text not null
    check (domain in ('artist_place', 'track_place', 'cultural_place', 'cultural_graph', 'radio_place')),
  relation_key text not null,
  label text not null,
  description text,
  inverse_relation_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (domain, relation_key),
  unique (id, domain),
  constraint world_relation_types_key_nonempty check (length(btrim(relation_key)) > 0)
);

-- ---------------------------------------------------------------------------
-- world_cultural_entities
-- Instruments, genres, scenes, traditions, movements, milestones, recording references, sound signatures, etc.
-- ---------------------------------------------------------------------------
create table if not exists public.world_cultural_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in (
      'instrument', 'genre', 'scene', 'movement', 'tradition',
      'historical_milestone', 'studio_landmark', 'educational_topic',
      'recording_reference', 'sound_signature', 'artist_reference'
    )),
  slug text not null unique,
  canonical_name text not null,
  short_description text,
  start_year integer,
  end_year integer,
  metadata jsonb not null default '{}'::jsonb,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_by uuid references auth.users(id) on delete set null,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(canonical_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(entity_type, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(short_description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_cultural_entities_year_range check (
    start_year is null or end_year is null or start_year <= end_year
  ),
  constraint world_cultural_entities_name_nonempty check (length(btrim(canonical_name)) > 0)
);

create index if not exists world_cultural_entities_type_status_idx
  on public.world_cultural_entities (entity_type, publication_status, review_status);
create index if not exists world_cultural_entities_search_gin
  on public.world_cultural_entities using gin (search_document);

-- ---------------------------------------------------------------------------
-- world_radio_stations
-- Public station identity/metadata. Raw stream endpoints live separately.
-- ---------------------------------------------------------------------------
create table if not exists public.world_radio_stations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  homepage_url text,
  directory_provider text,
  directory_external_id text,
  languages text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  genres text[] not null default '{}'::text[],
  rights_status text not null default 'unknown'
    check (rights_status in (
      'unknown', 'directory_listed', 'embedding_allowed', 'partner',
      'licensed', 'restricted'
    )),
  playback_status text not null default 'metadata_only'
    check (playback_status in ('metadata_only', 'playable', 'restricted', 'unavailable')),
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  last_metadata_check_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  -- Keep generated search expressions immutable. Tags/genres are indexed
  -- separately with GIN array indexes because array_to_string() is STABLE.
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_radio_stations_name_nonempty check (length(btrim(name)) > 0)
);

create unique index if not exists world_radio_stations_provider_external_unique
  on public.world_radio_stations (directory_provider, directory_external_id)
  where directory_provider is not null and directory_external_id is not null;
create index if not exists world_radio_stations_public_idx
  on public.world_radio_stations (publication_status, review_status, playback_status);
create index if not exists world_radio_stations_search_gin
  on public.world_radio_stations using gin (search_document);
create index if not exists world_radio_stations_tags_gin
  on public.world_radio_stations using gin (tags);
create index if not exists world_radio_stations_genres_gin
  on public.world_radio_stations using gin (genres);

-- ---------------------------------------------------------------------------
-- world_media_assets
-- Public identity/attribution for non-track audio used by World of Music.
-- Actual playback locations/resolver references live in world_media_sources.
-- ---------------------------------------------------------------------------
create table if not exists public.world_media_assets (
  id uuid primary key default gen_random_uuid(),
  media_kind text not null
    check (media_kind in ('sound_guide', 'archive_audio', 'narration')),
  slug text not null unique,
  title text not null,
  creator_name text,
  cultural_entity_id uuid references public.world_cultural_entities(id) on delete set null,
  primary_place_id uuid references public.geo_places(id) on delete set null,
  source_id uuid references public.world_sources(id) on delete set null,
  external_record_id text,
  canonical_url text,
  provider text,
  external_media_id text,
  attribution_text text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  rights_status text not null default 'unknown'
    check (rights_status in (
      'unknown', 'owned', 'public_domain', 'cc_licensed', 'partner',
      'licensed', 'link_only', 'restricted'
    )),
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_media_assets_title_nonempty check (length(btrim(title)) > 0)
);

create index if not exists world_media_assets_entity_idx
  on public.world_media_assets (cultural_entity_id, media_kind);
create index if not exists world_media_assets_place_idx
  on public.world_media_assets (primary_place_id, media_kind);
create index if not exists world_media_assets_public_idx
  on public.world_media_assets (publication_status, review_status, media_kind);

-- ---------------------------------------------------------------------------
-- world_claims
-- Durable assertions that may be presented by UI/AI only after evidence/review.
-- Polymorphic subject/object IDs are text so future approved external identities
-- can be represented before every source is imported into an operational table.
-- FK-backed bridge tables below preserve referential integrity for core edges.
-- ---------------------------------------------------------------------------
create table if not exists public.world_claims (
  id uuid primary key default gen_random_uuid(),
  claim_type text not null default 'relationship'
    check (claim_type in ('relationship', 'fact', 'summary', 'classification')),
  subject_kind text not null
    check (subject_kind in (
      'place', 'artist', 'track', 'cultural_entity', 'radio_station',
      'media_asset', 'event', 'venue'
    )),
  subject_id text not null,
  predicate text not null,
  object_kind text
    check (object_kind is null or object_kind in (
      'place', 'artist', 'track', 'cultural_entity', 'radio_station',
      'media_asset', 'event', 'venue'
    )),
  object_id text,
  literal_value jsonb,
  temporal_start_year integer,
  temporal_end_year integer,
  confidence numeric(4,3) not null default 0.500
    check (confidence >= 0 and confidence <= 1),
  origin_type text not null
    check (origin_type in ('partner', 'editor', 'community', 'import', 'agent_candidate')),
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_claims_object_shape check (
    (object_id is not null and object_kind is not null and literal_value is null)
    or
    (object_id is null and object_kind is null and literal_value is not null)
  ),
  constraint world_claims_year_range check (
    temporal_start_year is null or temporal_end_year is null or temporal_start_year <= temporal_end_year
  ),
  constraint world_claims_subject_nonempty check (length(btrim(subject_id)) > 0),
  constraint world_claims_predicate_nonempty check (length(btrim(predicate)) > 0)
);

create index if not exists world_claims_subject_idx
  on public.world_claims (subject_kind, subject_id, review_status, publication_status);
create index if not exists world_claims_object_idx
  on public.world_claims (object_kind, object_id)
  where object_id is not null;
create index if not exists world_claims_review_idx
  on public.world_claims (review_status, publication_status, created_at desc);

-- ---------------------------------------------------------------------------
-- world_claim_evidence
-- Internal evidence ledger. No direct anon/authenticated grants in v0.1.
-- Public provenance is projected by reviewed APIs from safe fields.
-- ---------------------------------------------------------------------------
create table if not exists public.world_claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.world_claims(id) on delete cascade,
  source_id uuid not null references public.world_sources(id) on delete restrict,
  external_record_id text,
  source_url text,
  retrieved_at timestamptz not null default now(),
  rights_snapshot jsonb not null default '{}'::jsonb,
  evidence_notes text,
  evidence_fingerprint text,
  evidence_status text not null default 'supporting'
    check (evidence_status in ('supporting', 'contradicting', 'context', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists world_claim_evidence_claim_idx
  on public.world_claim_evidence (claim_id, evidence_status);
create index if not exists world_claim_evidence_source_idx
  on public.world_claim_evidence (source_id, retrieved_at desc);

-- ---------------------------------------------------------------------------
-- Durable FK-backed World graph edges.
-- Published edges require a claim ID; candidates may exist before verification.
-- ---------------------------------------------------------------------------
create table if not exists public.world_artist_places (
  id uuid primary key default gen_random_uuid(),
  artist_profile_id uuid not null references public.artist_profiles(id) on delete cascade,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  relation_type_id uuid not null,
  relation_domain text not null default 'artist_place'
    check (relation_domain = 'artist_place'),
  start_year integer,
  end_year integer,
  claim_id uuid references public.world_claims(id) on delete set null,
  is_primary boolean not null default false,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_artist_places_relation_type_fk
    foreign key (relation_type_id, relation_domain)
    references public.world_relation_types(id, domain) on delete restrict,
  constraint world_artist_places_year_range check (start_year is null or end_year is null or start_year <= end_year),
  constraint world_artist_places_published_claim check (publication_status <> 'published' or claim_id is not null)
);

create unique index if not exists world_artist_places_unique_idx
  on public.world_artist_places (artist_profile_id, place_id, relation_type_id, coalesce(start_year, -2147483648));
create index if not exists world_artist_places_place_idx
  on public.world_artist_places (place_id, relation_type_id, publication_status, review_status);

create table if not exists public.world_track_places (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  relation_type_id uuid not null,
  relation_domain text not null default 'track_place'
    check (relation_domain = 'track_place'),
  start_year integer,
  end_year integer,
  claim_id uuid references public.world_claims(id) on delete set null,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_track_places_relation_type_fk
    foreign key (relation_type_id, relation_domain)
    references public.world_relation_types(id, domain) on delete restrict,
  constraint world_track_places_year_range check (start_year is null or end_year is null or start_year <= end_year),
  constraint world_track_places_published_claim check (publication_status <> 'published' or claim_id is not null)
);

create unique index if not exists world_track_places_unique_idx
  on public.world_track_places (track_id, place_id, relation_type_id, coalesce(start_year, -2147483648));
create index if not exists world_track_places_place_idx
  on public.world_track_places (place_id, relation_type_id, publication_status, review_status);

create table if not exists public.world_cultural_entity_places (
  id uuid primary key default gen_random_uuid(),
  cultural_entity_id uuid not null references public.world_cultural_entities(id) on delete cascade,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  relation_type_id uuid not null,
  relation_domain text not null default 'cultural_place'
    check (relation_domain = 'cultural_place'),
  start_year integer,
  end_year integer,
  claim_id uuid references public.world_claims(id) on delete set null,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_cultural_entity_places_relation_type_fk
    foreign key (relation_type_id, relation_domain)
    references public.world_relation_types(id, domain) on delete restrict,
  constraint world_cultural_entity_places_year_range check (start_year is null or end_year is null or start_year <= end_year),
  constraint world_cultural_entity_places_published_claim check (publication_status <> 'published' or claim_id is not null)
);

create unique index if not exists world_cultural_entity_places_unique_idx
  on public.world_cultural_entity_places (cultural_entity_id, place_id, relation_type_id, coalesce(start_year, -2147483648));
create index if not exists world_cultural_entity_places_place_idx
  on public.world_cultural_entity_places (place_id, relation_type_id, publication_status, review_status);

create table if not exists public.world_cultural_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references public.world_cultural_entities(id) on delete cascade,
  relation_type_id uuid not null,
  relation_domain text not null default 'cultural_graph'
    check (relation_domain = 'cultural_graph'),
  object_entity_id uuid not null references public.world_cultural_entities(id) on delete cascade,
  start_year integer,
  end_year integer,
  claim_id uuid references public.world_claims(id) on delete set null,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_cultural_relationships_relation_type_fk
    foreign key (relation_type_id, relation_domain)
    references public.world_relation_types(id, domain) on delete restrict,
  constraint world_cultural_relationships_not_self check (subject_entity_id <> object_entity_id),
  constraint world_cultural_relationships_year_range check (start_year is null or end_year is null or start_year <= end_year),
  constraint world_cultural_relationships_published_claim check (publication_status <> 'published' or claim_id is not null)
);

create unique index if not exists world_cultural_relationships_unique_idx
  on public.world_cultural_relationships (
    subject_entity_id,
    relation_type_id,
    object_entity_id,
    coalesce(start_year, -2147483648)
  );
create index if not exists world_cultural_relationships_object_idx
  on public.world_cultural_relationships (object_entity_id, relation_type_id, publication_status, review_status);

-- ---------------------------------------------------------------------------
-- Radio geography + private stream resolution.
-- ---------------------------------------------------------------------------
create table if not exists public.world_radio_station_places (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.world_radio_stations(id) on delete cascade,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  relation_type_id uuid not null,
  relation_domain text not null default 'radio_place'
    check (relation_domain = 'radio_place'),
  claim_id uuid references public.world_claims(id) on delete set null,
  review_status text not null default 'candidate'
    check (review_status in ('candidate', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_radio_station_places_relation_type_fk
    foreign key (relation_type_id, relation_domain)
    references public.world_relation_types(id, domain) on delete restrict,
  constraint world_radio_station_places_published_claim check (publication_status <> 'published' or claim_id is not null),
  unique (station_id, place_id, relation_type_id)
);

create index if not exists world_radio_station_places_place_idx
  on public.world_radio_station_places (place_id, relation_type_id, publication_status, review_status);

create table if not exists public.world_radio_streams (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.world_radio_stations(id) on delete cascade,
  provider text,
  endpoint_kind text not null
    check (endpoint_kind in ('direct_url', 'hls', 'provider_resolver')),
  stream_url text,
  resolver_reference text,
  codec text,
  bitrate_kbps integer check (bitrate_kbps is null or bitrate_kbps >= 0),
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'unavailable')),
  rights_class text not null default 'unknown'
    check (rights_class in (
      'unknown', 'embed_allowed', 'direct_stream_allowed', 'partner',
      'licensed', 'restricted'
    )),
  availability_status text not null default 'unknown'
    check (availability_status in ('unknown', 'available', 'unavailable', 'blocked')),
  territory_rules jsonb not null default '{}'::jsonb,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_radio_streams_source_shape check (
    (
      endpoint_kind in ('direct_url', 'hls')
      and stream_url is not null
      and length(btrim(stream_url)) > 0
      and resolver_reference is null
    )
    or
    (
      endpoint_kind = 'provider_resolver'
      and resolver_reference is not null
      and length(btrim(resolver_reference)) > 0
      and stream_url is null
    )
  )
);

create index if not exists world_radio_streams_station_health_idx
  on public.world_radio_streams (station_id, health_status, availability_status);

-- ---------------------------------------------------------------------------
-- Private playback locations for sound guides/archive audio/narration.
-- ---------------------------------------------------------------------------
create table if not exists public.world_media_sources (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.world_media_assets(id) on delete cascade,
  source_type text not null
    check (source_type in ('storage', 'provider_proxy', 'direct_url', 'external_redirect')),
  storage_bucket text,
  storage_path text,
  external_url text,
  resolver_reference text,
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'unavailable')),
  territory_rules jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_media_sources_locator_shape check (
    (
      source_type = 'storage'
      and storage_bucket is not null and length(btrim(storage_bucket)) > 0
      and storage_path is not null and length(btrim(storage_path)) > 0
      and external_url is null
      and resolver_reference is null
    )
    or
    (
      source_type = 'provider_proxy'
      and resolver_reference is not null and length(btrim(resolver_reference)) > 0
      and storage_bucket is null
      and storage_path is null
      and external_url is null
    )
    or
    (
      source_type in ('direct_url', 'external_redirect')
      and external_url is not null and length(btrim(external_url)) > 0
      and storage_bucket is null
      and storage_path is null
      and resolver_reference is null
    )
  )
);

create index if not exists world_media_sources_asset_health_idx
  on public.world_media_sources (media_asset_id, health_status);

-- ---------------------------------------------------------------------------
-- Time-windowed geographic signals. Never store precise per-user coordinates.
-- subject_id is text so signals can reference canonical UUIDs or approved
-- external identities before catalog import.
-- ---------------------------------------------------------------------------
create table if not exists public.world_geo_signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  place_id uuid not null references public.geo_places(id) on delete cascade,
  subject_kind text not null
    check (subject_kind in ('artist', 'track', 'cultural_entity', 'radio_station', 'event', 'venue', 'genre')),
  subject_id text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  score double precision not null,
  sample_size integer not null default 0 check (sample_size >= 0),
  privacy_class text not null default 'public_source'
    check (privacy_class in ('aggregate_user', 'public_source', 'non_user')),
  privacy_threshold integer not null default 10 check (privacy_threshold >= 0),
  source_id uuid references public.world_sources(id) on delete set null,
  source_type text,
  methodology_version text not null,
  visibility text not null default 'internal'
    check (visibility in ('internal', 'public')),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint world_geo_signals_window check (window_start < window_end),
  constraint world_geo_signals_subject_nonempty check (length(btrim(subject_id)) > 0),
  constraint world_geo_signals_aggregate_privacy_floor check (
    privacy_class <> 'aggregate_user' or privacy_threshold >= 10
  )
);

create index if not exists world_geo_signals_place_window_idx
  on public.world_geo_signals (place_id, signal_type, window_start desc, window_end desc);
create index if not exists world_geo_signals_subject_idx
  on public.world_geo_signals (subject_kind, subject_id, window_start desc);
create index if not exists world_geo_signals_public_idx
  on public.world_geo_signals (place_id, signal_type, score desc)
  where visibility = 'public';

-- ---------------------------------------------------------------------------
-- updated_at triggers — reuse existing shared safe helper.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'world_sources',
    'world_cultural_entities',
    'world_radio_stations',
    'world_media_assets',
    'world_claims',
    'world_artist_places',
    'world_track_places',
    'world_cultural_entity_places',
    'world_cultural_relationships',
    'world_radio_station_places',
    'world_radio_streams',
    'world_media_sources'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.update_updated_at_column()',
      t,
      t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Seed controlled relationship vocabulary. Idempotent and non-destructive.
-- ---------------------------------------------------------------------------
insert into public.world_relation_types (domain, relation_key, label, description)
values
  ('artist_place', 'born_in', 'Born in', 'Artist/person was born in this place.'),
  ('artist_place', 'formed_in', 'Formed in', 'Artist/group formed in this place.'),
  ('artist_place', 'originated_in', 'Originated in', 'Artist identity or project originated in this place.'),
  ('artist_place', 'based_in', 'Based in', 'Artist is or was based in this place.'),
  ('artist_place', 'active_in', 'Active in', 'Artist has meaningful activity in this place.'),
  ('artist_place', 'associated_with', 'Associated with', 'Artist has a sourced association with this place.'),

  ('track_place', 'written_in', 'Written in', 'Track/work was written in this place.'),
  ('track_place', 'recorded_in', 'Recorded in', 'Track/recording was recorded in this place.'),
  ('track_place', 'produced_in', 'Produced in', 'Track/recording was produced in this place.'),
  ('track_place', 'released_from', 'Released from', 'Track/release has a sourced release-origin association with this place.'),
  ('track_place', 'associated_with', 'Associated with', 'Track has a sourced association with this place.'),

  ('cultural_place', 'originated_in', 'Originated in', 'Cultural entity originated in this place.'),
  ('cultural_place', 'developed_in', 'Developed in', 'Cultural entity developed in this place.'),
  ('cultural_place', 'practiced_in', 'Practiced in', 'Tradition/style/instrument is practiced in this place.'),
  ('cultural_place', 'historically_significant_in', 'Historically significant in', 'Place is historically significant to the entity.'),
  ('cultural_place', 'associated_with', 'Associated with', 'Cultural entity has a sourced association with this place.'),

  ('cultural_graph', 'evolved_from', 'Evolved from', 'Subject evolved from the object.'),
  ('cultural_graph', 'influenced_by', 'Influenced by', 'Subject was influenced by the object.'),
  ('cultural_graph', 'uses_instrument', 'Uses instrument', 'Subject commonly or historically uses the object instrument.'),
  ('cultural_graph', 'related_to', 'Related to', 'Subject and object have a sourced cultural relationship.'),
  ('cultural_graph', 'part_of', 'Part of', 'Subject is part of a broader cultural entity.'),
  ('cultural_graph', 'credited_to', 'Credited to', 'Recording/reference is credited to an external artist-reference identity; role details may live in relationship metadata.'),

  ('radio_place', 'broadcasts_from', 'Broadcasts from', 'Station broadcasts from this place.'),
  ('radio_place', 'serves', 'Serves', 'Station primarily serves this place.'),
  ('radio_place', 'associated_with', 'Associated with', 'Station has a sourced association with this place.')
on conflict (domain, relation_key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed World feature flags OFF. Never overwrite an existing operator decision.
-- ---------------------------------------------------------------------------
insert into public.feature_flags (
  key,
  name,
  description,
  enabled,
  rollout_percentage,
  target_org_ids,
  created_at,
  updated_at
)
values
  (
    'world_music_enabled',
    'World of Music foundation',
    'Master gate for World of Music server/API foundation.',
    false, 0, null, now(), now()
  ),
  (
    'world_music_internal_explorer_enabled',
    'World of Music internal explorer',
    'Internal-only World data exploration and review surfaces.',
    false, 0, null, now(), now()
  ),
  (
    'world_music_ingestion_enabled',
    'World of Music ingestion',
    'Enables approved World source ingestion workers and staging.',
    false, 0, null, now(), now()
  ),
  (
    'world_music_radio_enabled',
    'World of Music radio playback',
    'Enables reviewed radio discovery/playback resolution.',
    false, 0, null, now(), now()
  ),
  (
    'world_music_public_globe_enabled',
    'World of Music public globe',
    'Enables the public Discover globe experience.',
    false, 0, null, now(), now()
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS enablement
-- ---------------------------------------------------------------------------
alter table public.world_sources enable row level security;
alter table public.world_relation_types enable row level security;
alter table public.world_cultural_entities enable row level security;
alter table public.world_radio_stations enable row level security;
alter table public.world_media_assets enable row level security;
alter table public.world_claims enable row level security;
alter table public.world_claim_evidence enable row level security;
alter table public.world_artist_places enable row level security;
alter table public.world_track_places enable row level security;
alter table public.world_cultural_entity_places enable row level security;
alter table public.world_cultural_relationships enable row level security;
alter table public.world_radio_station_places enable row level security;
alter table public.world_radio_streams enable row level security;
alter table public.world_media_sources enable row level security;
alter table public.world_geo_signals enable row level security;

-- Start from zero client privileges regardless of current project default grants.
revoke all on table public.world_sources from anon, authenticated;
revoke all on table public.world_relation_types from anon, authenticated;
revoke all on table public.world_cultural_entities from anon, authenticated;
revoke all on table public.world_radio_stations from anon, authenticated;
revoke all on table public.world_media_assets from anon, authenticated;
revoke all on table public.world_claims from anon, authenticated;
revoke all on table public.world_claim_evidence from anon, authenticated;
revoke all on table public.world_artist_places from anon, authenticated;
revoke all on table public.world_track_places from anon, authenticated;
revoke all on table public.world_cultural_entity_places from anon, authenticated;
revoke all on table public.world_cultural_relationships from anon, authenticated;
revoke all on table public.world_radio_station_places from anon, authenticated;
revoke all on table public.world_radio_streams from anon, authenticated;
revoke all on table public.world_media_sources from anon, authenticated;
revoke all on table public.world_geo_signals from anon, authenticated;

-- Service-role CRUD for server-only ingest/review/playback APIs.
grant select, insert, update, delete on table public.world_sources to service_role;
grant select, insert, update, delete on table public.world_relation_types to service_role;
grant select, insert, update, delete on table public.world_cultural_entities to service_role;
grant select, insert, update, delete on table public.world_radio_stations to service_role;
grant select, insert, update, delete on table public.world_media_assets to service_role;
grant select, insert, update, delete on table public.world_claims to service_role;
grant select, insert, update, delete on table public.world_claim_evidence to service_role;
grant select, insert, update, delete on table public.world_artist_places to service_role;
grant select, insert, update, delete on table public.world_track_places to service_role;
grant select, insert, update, delete on table public.world_cultural_entity_places to service_role;
grant select, insert, update, delete on table public.world_cultural_relationships to service_role;
grant select, insert, update, delete on table public.world_radio_station_places to service_role;
grant select, insert, update, delete on table public.world_radio_streams to service_role;
grant select, insert, update, delete on table public.world_media_sources to service_role;
grant select, insert, update, delete on table public.world_geo_signals to service_role;

-- Public metadata/knowledge: read only, then constrained by RLS.
grant select on table public.world_sources to anon, authenticated;
grant select on table public.world_relation_types to anon, authenticated;
grant select on table public.world_cultural_entities to anon, authenticated;
grant select on table public.world_radio_stations to anon, authenticated;
grant select on table public.world_media_assets to anon, authenticated;
grant select on table public.world_claims to anon, authenticated;
grant select on table public.world_artist_places to anon, authenticated;
grant select on table public.world_track_places to anon, authenticated;
grant select on table public.world_cultural_entity_places to anon, authenticated;
grant select on table public.world_cultural_relationships to anon, authenticated;
grant select on table public.world_radio_station_places to anon, authenticated;
grant select on table public.world_geo_signals to anon, authenticated;

-- Intentionally NO anon/authenticated grants for:
--   world_claim_evidence
--   world_radio_streams
--   world_media_sources

-- ---------------------------------------------------------------------------
-- Public-read policies
-- ---------------------------------------------------------------------------
drop policy if exists world_sources_public_read on public.world_sources;
create policy world_sources_public_read
  on public.world_sources
  for select
  to anon, authenticated
  using (is_active = true and review_status in ('reviewed', 'restricted'));

drop policy if exists world_relation_types_public_read on public.world_relation_types;
create policy world_relation_types_public_read
  on public.world_relation_types
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists world_cultural_entities_public_read on public.world_cultural_entities;
create policy world_cultural_entities_public_read
  on public.world_cultural_entities
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_radio_stations_public_read on public.world_radio_stations;
create policy world_radio_stations_public_read
  on public.world_radio_stations
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_media_assets_public_read on public.world_media_assets;
create policy world_media_assets_public_read
  on public.world_media_assets
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_claims_public_read on public.world_claims;
create policy world_claims_public_read
  on public.world_claims
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_artist_places_public_read on public.world_artist_places;
create policy world_artist_places_public_read
  on public.world_artist_places
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_track_places_public_read on public.world_track_places;
create policy world_track_places_public_read
  on public.world_track_places
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_cultural_entity_places_public_read on public.world_cultural_entity_places;
create policy world_cultural_entity_places_public_read
  on public.world_cultural_entity_places
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_cultural_relationships_public_read on public.world_cultural_relationships;
create policy world_cultural_relationships_public_read
  on public.world_cultural_relationships
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_radio_station_places_public_read on public.world_radio_station_places;
create policy world_radio_station_places_public_read
  on public.world_radio_station_places
  for select
  to anon, authenticated
  using (publication_status = 'published' and review_status = 'verified');

drop policy if exists world_geo_signals_public_read on public.world_geo_signals;
create policy world_geo_signals_public_read
  on public.world_geo_signals
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and (
      privacy_class <> 'aggregate_user'
      or sample_size >= greatest(privacy_threshold, 10)
    )
  );

-- Internal tables deliberately receive no anon/authenticated RLS policy.

commit;
