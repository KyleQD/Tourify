-- Unify artist event creation on core `events` table
-- Safe, additive migration for artist-specific event pipeline

create extension if not exists "uuid-ossp";

-- Ensure events table exists
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4()
);

alter table public.events
  add column if not exists artist_id uuid references auth.users(id) on delete cascade,
  add column if not exists creator_account_type text default 'artist',
  add column if not exists name text,
  add column if not exists event_type text,
  add column if not exists event_date date,
  add column if not exists doors_open time,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists venue_name text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists capacity integer,
  add column if not exists tags jsonb default '[]'::jsonb,
  add column if not exists setlist jsonb default '[]'::jsonb,
  add column if not exists slug text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists genre_tags jsonb default '[]'::jsonb,
  add column if not exists created_at timestamptz default now();

-- Ensure status can support artist flow
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'events_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events drop constraint events_status_check;
  end if;
exception when undefined_table then
  null;
end $$;

alter table public.events
  alter column status set default 'draft';

do $$
begin
  alter table public.events
    add constraint events_status_check
    check (status in ('draft', 'published', 'cancelled'));
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_creator_account_type_check
    check (creator_account_type in ('artist', 'venue', 'manager', 'organizer'));
exception when duplicate_object then
  null;
end $$;

-- Backfill from legacy columns where available
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'user_id'
  ) then
    execute 'update public.events set artist_id = user_id where artist_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'created_by'
  ) then
    execute 'update public.events set artist_id = created_by where artist_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'title'
  ) then
    execute 'update public.events set name = title where (name is null or name = '''') and title is not null';
  end if;
end $$;

-- Convert tags/setlist arrays to jsonb if needed
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'tags'
      and data_type <> 'jsonb'
  ) then
    alter table public.events
      alter column tags type jsonb
      using case
        when tags is null then '[]'::jsonb
        else to_jsonb(tags)
      end;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'setlist'
      and data_type <> 'jsonb'
  ) then
    alter table public.events
      alter column setlist type jsonb
      using case
        when setlist is null then '[]'::jsonb
        else to_jsonb(setlist)
      end;
  end if;
end $$;

update public.events set tags = '[]'::jsonb where tags is null;
update public.events set setlist = '[]'::jsonb where setlist is null;
update public.events set creator_account_type = 'artist' where creator_account_type is null;

alter table public.events
  alter column tags set default '[]'::jsonb,
  alter column setlist set default '[]'::jsonb,
  alter column creator_account_type set default 'artist',
  alter column created_at set default now();

-- Not-null guarantees for artist pipeline-required fields
do $$
begin
  if not exists (select 1 from public.events where artist_id is null) then
    alter table public.events alter column artist_id set not null;
  end if;
exception when undefined_column then
  null;
end $$;

-- Indexes for discoverability
create index if not exists idx_events_status_event_date on public.events(status, event_date);
create index if not exists idx_events_city on public.events(city);
create index if not exists idx_events_artist_id on public.events(artist_id);
create index if not exists idx_events_country on public.events(country);
create unique index if not exists idx_events_slug_unique on public.events(slug);
create index if not exists idx_events_geo on public.events(latitude, longitude);

-- RLS
alter table public.events enable row level security;

drop policy if exists "Artists can insert their own events" on public.events;
create policy "Artists can insert their own events"
on public.events
for insert
with check (auth.uid() = artist_id);

drop policy if exists "Artists can update their own events" on public.events;
create policy "Artists can update their own events"
on public.events
for update
using (auth.uid() = artist_id)
with check (auth.uid() = artist_id);

drop policy if exists "Artists can read own events and public can read published" on public.events;
create policy "Artists can read own events and public can read published"
on public.events
for select
using (auth.uid() = artist_id or status = 'published');
