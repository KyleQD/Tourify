set client_min_messages = warning;

-- Production-ready Forums system with Reddit-like features
-- This migration replaces the simple forum system with a comprehensive one
-- Includes: communities, threads, nested comments, votes, tags, moderation, notifications

-- Enable required extensions
create extension if not exists pgcrypto;

-- ========================================
-- LOOKUP TABLES (no Postgres ENUM types)
-- ========================================

-- Forum visibility types
create table if not exists forum_kind (
  id text primary key,
  label text not null
);

insert into forum_kind (id, label) values
  ('public', 'Public'),
  ('restricted', 'Restricted')
on conflict (id) do nothing;

-- Vote types 
create table if not exists vote_kind (
  id text primary key check (id in ('up','down'))
);

insert into vote_kind (id) values ('up'), ('down')
on conflict (id) do nothing;

-- Post content types
create table if not exists post_kind (
  id text primary key check (id in ('text','link','media','crosspost'))
);

insert into post_kind (id) values ('text'), ('link'), ('media'), ('crosspost')
on conflict (id) do nothing;

-- Content reference types for cross-posting
create table if not exists content_kind (
  id text primary key check (id in ('music','video','news','blog','forum'))
);

insert into content_kind (id) values ('music'), ('video'), ('news'), ('blog'), ('forum')
on conflict (id) do nothing;

-- ========================================
-- CORE FORUM TABLES
-- ========================================

-- Forums/Communities (enhanced from existing)
create table if not exists forums_v2 (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  kind text not null references forum_kind(id) default 'public',
  is_archived boolean not null default false,
  subscribers_count integer not null default 0,
  threads_count integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Forum tags/flairs for categorization
create table if not exists forum_tags (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references forums_v2(id) on delete cascade,
  slug text not null,
  label text not null,
  color text default '#6366f1',
  unique (forum_id, slug)
);

-- Global content references for cross-posting
create table if not exists content_refs (
  id uuid primary key default gen_random_uuid(),
  kind text not null references content_kind(id),
  target_id uuid,
  target_url text,
  title text,
  thumbnail_url text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  unique (kind, target_id)
);

-- Forum threads (enhanced with hot scoring)
create table if not exists forum_threads_v2 (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references forums_v2(id) on delete cascade,
  title text not null,
  kind text not null references post_kind(id) default 'text',
  content_md text,           -- markdown for text posts
  link_url text,             -- for link/media posts
  content_ref_id uuid references content_refs(id) on delete set null, -- cross-post reference
  created_by uuid not null references auth.users(id),
  is_deleted boolean not null default false,
  is_locked boolean not null default false,
  is_pinned boolean not null default false,
  score integer not null default 0,   -- upvotes - downvotes
  hot_score float8 not null default 0, -- Reddit-style hot algorithm
  comments_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tsv tsvector -- full-text search vector
);

-- Thread tags/flairs
create table if not exists forum_thread_tags (
  thread_id uuid not null references forum_threads_v2(id) on delete cascade,
  tag_id uuid not null references forum_tags(id) on delete cascade,
  primary key (thread_id, tag_id)
);

-- Comments (nested via parent_id)
create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads_v2(id) on delete cascade,
  parent_id uuid references forum_posts(id) on delete cascade,
  content_md text not null,
  created_by uuid not null references auth.users(id),
  is_deleted boolean not null default false,
  score integer not null default 0,
  depth integer not null default 0, -- for efficient tree queries
  path text not null default '', -- materialized path for tree ordering
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Votes on threads and comments
create table if not exists forum_votes_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  target_kind text not null check (target_kind in ('thread','post')),
  target_id uuid not null,
  kind text not null references vote_kind(id),
  created_at timestamptz not null default now(),
  unique (user_id, target_kind, target_id)
);

-- Forum and thread subscriptions
create table if not exists forum_subscriptions_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  forum_id uuid references forums_v2(id) on delete cascade,
  thread_id uuid references forum_threads_v2(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((forum_id is not null) != (thread_id is not null)),
  unique (user_id, forum_id),
  unique (user_id, thread_id)
);

-- Content reporting system
create table if not exists forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  target_kind text not null check (target_kind in ('thread','post')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','reviewed','resolved','dismissed')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Forum moderation
create table if not exists forum_moderators (
  forum_id uuid not null references forums_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('mod','owner')),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (forum_id, user_id)
);

-- Notifications system
create table if not exists notifications_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  kind text not null,
  title text not null,
  content text,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Hot score and sorting indexes
