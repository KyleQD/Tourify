-- Add artist_avatar_url to the music_tracks view so callers don't need a
-- relationship join (views lack FK metadata in PostgREST).
create or replace view public.music_tracks as
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
  tracks.cover_art_url,
  tracks.tags,
  tracks.is_public,
  tracks.metadata,
  tracks.stats,
  coalesce((tracks.stats ->> 'plays')::int, 0)    as play_count,
  coalesce((tracks.stats ->> 'likes')::int, 0)    as likes_count,
  coalesce((tracks.stats ->> 'shares')::int, 0)   as shares_count,
  coalesce((tracks.stats ->> 'comments')::int, 0) as comments_count,
  profiles.username                                as artist_username,
  coalesce(profiles.full_name, profiles.username)  as artist_name,
  profiles.avatar_url                              as artist_avatar_url,
  tracks.created_at,
  tracks.updated_at
from public.artist_music tracks
left join public.profiles on profiles.id = tracks.user_id;
