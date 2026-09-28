set client_min_messages = warning;

-- ============================================================================
-- Event discovery index (Phase 2)
-- PostGIS-backed, search-optimized projection of canonical events.
-- Additive only. Coordinate rule: POINT(longitude latitude) — never reversed.
-- ============================================================================

create extension if not exists postgis with schema extensions;

create table if not exists public.event_discovery_index (
  event_id uuid primary key references public.events(id) on delete cascade,
  -- Which native table this row was projected from: events | events_v2 | artist_events
  source_table text not null default 'events',
  source_id uuid not null,
  title text not null,
  normalized_title text not null,
  description_excerpt text,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  status text not null default 'published',
  visibility text not null default 'public',
  location extensions.geography(Point, 4326),
  venue_id uuid,
  venue_name text,
  city text,
  state_code text,
  country_code text,
  postal_code text,
  artist_ids uuid[] not null default '{}',
  category_keys text[] not null default '{}',
  genre_keys text[] not null default '{}',
  event_type_keys text[] not null default '{}',
  is_free boolean,
  price_min numeric,
  price_max numeric,
  currency text,
  popularity_score double precision not null default 0,
  quality_score double precision not null default 0,
  source_authority_score double precision not null default 0,
  search_document tsvector,
  indexed_at timestamptz not null default now()
);

create unique index if not exists idx_event_discovery_source
  on public.event_discovery_index (source_table, source_id);

-- Geo + temporal + visibility indexes (created non-concurrently for migration
-- safety; the table is empty at creation time).
create index if not exists idx_event_discovery_location_gist
  on public.event_discovery_index using gist (location);

create index if not exists idx_event_discovery_start_at
  on public.event_discovery_index (start_at);

create index if not exists idx_event_discovery_visibility_status_start
  on public.event_discovery_index (visibility, status, start_at);

create index if not exists idx_event_discovery_upcoming
  on public.event_discovery_index (start_at)
  where visibility = 'public' and status = 'published';

create index if not exists idx_event_discovery_search_gin
  on public.event_discovery_index using gin (search_document);

create index if not exists idx_event_discovery_categories_gin
  on public.event_discovery_index using gin (category_keys);

create index if not exists idx_event_discovery_genres_gin
  on public.event_discovery_index using gin (genre_keys);

create index if not exists idx_event_discovery_artists_gin
  on public.event_discovery_index using gin (artist_ids);

-- ============================================================================
-- Nearby search function (security invoker; reads only the index table,
-- which is RLS-public for upcoming published events).
-- Stable cursor = (distance_meters, start_at, quality_score, event_id) of the
-- last row, encoded by the caller. Organic order:
--   distance ASC, start_at ASC, quality_score DESC, event_id ASC
-- ============================================================================

create or replace function public.event_discovery_nearby(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision default 80467, -- 50 miles
  p_start_after timestamptz default null,
  p_start_before timestamptz default null,
  p_category_keys text[] default null,
  p_genre_keys text[] default null,
  p_is_free boolean default null,
  p_query_text text default null,
  p_cursor_distance double precision default null,
  p_cursor_start_at timestamptz default null,
  p_cursor_event_id uuid default null,
  p_limit integer default 25
)
returns table (
  event_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  status text,
  venue_name text,
  city text,
  state_code text,
  country_code text,
  distance_meters double precision,
  is_free boolean,
  price_min numeric,
  price_max numeric,
  currency text,
  category_keys text[],
  genre_keys text[],
  quality_score double precision
)
language sql
security invoker
stable
set search_path = public, extensions
as $$
  with params as (
    select extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography as q
    -- st_makepoint(x, y) = (longitude, latitude). Do not reorder.
  )
  select
    d.event_id,
    d.title,
    d.start_at,
    d.end_at,
    d.timezone,
    d.status,
    d.venue_name,
    d.city,
    d.state_code,
    d.country_code,
    extensions.st_distance(d.location, params.q) as distance_meters,
    d.is_free,
    d.price_min,
    d.price_max,
    d.currency,
    d.category_keys,
    d.genre_keys,
    d.quality_score
  from public.event_discovery_index d
  cross join params
  where d.visibility = 'public'
    and d.status = 'published'
    and d.location is not null
    and extensions.st_dwithin(d.location, params.q, greatest(p_radius_meters, 0))
    and (p_start_after is null or d.start_at >= p_start_after)
    and (p_start_before is null or d.start_at < p_start_before)
    and (p_category_keys is null or d.category_keys && p_category_keys)
    and (p_genre_keys is null or d.genre_keys && p_genre_keys)
    and (p_is_free is null or d.is_free = p_is_free)
    and (
      p_query_text is null
      or d.search_document @@ plainto_tsquery('english', p_query_text)
      or d.normalized_title ilike '%' || lower(p_query_text) || '%'
    )
    and (
      p_cursor_distance is null
      or (extensions.st_distance(d.location, params.q), d.start_at, d.event_id)
         > (p_cursor_distance, coalesce(p_cursor_start_at, '-infinity'::timestamptz), coalesce(p_cursor_event_id, '00000000-0000-0000-0000-000000000000'::uuid))
    )
  order by
    d.location <-> params.q,
    d.start_at asc,
    d.quality_score desc,
    d.event_id asc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Non-location fallback: upcoming events ordered by start time, same filters.
