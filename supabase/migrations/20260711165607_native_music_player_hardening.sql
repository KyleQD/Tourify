set client_min_messages = warning;

-- Hardening pass for native music playback:
-- - canonical private storage paths for full/preview audio
-- - stream/access analytics event lifecycle additions
-- - fail-closed analytics RLS so only trusted server/service writes canonical events

alter table public.artist_music
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists preview_storage_bucket text,
  add column if not exists preview_storage_path text,
  add column if not exists listing_sync_status text not null default 'not_required',
  add column if not exists listing_sync_error text;

update public.artist_music
set
  storage_bucket = coalesce(storage_bucket, 'artist-music'),
  storage_path = coalesce(
    storage_path,
    nullif(
      regexp_replace(
        coalesce(file_url, ''),
        '^.*/storage/v1/object/(?:public|sign)/artist-music/',
        ''
      ),
      coalesce(file_url, '')
    )
  ),
  preview_storage_bucket = case
    when preview_file_url is not null then coalesce(preview_storage_bucket, 'artist-music')
    else preview_storage_bucket
  end,
  preview_storage_path = coalesce(
    preview_storage_path,
    nullif(
      regexp_replace(
        coalesce(preview_file_url, ''),
        '^.*/storage/v1/object/(?:public|sign)/artist-music/',
        ''
      ),
      coalesce(preview_file_url, '')
    )
  );

alter table public.artist_music
  drop constraint if exists artist_music_storage_path_required_check,
  add constraint artist_music_storage_path_required_check
    check (
      is_public = false
      or storage_path is not null
      or file_url is not null
    );

alter table public.artist_music
  drop constraint if exists artist_music_preview_storage_required_check,
  add constraint artist_music_preview_storage_required_check
    check (
      preview_mode <> 'clip'
      or preview_storage_path is not null
      or preview_file_url is not null
    );

alter table public.artist_music
  drop constraint if exists artist_music_listing_sync_status_check,
  add constraint artist_music_listing_sync_status_check
    check (listing_sync_status in ('not_required', 'pending', 'draft', 'published', 'blocked', 'error'));

do $$
begin
  update storage.buckets
  set public = false
  where id = 'artist-music';
exception
  when undefined_table then
    null;
end $$;

alter table public.music_engagement_events
  drop constraint if exists music_engagement_events_type_check,
  add constraint music_engagement_events_type_check check (
    event_type in (
      'stream_issued',
      'play',
      'play_started',
      'play_progress',
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
  );

drop policy if exists "music_plays_insert_anyone" on public.music_plays;
drop policy if exists "music_plays_insert_authenticated" on public.music_plays;
-- Canonical play rows are written by trusted API routes using service role.

drop policy if exists "music_events_insert_anyone" on public.music_engagement_events;
drop policy if exists "music_events_insert_authenticated" on public.music_engagement_events;
-- Canonical engagement rows are written by trusted API routes using service role.

create index if not exists idx_artist_music_storage_path
  on public.artist_music (storage_bucket, storage_path)
  where storage_path is not null;

create index if not exists idx_artist_music_preview_storage_path
  on public.artist_music (preview_storage_bucket, preview_storage_path)
  where preview_storage_path is not null;

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
  null::text as file_url,
  null::text as preview_file_url,
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
