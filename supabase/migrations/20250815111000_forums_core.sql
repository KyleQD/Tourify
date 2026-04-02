-- Forums core schema: communities, subscriptions, threads, comments, votes
-- Creates Reddit-like forums that users can follow. Includes RLS and counters.

-- Enable required extensions
create extension if not exists pgcrypto;

-- Forums (communities)
create table if not exists forums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon_url text,
  banner_url text,
  is_nsfw boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Forum subscriptions (follows)
create table if not exists forum_subscriptions (
  forum_id uuid not null references forums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (forum_id, user_id)
);

-- Threads within forums
create table if not exists forum_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references forums(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  media_urls text[] not null default '{}',
  url text,
  score integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_threads_forum_created on forum_threads(forum_id, created_at desc);
create index if not exists idx_forum_threads_score on forum_threads(score desc, created_at desc);

-- Comments (supports nesting via parent_comment_id)
create table if not exists forum_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references forum_comments(id) on delete cascade,
  body text not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_comments_thread_created on forum_comments(thread_id, created_at asc);

-- Votes for threads and comments
create table if not exists forum_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references forum_threads(id) on delete cascade,
  comment_id uuid references forum_comments(id) on delete cascade,
  value integer not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, thread_id),
  unique (user_id, comment_id),
  check ((thread_id is not null) <> (comment_id is not null))
);

-- RLS
alter table forums enable row level security;
alter table forum_subscriptions enable row level security;
alter table forum_threads enable row level security;
alter table forum_comments enable row level security;
alter table forum_votes enable row level security;

-- Forums policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'forums' and policyname = 'forums_select_all'
  ) then
    create policy forums_select_all on forums for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'forums' and policyname = 'forums_insert_own'
  ) then
    create policy forums_insert_own on forums for insert with check (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'forums' and policyname = 'forums_update_owner'
  ) then
    create policy forums_update_owner on forums for update using (auth.uid() = created_by);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'forums' and policyname = 'forums_delete_owner'
  ) then
    create policy forums_delete_owner on forums for delete using (auth.uid() = created_by);
  end if;
end $$;

-- Subscriptions policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'forum_subscriptions' and policyname = 'forum_subscriptions_select_all') then
    create policy forum_subscriptions_select_all on forum_subscriptions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_subscriptions' and policyname = 'forum_subscriptions_insert_own') then
    create policy forum_subscriptions_insert_own on forum_subscriptions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_subscriptions' and policyname = 'forum_subscriptions_delete_own') then
    create policy forum_subscriptions_delete_own on forum_subscriptions for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Threads policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'forum_threads' and policyname = 'forum_threads_select_all') then
    create policy forum_threads_select_all on forum_threads for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_threads' and policyname = 'forum_threads_insert_own') then
    create policy forum_threads_insert_own on forum_threads for insert with check (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_threads' and policyname = 'forum_threads_update_owner') then
    create policy forum_threads_update_owner on forum_threads for update using (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_threads' and policyname = 'forum_threads_delete_owner') then
    create policy forum_threads_delete_owner on forum_threads for delete using (auth.uid() = author_id);
  end if;
end $$;

-- Comments policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'forum_comments' and policyname = 'forum_comments_select_all') then
    create policy forum_comments_select_all on forum_comments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_comments' and policyname = 'forum_comments_insert_own') then
    create policy forum_comments_insert_own on forum_comments for insert with check (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_comments' and policyname = 'forum_comments_update_owner') then
    create policy forum_comments_update_owner on forum_comments for update using (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_comments' and policyname = 'forum_comments_delete_owner') then
    create policy forum_comments_delete_owner on forum_comments for delete using (auth.uid() = author_id);
  end if;
end $$;

-- Votes policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'forum_votes' and policyname = 'forum_votes_select_all') then
    create policy forum_votes_select_all on forum_votes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'forum_votes' and policyname = 'forum_votes_upsert_own') then
    create policy forum_votes_upsert_own on forum_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Triggers to maintain counters and scores
create or replace function forum_apply_vote_to_thread() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update forum_threads set score = score + new.value where id = new.thread_id;
  elsif tg_op = 'UPDATE' then
    update forum_threads set score = score - old.value + new.value where id = new.thread_id;
  elsif tg_op = 'DELETE' then
    update forum_threads set score = score - old.value where id = old.thread_id;
  end if;
  return null;
end; $$ language plpgsql security definer;

drop trigger if exists trg_forum_vote_thread on forum_votes;
create trigger trg_forum_vote_thread
after insert or update or delete on forum_votes
for each row
execute function forum_apply_vote_to_thread();

create or replace function forum_apply_vote_to_comment() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update forum_comments set score = score + new.value where id = new.comment_id;
  elsif tg_op = 'UPDATE' then
    update forum_comments set score = score - old.value + new.value where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update forum_comments set score = score - old.value where id = old.comment_id;
  end if;
  return null;
end; $$ language plpgsql security definer;

drop trigger if exists trg_forum_vote_comment on forum_votes;
create trigger trg_forum_vote_comment
after insert or update or delete on forum_votes
for each row
execute function forum_apply_vote_to_comment();

create or replace function forum_increment_comments_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update forum_threads set comments_count = comments_count + 1 where id = new.thread_id;
  elsif tg_op = 'DELETE' then
    update forum_threads set comments_count = greatest(comments_count - 1, 0) where id = old.thread_id;
  end if;
  return null;
end; $$ language plpgsql security definer;

drop trigger if exists trg_forum_comments_count on forum_comments;
create trigger trg_forum_comments_count
after insert or delete on forum_comments
for each row execute function forum_increment_comments_count();

-- Maintains updated_at
create or replace function forum_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_forum_threads_touch on forum_threads;
create trigger trg_forum_threads_touch before update on forum_threads for each row execute function forum_touch_updated_at();

drop trigger if exists trg_forums_touch on forums;
create trigger trg_forums_touch before update on forums for each row execute function forum_touch_updated_at();