create index if not exists idx_thread_hot_v2 on forum_threads_v2 (hot_score desc, created_at desc);
create index if not exists idx_thread_forum_v2 on forum_threads_v2 (forum_id, created_at desc);
create index if not exists idx_thread_score_v2 on forum_threads_v2 (score desc, created_at desc);
create index if not exists idx_thread_pinned_v2 on forum_threads_v2 (forum_id, is_pinned desc, hot_score desc);

-- Comment tree indexes
create index if not exists idx_posts_thread_v2 on forum_posts (thread_id, path);
create index if not exists idx_posts_parent_v2 on forum_posts (parent_id, created_at asc);

-- Search index
create index if not exists idx_thread_tsv_v2 on forum_threads_v2 using gin(tsv);

-- Vote lookup indexes
create index if not exists idx_votes_user_v2 on forum_votes_v2 (user_id, target_kind, target_id);
create index if not exists idx_votes_target_v2 on forum_votes_v2 (target_kind, target_id);

-- Subscription indexes
create index if not exists idx_subs_user_v2 on forum_subscriptions_v2 (user_id);
create index if not exists idx_subs_forum_v2 on forum_subscriptions_v2 (forum_id);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Hot score calculation (Reddit-style algorithm)
create or replace function compute_hot_score(score int, ts timestamptz) 
returns float8 
language sql 
immutable as $$
  select (log(greatest(abs(score), 1)) * sign(score)) + extract(epoch from ts)/45000
$$;

-- Update hot score when score changes
create or replace function update_thread_hot_score() 
returns trigger as $$
begin
  new.hot_score := compute_hot_score(new.score, new.created_at);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_thread_hot_score_v2 on forum_threads_v2;
create trigger trg_thread_hot_score_v2 
  before insert or update of score 
  on forum_threads_v2 
  for each row execute function update_thread_hot_score();

-- Full-text search vector update
create or replace function forum_threads_tsv_trigger() 
returns trigger as $$
begin
  new.tsv :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.content_md,'')), 'B');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_forum_threads_tsv_v2 on forum_threads_v2;
create trigger trg_forum_threads_tsv_v2 
  before insert or update 
  on forum_threads_v2 
  for each row execute function forum_threads_tsv_trigger();

-- Update comment path and depth on insert
create or replace function update_comment_path() 
returns trigger as $$
begin
  if new.parent_id is null then
    new.depth := 0;
    new.path := new.id::text;
  else
    select depth + 1, path || '.' || new.id::text
    into new.depth, new.path
    from forum_posts
    where id = new.parent_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_comment_path on forum_posts;
create trigger trg_comment_path 
  before insert 
  on forum_posts 
  for each row execute function update_comment_path();

-- Update counters when votes change
create or replace function update_vote_counters() 
returns trigger as $$
declare
  score_delta int := 0;
begin
  -- Handle vote changes
  if TG_OP = 'INSERT' then
    score_delta := case when new.kind = 'up' then 1 else -1 end;
  elsif TG_OP = 'UPDATE' then
    score_delta := case when new.kind = 'up' then 1 else -1 end - 
                   case when old.kind = 'up' then 1 else -1 end;
  elsif TG_OP = 'DELETE' then
    score_delta := -(case when old.kind = 'up' then 1 else -1 end);
  end if;
  
  -- Update target score
  if coalesce(new.target_kind, old.target_kind) = 'thread' then
    update forum_threads_v2 
    set score = score + score_delta 
    where id = coalesce(new.target_id, old.target_id);
  elsif coalesce(new.target_kind, old.target_kind) = 'post' then
    update forum_posts 
    set score = score + score_delta 
    where id = coalesce(new.target_id, old.target_id);
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_vote_counters_v2 on forum_votes_v2;
create trigger trg_vote_counters_v2 
  after insert or update or delete 
  on forum_votes_v2 
  for each row execute function update_vote_counters();

-- Update comment count when comments are added/removed
create or replace function update_comment_counters() 
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update forum_threads_v2 
    set comments_count = comments_count + 1 
    where id = new.thread_id;
  elsif TG_OP = 'DELETE' then
    update forum_threads_v2 
    set comments_count = comments_count - 1 
    where id = old.thread_id;
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_comment_counters on forum_posts;
create trigger trg_comment_counters 
  after insert or delete 
  on forum_posts 
  for each row execute function update_comment_counters();

