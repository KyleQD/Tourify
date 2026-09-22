-- Unified public search candidates. Keep ranking and viewer affinity in the
-- request-scoped application service; these columns only accelerate retrieval.
create extension if not exists pg_trgm with schema extensions;

alter table if exists public.profiles
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(full_name, coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(bio, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(location, '')), 'C')
  ) stored;
create index if not exists profiles_public_global_search_gin
  on public.profiles using gin (global_search_vector)
  where public_profile is distinct from false;

alter table if exists public.artist_profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table if exists public.artist_profiles
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(artist_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(url_slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(bio, '')), 'B')
  ) stored;
create index if not exists artist_profiles_public_global_search_gin
  on public.artist_profiles using gin (global_search_vector)
  where coalesce(settings ->> 'visibility', 'public') = 'public';

alter table if exists public.venue_profiles
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(venue_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(url_slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(country, '')), 'C')
  ) stored;
create index if not exists venue_profiles_public_global_search_gin
  on public.venue_profiles using gin (global_search_vector)
  where is_public is distinct from false;

alter table if exists public.organizer_accounts
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(organization_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(url_slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;
create index if not exists organizer_accounts_public_global_search_gin
  on public.organizer_accounts using gin (global_search_vector)
  where is_public = true and is_active = true;

alter table if exists public.events
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(venue_name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(genre, '')), 'C')
  ) stored;
create index if not exists events_public_global_search_gin
  on public.events using gin (global_search_vector)
  where status = 'published' and is_public is distinct from false
    and coalesce(producer_settings ->> 'visibility', 'public') = 'public';
create index if not exists events_public_title_trgm
  on public.events using gin (title extensions.gin_trgm_ops)
  where status = 'published' and is_public is distinct from false;

alter table if exists public.events_v2
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(settings ->> 'description', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(settings ->> 'venue_label', '') || ' ' || coalesce(settings ->> 'venue_name', '') || ' ' || coalesce(settings ->> 'venue_city', '') || ' ' || coalesce(settings ->> 'venue_state', '')), 'C')
  ) stored;
create index if not exists events_v2_public_global_search_gin
  on public.events_v2 using gin (global_search_vector)
  where status in ('confirmed', 'advancing', 'onsite')
    and coalesce(settings ->> 'is_public', 'true') <> 'false'
    and coalesce(settings ->> 'visibility', 'public') = 'public';
create index if not exists events_v2_public_title_trgm
  on public.events_v2 using gin (title extensions.gin_trgm_ops)
  where status in ('confirmed', 'advancing', 'onsite');

alter table if exists public.artist_events
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(venue_name, '') || ' ' || coalesce(venue_city, '') || ' ' || coalesce(venue_state, '')), 'C')
  ) stored;
create index if not exists artist_events_public_global_search_gin
  on public.artist_events using gin (global_search_vector)
  where status = 'published' and is_public is distinct from false;
create index if not exists artist_events_public_title_trgm
  on public.artist_events using gin (title extensions.gin_trgm_ops)
  where status = 'published' and is_public is distinct from false;

alter table if exists public.tours
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;
create index if not exists tours_public_global_search_gin
  on public.tours using gin (global_search_vector)
  where status = 'active' and slug is not null;
create index if not exists tours_public_name_trgm
  on public.tours using gin (name extensions.gin_trgm_ops)
  where status = 'active' and slug is not null;

alter table if exists public.artist_music
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(type, '') || ' ' || coalesce(genre, '')), 'C')
  ) stored;
create index if not exists artist_music_public_global_search_gin
  on public.artist_music using gin (global_search_vector)
  where is_public = true and is_visible = true and rights_confirmed = true
    and moderation_status = 'approved';
create index if not exists artist_music_public_title_trgm
  on public.artist_music using gin (title extensions.gin_trgm_ops)
  where is_public = true and is_visible = true and rights_confirmed = true
    and moderation_status = 'approved';

alter table if exists public.posts
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(account_display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(location, '')), 'C')
  ) stored;
create index if not exists posts_public_global_search_gin
  on public.posts using gin (global_search_vector)
  where visibility = 'public' and is_visible = true
    and moderation_status is distinct from 'rejected';
create index if not exists posts_public_content_trgm
  on public.posts using gin (content extensions.gin_trgm_ops)
  where visibility = 'public' and is_visible = true
    and moderation_status is distinct from 'rejected';

alter table if exists public.artist_jobs
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(job_type, '') || ' ' || coalesce(location, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(genre, '')), 'C')
  ) stored;
create index if not exists artist_jobs_open_global_search_gin
  on public.artist_jobs using gin (global_search_vector)
  where status = 'open';
create index if not exists artist_jobs_open_title_trgm
  on public.artist_jobs using gin (title extensions.gin_trgm_ops)
  where status = 'open';

alter table if exists public.job_posting_templates
  add column if not exists global_search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, coalesce(position, ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(department, '') || ' ' || coalesce(location, '') || ' ' || coalesce(role_type, '')), 'C')
  ) stored;
create index if not exists venue_jobs_published_global_search_gin
  on public.job_posting_templates using gin (global_search_vector)
  where status = 'published';
create index if not exists venue_jobs_published_title_trgm
  on public.job_posting_templates using gin (title extensions.gin_trgm_ops)
  where status = 'published';

-- Reciprocal relationship checks already have the follower-side unique index;
-- this supplies the reverse lookup used for "follows you" and friend affinity.
create index if not exists follows_following_id_idx
  on public.follows (following_id);
