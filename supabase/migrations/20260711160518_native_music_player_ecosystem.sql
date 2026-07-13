set client_min_messages = warning;

-- Native music player ecosystem foundation:
-- - access mode + preview policy on artist_music
-- - guaranteed play/event analytics tables
-- - free + paid library compatibility
-- - listener profile featured tracks

alter table public.artist_music
  add column if not exists access_mode text not null default 'free',
  add column if not exists preview_mode text not null default 'full',
  add column if not exists preview_duration_seconds integer not null default 15,
  add column if not exists preview_file_url text,
  add column if not exists allow_library_add boolean not null default true,
  add column if not exists allow_profile_feature boolean not null default true,
  add column if not exists allow_downloads boolean not null default false,
  add column if not exists rights_confirmed boolean not null default false,
  add column if not exists rights_confirmed_at timestamptz,
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists is_visible boolean not null default true;

update public.artist_music
set
  access_mode = coalesce(nullif(access_mode, ''), 'free'),
  preview_mode = coalesce(nullif(preview_mode, ''), 'full'),
  preview_duration_seconds = coalesce(preview_duration_seconds, 15),
  allow_library_add = coalesce(allow_library_add, true),
  allow_profile_feature = coalesce(allow_profile_feature, true),
  rights_confirmed = case when is_public = true then true else rights_confirmed end,
  rights_confirmed_at = case
    when is_public = true and rights_confirmed_at is null then coalesce(created_at, now())
    else rights_confirmed_at
  end,
  moderation_status = coalesce(nullif(moderation_status, ''), 'approved'),
  is_visible = coalesce(is_visible, true);

alter table public.artist_music
  drop constraint if exists artist_music_access_mode_check,
  add constraint artist_music_access_mode_check
    check (access_mode in ('free', 'paid'));

alter table public.artist_music
  drop constraint if exists artist_music_preview_mode_check,
  add constraint artist_music_preview_mode_check
    check (preview_mode in ('full', 'clip'));

alter table public.artist_music
  drop constraint if exists artist_music_preview_duration_check,
  add constraint artist_music_preview_duration_check
    check (preview_duration_seconds between 1 and 600);

alter table public.artist_music
  drop constraint if exists artist_music_publish_rights_check,
  add constraint artist_music_publish_rights_check
    check (
      is_public = false
      or (
        rights_confirmed = true
        and rights_confirmed_at is not null
      )
    );

create index if not exists idx_artist_music_public_visible_access_created
  on public.artist_music (is_public, is_visible, moderation_status, access_mode, created_at desc)
  where is_public = true and is_visible = true and moderation_status = 'approved';

create index if not exists idx_artist_music_user_access_created
  on public.artist_music (user_id, access_mode, created_at desc);

alter table public.artist_music enable row level security;

drop policy if exists "Public music is viewable by everyone" on public.artist_music;
drop policy if exists "Anyone can view public music" on public.artist_music;
drop policy if exists "music_select_policy" on public.artist_music;
drop policy if exists "Public approved music is viewable by everyone" on public.artist_music;
create policy "Public approved music is viewable by everyone" on public.artist_music
for select
using (
  is_public = true
  and is_visible = true
  and moderation_status = 'approved'
  and rights_confirmed = true
);

drop policy if exists "Users can view their own music" on public.artist_music;
drop policy if exists "Artists can view their own music" on public.artist_music;
create policy "Users can view their own music" on public.artist_music
for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.music_plays (
  id uuid primary key default gen_random_uuid(),
  music_id uuid not null references public.artist_music(id) on delete cascade,
  artist_user_id uuid references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  access_level text not null default 'preview',
  listen_seconds integer,
  completed boolean not null default false,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint music_plays_access_level_check check (access_level in ('preview', 'full'))
);

alter table public.music_plays enable row level security;

drop policy if exists "music_plays_insert_anyone" on public.music_plays;
create policy "music_plays_insert_anyone" on public.music_plays
for insert to anon, authenticated
with check (true);

drop policy if exists "music_plays_artist_or_listener_read" on public.music_plays;
create policy "music_plays_artist_or_listener_read" on public.music_plays
for select to authenticated
using (
  user_id = auth.uid()
  or artist_user_id = auth.uid()
  or exists (
    select 1
    from public.artist_music tracks
    where tracks.id = music_plays.music_id
      and tracks.user_id = auth.uid()
  )
);

