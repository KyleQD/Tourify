set client_min_messages = warning;

-- Simple migration to create just the new forum system without conflicts
-- This focuses on the core forum functionality needed for the UI

-- Enable required extensions
create extension if not exists pgcrypto;

-- Create the new forums table (v2)
create table if not exists forums_v2 (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  kind text not null default 'public' check (kind in ('public', 'restricted')),
  is_archived boolean not null default false,
  subscribers_count integer not null default 0,
  threads_count integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create forum threads table (v2)
create table if not exists forum_threads_v2 (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references forums_v2(id) on delete cascade,
  title text not null,
  kind text not null default 'text' check (kind in ('text','link','media','crosspost')),
  content_md text,
  link_url text,
  created_by uuid not null references auth.users(id),
  is_deleted boolean not null default false,
  is_locked boolean not null default false,
  is_pinned boolean not null default false,
  score integer not null default 0,
  hot_score float8 not null default 0,
  comments_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tsv tsvector
);

-- Create forum posts (comments) table
create table if not exists forum_posts_v2 (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads_v2(id) on delete cascade,
  parent_id uuid references forum_posts_v2(id) on delete cascade,
  content_md text not null,
  created_by uuid not null references auth.users(id),
  is_deleted boolean not null default false,
  score integer not null default 0,
  depth integer not null default 0,
  path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create votes table (v2)
create table if not exists forum_votes_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  target_kind text not null check (target_kind in ('thread','post')),
  target_id uuid not null,
  kind text not null check (kind in ('up','down')),
  created_at timestamptz not null default now(),
  unique (user_id, target_kind, target_id)
);

-- Create subscriptions table (v2)
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

-- Create indexes
create index if not exists idx_thread_hot_v2 on forum_threads_v2 (hot_score desc, created_at desc);
create index if not exists idx_thread_forum_v2 on forum_threads_v2 (forum_id, created_at desc);
create index if not exists idx_thread_score_v2 on forum_threads_v2 (score desc, created_at desc);
create index if not exists idx_posts_thread_v2 on forum_posts_v2 (thread_id, path);
create index if not exists idx_votes_user_v2 on forum_votes_v2 (user_id, target_kind, target_id);
create index if not exists idx_thread_tsv_v2 on forum_threads_v2 using gin(tsv);

-- Hot score function
create or replace function compute_hot_score(score int, ts timestamptz) 
returns float8 
language sql 
immutable as $$
  select (log(greatest(abs(score), 1)) * sign(score)) + extract(epoch from ts)/45000
$$;

-- Update hot score trigger
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

-- Vote counter trigger
create or replace function update_vote_counters_v2() 
returns trigger as $$
declare
  score_delta int := 0;
begin
  if TG_OP = 'INSERT' then
    score_delta := case when new.kind = 'up' then 1 else -1 end;
  elsif TG_OP = 'UPDATE' then
    score_delta := case when new.kind = 'up' then 1 else -1 end - 
                   case when old.kind = 'up' then 1 else -1 end;
  elsif TG_OP = 'DELETE' then
    score_delta := -(case when old.kind = 'up' then 1 else -1 end);
  end if;
  
  if coalesce(new.target_kind, old.target_kind) = 'thread' then
    update forum_threads_v2 
    set score = score + score_delta 
    where id = coalesce(new.target_id, old.target_id);
  elsif coalesce(new.target_kind, old.target_kind) = 'post' then
    update forum_posts_v2 
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
  for each row execute function update_vote_counters_v2();

-- Comment counter trigger
create or replace function update_comment_counters_v2() 
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

drop trigger if exists trg_comment_counters_v2 on forum_posts_v2;
create trigger trg_comment_counters_v2 
  after insert or delete 
  on forum_posts_v2 
  for each row execute function update_comment_counters_v2();

-- Enable RLS
alter table forums_v2 enable row level security;
alter table forum_threads_v2 enable row level security;
alter table forum_posts_v2 enable row level security;
alter table forum_votes_v2 enable row level security;
alter table forum_subscriptions_v2 enable row level security;

-- Basic RLS policies
create policy "forums_v2_read" on forums_v2 for select using (kind = 'public');
create policy "forums_v2_create" on forums_v2 for insert with check (auth.uid() = created_by);

create policy "threads_v2_read" on forum_threads_v2 for select using (not is_deleted);
create policy "threads_v2_create" on forum_threads_v2 for insert with check (auth.uid() = created_by);
create policy "threads_v2_update_own" on forum_threads_v2 for update using (auth.uid() = created_by);

create policy "posts_v2_read" on forum_posts_v2 for select using (not is_deleted);
create policy "posts_v2_create" on forum_posts_v2 for insert with check (auth.uid() = created_by);
create policy "posts_v2_update_own" on forum_posts_v2 for update using (auth.uid() = created_by);

create policy "votes_v2_manage" on forum_votes_v2 for all using (auth.uid() = user_id);
create policy "subs_v2_manage" on forum_subscriptions_v2 for all using (auth.uid() = user_id);

-- Migrate existing data if it exists
do $$
declare
  default_user_id uuid;
begin
  -- Try to find any user to assign forum ownership
  select id into default_user_id from auth.users limit 1;
  
  if default_user_id is not null then
    -- Create default music forums
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
    
    -- Migrate from old forums if they exist
    if exists (select 1 from information_schema.tables where table_name = 'forums') then
      insert into forums_v2 (id, slug, title, description, created_by, created_at)
      select id, slug, name, description, coalesce(created_by, default_user_id), created_at
      from forums
      on conflict (id) do nothing;
    end if;
    
    -- Migrate from old forum_threads if they exist
    if exists (select 1 from information_schema.tables where table_name = 'forum_threads') then
      insert into forum_threads_v2 (id, forum_id, title, content_md, link_url, created_by, score, comments_count, created_at)
      select id, forum_id, title, body, url, author_id, score, comments_count, created_at
      from forum_threads
      on conflict (id) do nothing;
    end if;
  end if;
end $$;