-- Update forum counters
create or replace function update_forum_counters() 
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update forums_v2 
    set threads_count = threads_count + 1 
    where id = new.forum_id;
  elsif TG_OP = 'DELETE' then
    update forums_v2 
    set threads_count = threads_count - 1 
    where id = old.forum_id;
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_forum_counters_v2 on forum_threads_v2;
create trigger trg_forum_counters_v2 
  after insert or delete 
  on forum_threads_v2 
  for each row execute function update_forum_counters();

-- Update subscription counters
create or replace function update_subscription_counters() 
returns trigger as $$
begin
  if TG_OP = 'INSERT' and new.forum_id is not null then
    update forums_v2 
    set subscribers_count = subscribers_count + 1 
    where id = new.forum_id;
  elsif TG_OP = 'DELETE' and old.forum_id is not null then
    update forums_v2 
    set subscribers_count = subscribers_count - 1 
    where id = old.forum_id;
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_subscription_counters_v2 on forum_subscriptions_v2;
create trigger trg_subscription_counters_v2 
  after insert or delete 
  on forum_subscriptions_v2 
  for each row execute function update_subscription_counters();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
alter table forums_v2 enable row level security;
alter table forum_tags enable row level security;
alter table content_refs enable row level security;
alter table forum_threads_v2 enable row level security;
alter table forum_thread_tags enable row level security;
alter table forum_posts enable row level security;
alter table forum_votes_v2 enable row level security;
alter table forum_subscriptions_v2 enable row level security;
alter table forum_reports enable row level security;
alter table forum_moderators enable row level security;
alter table notifications_v2 enable row level security;

-- Forums policies
create policy "forums_v2:read" on forums_v2 for select using (
  kind = 'public' or 
  exists(select 1 from forum_moderators m where m.forum_id = id and m.user_id = auth.uid())
);

create policy "forums_v2:create" on forums_v2 for insert with check (
  auth.uid() = created_by
);

create policy "forums_v2:update" on forums_v2 for update using (
  exists(select 1 from forum_moderators m where m.forum_id = id and m.user_id = auth.uid() and m.role = 'owner')
);

-- Forum tags policies
create policy "forum_tags:read" on forum_tags for select using (true);
create policy "forum_tags:manage" on forum_tags for all using (
  exists(select 1 from forum_moderators m where m.forum_id = forum_id and m.user_id = auth.uid())
);

-- Content refs policies  
create policy "content_refs:read" on content_refs for select using (true);
create policy "content_refs:create" on content_refs for insert with check (true);

-- Thread policies
create policy "forum_threads_v2:read" on forum_threads_v2 for select using (
  not is_deleted or 
  auth.uid() = created_by or
  exists(select 1 from forum_moderators m where m.forum_id = forum_id and m.user_id = auth.uid())
);

create policy "forum_threads_v2:create" on forum_threads_v2 for insert with check (
  auth.uid() = created_by
);

create policy "forum_threads_v2:update_own" on forum_threads_v2 for update using (
  auth.uid() = created_by
) with check (auth.uid() = created_by);

create policy "forum_threads_v2:moderate" on forum_threads_v2 for update using (
  exists(select 1 from forum_moderators m where m.forum_id = forum_id and m.user_id = auth.uid())
);

-- Thread tags policies
create policy "forum_thread_tags:read" on forum_thread_tags for select using (true);
create policy "forum_thread_tags:manage" on forum_thread_tags for all using (
  exists(
    select 1 from forum_threads_v2 t 
    join forum_moderators m on m.forum_id = t.forum_id 
    where t.id = thread_id and m.user_id = auth.uid()
  ) or exists(
    select 1 from forum_threads_v2 t 
    where t.id = thread_id and t.created_by = auth.uid()
  )
);

-- Comments policies
create policy "forum_posts:read" on forum_posts for select using (
  not is_deleted or 
  auth.uid() = created_by or
  exists(
    select 1 from forum_threads_v2 t 
    join forum_moderators m on m.forum_id = t.forum_id 
    where t.id = thread_id and m.user_id = auth.uid()
  )
);

create policy "forum_posts:create" on forum_posts for insert with check (
  auth.uid() = created_by
);

create policy "forum_posts:update_own" on forum_posts for update using (
  auth.uid() = created_by
) with check (auth.uid() = created_by);

create policy "forum_posts:moderate" on forum_posts for update using (
  exists(
    select 1 from forum_threads_v2 t 
    join forum_moderators m on m.forum_id = t.forum_id 
    where t.id = thread_id and m.user_id = auth.uid()
  )
);