create index if not exists idx_music_plays_music_created
  on public.music_plays (music_id, created_at desc);
create index if not exists idx_music_plays_artist_created
  on public.music_plays (artist_user_id, created_at desc);
create index if not exists idx_music_plays_user_created
  on public.music_plays (user_id, created_at desc)
  where user_id is not null;

create table if not exists public.music_engagement_events (
  id uuid primary key default gen_random_uuid(),
  music_id uuid not null references public.artist_music(id) on delete cascade,
  artist_user_id uuid references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  access_level text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint music_engagement_events_type_check check (
    event_type in (
      'play',
      'play_completed',
      'preview_play',
      'full_play',
      'library_add',
      'profile_feature',
      'like',
      'comment',
      'share',
      'purchase',
      'download',
      'report'
    )
  ),
  constraint music_engagement_events_access_level_check check (
    access_level is null or access_level in ('preview', 'full')
  )
);

alter table public.music_engagement_events enable row level security;

drop policy if exists "music_events_insert_anyone" on public.music_engagement_events;
create policy "music_events_insert_anyone" on public.music_engagement_events
for insert to anon, authenticated
with check (true);

drop policy if exists "music_events_artist_or_actor_read" on public.music_engagement_events;
create policy "music_events_artist_or_actor_read" on public.music_engagement_events
for select to authenticated
using (
  actor_user_id = auth.uid()
  or artist_user_id = auth.uid()
  or exists (
    select 1
    from public.artist_music tracks
    where tracks.id = music_engagement_events.music_id
      and tracks.user_id = auth.uid()
  )
);

create index if not exists idx_music_events_artist_type_created
  on public.music_engagement_events (artist_user_id, event_type, created_at desc);
create index if not exists idx_music_events_music_type_created
  on public.music_engagement_events (music_id, event_type, created_at desc);
create index if not exists idx_music_events_actor_created
  on public.music_engagement_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

do $$
begin
  if to_regclass('public.user_music_library') is not null then
    alter table public.user_music_library
      alter column order_item_id drop not null;

    create index if not exists idx_user_music_library_source_created
      on public.user_music_library (source, created_at desc);
  end if;
end $$;

create table if not exists public.user_profile_featured_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  library_item_id uuid references public.user_music_library(id) on delete cascade,
  music_track_id uuid not null references public.artist_music(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_profile_featured_tracks enable row level security;

drop policy if exists "featured_tracks_public_read_active" on public.user_profile_featured_tracks;
create policy "featured_tracks_public_read_active" on public.user_profile_featured_tracks
for select using (is_active = true);

drop policy if exists "featured_tracks_owner_manage" on public.user_profile_featured_tracks;
create policy "featured_tracks_owner_manage" on public.user_profile_featured_tracks
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_featured_tracks_music_track
  on public.user_profile_featured_tracks (music_track_id);

drop view if exists public.music_tracks cascade;
create view public.music_tracks as
select
  tracks.id,
  tracks.user_id,
  tracks.artist_profile_id,
  tracks.title,
  tracks.description,
  tracks.type,
  tracks.genre,
  tracks.release_date,
  tracks.duration,
  tracks.file_url,
  tracks.preview_file_url,
  tracks.cover_art_url,
  tracks.tags,
  tracks.is_public,
  tracks.is_visible,
  tracks.moderation_status,
  tracks.access_mode,
  tracks.preview_mode,
  tracks.preview_duration_seconds,
  tracks.allow_library_add,
  tracks.allow_profile_feature,
  tracks.allow_downloads,
  tracks.rights_confirmed,
  tracks.metadata,
  tracks.stats,
  coalesce((tracks.stats ->> 'plays')::int, 0) as play_count,
  coalesce((tracks.stats ->> 'likes')::int, 0) as likes_count,
  coalesce((tracks.stats ->> 'shares')::int, 0) as shares_count,
  coalesce((tracks.stats ->> 'comments')::int, 0) as comments_count,
  profiles.username as artist_username,
  coalesce(profiles.full_name, profiles.username) as artist_name,
  profiles.avatar_url as artist_avatar_url,
  tracks.created_at,
  tracks.updated_at
from public.artist_music tracks
left join public.profiles on profiles.id = tracks.user_id;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    alter view public.music_tracks set (security_invoker = true);
  end if;
end $$;
