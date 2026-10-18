-- NEWS CORE V1 — REVIEW ONLY.
-- This SQL is intentionally NOT in supabase/migrations yet.
-- Generate a timestamped migration with `supabase migration new news_core_v1`
-- in the canonical worktree after reconciling staging/demo schema drift.
-- Apply only after the M1 privacy audit and a staging test run.
-- Do not run this unreviewed against production.

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  publisher_domain text not null,
  feed_url text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','paused','disabled')),
  rights_policy text not null default 'link_only' check (rights_policy in ('link_only','licensed')),
  http_etag text,
  http_last_modified text,
  last_polled_at timestamptz,
  next_poll_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_sources_https_feed check (feed_url like 'https://%')
);

create index if not exists news_sources_due_idx
  on public.news_sources (next_poll_at) where status = 'approved';

create table if not exists public.news_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  headline text not null,
  publication_state text not null default 'draft'
    check (publication_state in ('draft','published','removed')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  origin_type text not null check (origin_type in ('rss','community','editorial')),
  source_id uuid references public.news_sources(id) on delete restrict,
  origin_reference text,
  dedupe_key text not null,
  story_id uuid references public.news_stories(id) on delete set null,
  source_name text not null,
  headline text not null,
  excerpt text not null default '',
  canonical_url text not null,
  image_url text,
  topics text[] not null default '{}',
  published_at timestamptz not null,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  visibility text not null default 'private'
    check (visibility in ('private','public')),
  publication_state text not null default 'pending'
    check (publication_state in ('pending','published','removed')),
  moderation_state text not null default 'pending'
    check (moderation_state in ('pending','approved','rejected','disputed')),
  rights_state text not null default 'pending'
    check (rights_state in ('pending','link_only','licensed','blocked')),
  constraint news_items_unique_origin unique (origin_type, dedupe_key),
  constraint news_items_rss_source check (origin_type <> 'rss' or source_id is not null),
  constraint news_items_link_only_no_body_or_image check (
    rights_state <> 'link_only' or (excerpt = '' and image_url is null)
  ),
  constraint news_items_public_requires_approval check (
    publication_state <> 'published' or (
      visibility = 'public' and moderation_state = 'approved' and
      rights_state in ('link_only','licensed')
    )
  )
);

create index if not exists news_items_public_time_idx
  on public.news_items (published_at desc, id desc)
  where publication_state = 'published' and visibility = 'public'
    and moderation_state = 'approved';

create index if not exists news_items_story_idx on public.news_items (story_id);
create index if not exists news_items_source_idx on public.news_items (source_id);

create table if not exists public.news_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_user_id uuid not null,
  headline text not null,
  draft_body text not null,
  referenced_content_type text,
  referenced_content_id text,
  editorial_status text not null default 'pending'
    check (editorial_status in ('pending','in_review','approved','rejected','withdrawn')),
  editorial_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists news_submissions_queue_idx
  on public.news_submissions (editorial_status, submitted_at);

create table if not exists public.news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources(id) on delete cascade,
  run_status text not null check (run_status in ('started','succeeded','failed')),
  items_seen integer not null default 0 check (items_seen >= 0),
  items_inserted integer not null default 0 check (items_inserted >= 0),
  failure_detail text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists news_ingestion_runs_source_idx
  on public.news_ingestion_runs (source_id, started_at desc);

-- Limit new tables to explicit, least-privilege API grants.
-- Supabase announced stricter default Data API exposure for Oct 30, 2026.
revoke all on table public.news_sources, public.news_stories,
  public.news_items, public.news_submissions, public.news_ingestion_runs
  from anon, authenticated;

grant select on table public.news_items, public.news_stories to anon, authenticated;
grant all on table public.news_sources, public.news_stories,
  public.news_items, public.news_submissions, public.news_ingestion_runs
  to service_role;

alter table public.news_sources enable row level security;
alter table public.news_stories enable row level security;
alter table public.news_items enable row level security;
alter table public.news_submissions enable row level security;
alter table public.news_ingestion_runs enable row level security;

-- RLS SELECT applies to both anonymous visitors and members.
-- The application must never expose drafts, withheld records or raw tips.
create policy "news_public_items_only" on public.news_items
  for select to anon, authenticated
  using (
    visibility = 'public' and publication_state = 'published'
    and moderation_state = 'approved'
    and rights_state in ('link_only','licensed')
  );

create policy "news_public_stories_only" on public.news_stories
  for select to anon, authenticated
  using (publication_state = 'published');

-- Deliberately NO anon/authenticated policies for source config,
-- moderation submissions or ingestion logs.
-- Editorial/ingestion actions must use a restricted server-side service
-- with verified application RBAC, never a browser-accessible service key.