-- Votes policies
create policy "forum_votes_v2:manage" on forum_votes_v2 for all using (
  auth.uid() = user_id
) with check (auth.uid() = user_id);

-- Subscriptions policies
create policy "forum_subscriptions_v2:manage" on forum_subscriptions_v2 for all using (
  auth.uid() = user_id  
) with check (auth.uid() = user_id);

-- Reports policies
create policy "forum_reports:create" on forum_reports for insert with check (
  auth.uid() = reporter_id
);

create policy "forum_reports:read_own" on forum_reports for select using (
  auth.uid() = reporter_id
);

create policy "forum_reports:read_mod" on forum_reports for select using (
  exists(select 1 from forum_moderators m where m.user_id = auth.uid())
);

create policy "forum_reports:manage_mod" on forum_reports for update using (
  exists(select 1 from forum_moderators m where m.user_id = auth.uid())
);

-- Moderators policies
create policy "forum_moderators:read" on forum_moderators for select using (true);
create policy "forum_moderators:manage" on forum_moderators for all using (
  exists(select 1 from forum_moderators m where m.forum_id = forum_id and m.user_id = auth.uid() and m.role = 'owner')
);

-- Notifications policies
create policy "notifications_v2:manage" on notifications_v2 for all using (
  auth.uid() = user_id
) with check (auth.uid() = user_id);

-- ========================================
-- MIGRATE DATA FROM OLD TABLES
-- ========================================

-- Migrate existing forums if they exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'forums') then
    insert into forums_v2 (id, slug, title, description, created_by, created_at)
    select id, slug, name, description, created_by, created_at
    from forums
    on conflict (id) do nothing;
  end if;
end $$;

-- Migrate existing forum_threads if they exist  
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'forum_threads') then
    insert into forum_threads_v2 (id, forum_id, title, content_md, link_url, created_by, score, comments_count, created_at)
    select id, forum_id, title, body, url, author_id, score, comments_count, created_at
    from forum_threads
    on conflict (id) do nothing;
  end if;
end $$;

-- Migrate existing forum_subscriptions if they exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'forum_subscriptions') then
    insert into forum_subscriptions_v2 (user_id, forum_id, created_at)
    select user_id, forum_id, created_at
    from forum_subscriptions
    on conflict do nothing;
  end if;
end $$;

-- Migrate existing forum_votes if they exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'forum_votes') then
    insert into forum_votes_v2 (user_id, target_kind, target_id, kind, created_at)
    select user_id, 'thread', thread_id, case when value = 1 then 'up' else 'down' end, created_at
    from forum_votes
    where thread_id is not null
    on conflict do nothing;
  end if;
end $$;

-- ========================================
-- DEFAULT DATA  
-- ========================================

-- Create default music forums with proper ownership
do $$
declare
  default_user_id uuid;
begin
  -- Try to find a system user or use the first admin user
  select id into default_user_id from auth.users limit 1;
  
  if default_user_id is not null then
    insert into forums_v2 (slug, title, description, created_by) values
      ('indie-music', 'Indie Music', 'Discover and discuss independent artists, hidden gems, and the latest indie releases', default_user_id),
      ('hip-hop', 'Hip-Hop', 'Everything hip-hop: new drops, classic albums, producers, and culture', default_user_id),
      ('songwriting', 'Songwriting', 'Share lyrics, discuss songwriting techniques, and collaborate on music creation', default_user_id),
      ('live-music', 'Live Music', 'Concert reviews, festival experiences, and live performance discussions', default_user_id),
      ('music-production', 'Music Production', 'Beat making, mixing, mastering, and home studio setups', default_user_id),
      ('electronic', 'Electronic', 'House, techno, ambient, EDM, and all electronic music genres', default_user_id),
      ('music-discovery', 'Music Discovery', 'Share your finds and discover new artists across all genres', default_user_id),
      ('gear-and-instruments', 'Gear & Instruments', 'Guitars, synths, interfaces, and all music equipment discussion', default_user_id),
      ('music-business', 'Music Business', 'Industry insights, marketing tips, and artist career advice', default_user_id),
      ('music-theory', 'Music Theory', 'Scales, chord progressions, composition, and musical analysis', default_user_id)
    on conflict (slug) do nothing;
    
    -- Make the creator an owner of each forum
    insert into forum_moderators (forum_id, user_id, role, granted_by)
    select id, created_by, 'owner', created_by
    from forums_v2
    where created_by = default_user_id
    on conflict do nothing;
  end if;
end $$;