create or replace function public.event_discovery_upcoming(
  p_start_after timestamptz default null,
  p_start_before timestamptz default null,
  p_category_keys text[] default null,
  p_genre_keys text[] default null,
  p_is_free boolean default null,
  p_query_text text default null,
  p_cursor_start_at timestamptz default null,
  p_cursor_event_id uuid default null,
  p_limit integer default 25
)
returns table (
  event_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  status text,
  venue_name text,
  city text,
  state_code text,
  country_code text,
  distance_meters double precision,
  is_free boolean,
  price_min numeric,
  price_max numeric,
  currency text,
  category_keys text[],
  genre_keys text[],
  quality_score double precision
)
language sql
security invoker
stable
set search_path = public, extensions
as $$
  select
    d.event_id,
    d.title,
    d.start_at,
    d.end_at,
    d.timezone,
    d.status,
    d.venue_name,
    d.city,
    d.state_code,
    d.country_code,
    null::double precision as distance_meters,
    d.is_free,
    d.price_min,
    d.price_max,
    d.currency,
    d.category_keys,
    d.genre_keys,
    d.quality_score
  from public.event_discovery_index d
  where d.visibility = 'public'
    and d.status = 'published'
    and (p_start_after is null or d.start_at >= p_start_after)
    and (p_start_before is null or d.start_at < p_start_before)
    and (p_category_keys is null or d.category_keys && p_category_keys)
    and (p_genre_keys is null or d.genre_keys && p_genre_keys)
    and (p_is_free is null or d.is_free = p_is_free)
    and (
      p_query_text is null
      or d.search_document @@ plainto_tsquery('english', p_query_text)
      or d.normalized_title ilike '%' || lower(p_query_text) || '%'
    )
    and (
      p_cursor_start_at is null
      or (d.start_at, d.event_id)
         > (p_cursor_start_at, coalesce(p_cursor_event_id, '00000000-0000-0000-0000-000000000000'::uuid))
    )
  order by d.start_at asc, d.quality_score desc, d.event_id asc
  limit least(greatest(p_limit, 1), 100)
$$;

-- ============================================================================
-- Saved discovery location (explicit opt-in; precise device location is
-- never stored automatically).
-- ============================================================================

create table if not exists public.user_event_discovery_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  saved_location_label text,
  saved_location extensions.geography(Point, 4326),
  location_precision text not null default 'city'
    check (location_precision in ('exact', 'city', 'region')),
  default_radius_miles integer not null default 25,
  distance_unit text not null default 'mi' check (distance_unit in ('mi', 'km')),
  updated_at timestamptz not null default now()
);

alter table public.user_event_discovery_preferences enable row level security;

drop policy if exists user_discovery_prefs_self on public.user_event_discovery_preferences;
create policy user_discovery_prefs_self
on public.user_event_discovery_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.user_event_discovery_preferences to authenticated;

-- Discovery index: public read only (rows are the public projection).
alter table public.event_discovery_index enable row level security;

drop policy if exists event_discovery_public_read on public.event_discovery_index;
create policy event_discovery_public_read
on public.event_discovery_index
for select
using (visibility = 'public' and status = 'published');

grant select on public.event_discovery_index to anon, authenticated;
grant execute on function public.event_discovery_nearby to anon, authenticated;
grant execute on function public.event_discovery_upcoming to anon, authenticated;

-- Maintain the full-text search document on write.
create or replace function public.event_discovery_index_tsv() returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.search_document :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.venue_name, '')), 'B')
    || setweight(to_tsvector('english', coalesce(new.city, '') || ' ' || coalesce(new.state_code, '')), 'B')
    || setweight(to_tsvector('english', coalesce(new.description_excerpt, '')), 'C');
  return new;
end
$$;

drop trigger if exists trg_event_discovery_tsv on public.event_discovery_index;
create trigger trg_event_discovery_tsv
  before insert or update on public.event_discovery_index
  for each row execute function public.event_discovery_index_tsv();
