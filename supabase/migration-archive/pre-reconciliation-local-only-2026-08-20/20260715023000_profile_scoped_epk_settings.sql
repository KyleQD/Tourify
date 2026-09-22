set client_min_messages = warning;

alter table public.artist_epk_settings
  add column if not exists artist_profile_id uuid references public.artist_profiles(id) on delete cascade;

update public.artist_epk_settings settings
set artist_profile_id = (
  select profiles.id
  from public.artist_profiles profiles
  where profiles.user_id = settings.user_id
  order by profiles.created_at desc nulls last, profiles.id
  limit 1
)
where settings.artist_profile_id is null;

drop index if exists public.idx_artist_epk_settings_user_id;
alter table public.artist_epk_settings
  drop constraint if exists artist_epk_settings_user_id_key;

create index if not exists idx_artist_epk_settings_user_lookup
  on public.artist_epk_settings(user_id);

create unique index if not exists idx_artist_epk_settings_artist_profile_id
  on public.artist_epk_settings(artist_profile_id)
  where artist_profile_id is not null;

create unique index if not exists idx_artist_epk_settings_legacy_user_id
  on public.artist_epk_settings(user_id)
  where artist_profile_id is null;

create index if not exists idx_artist_epk_settings_profile_public
  on public.artist_epk_settings(artist_profile_id, is_public)
  where artist_profile_id is not null;
