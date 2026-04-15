set client_min_messages = warning;

-- Music commerce expansion: listings<->tracks link, playlists, buyer library, and canonical music view.

alter table public.marketplace_listings
  add column if not exists music_track_id uuid references public.artist_music(id) on delete set null,
  add column if not exists license_type text not null default 'personal_use',
  add column if not exists rights_confirmed boolean not null default false,
  add column if not exists rights_confirmed_at timestamptz;

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_license_type_check;

alter table public.marketplace_listings
  add constraint marketplace_listings_license_type_check
  check (license_type in ('personal_use', 'commercial_use', 'exclusive'));

create index if not exists idx_marketplace_listings_music_track_id on public.marketplace_listings(music_track_id);

alter table public.marketplace_order_items
  add column if not exists music_track_id uuid references public.artist_music(id) on delete set null;

create index if not exists idx_marketplace_order_items_music_track_id on public.marketplace_order_items(music_track_id);

alter table public.marketplace_entitlements
  add column if not exists listing_id uuid references public.marketplace_listings(id) on delete set null,
  add column if not exists music_track_id uuid references public.artist_music(id) on delete set null,
  add column if not exists asset_bucket text,
  add column if not exists asset_path text,
  add column if not exists preview_bucket text,
  add column if not exists preview_path text,
  add column if not exists last_downloaded_at timestamptz;

create index if not exists idx_marketplace_entitlements_listing_id on public.marketplace_entitlements(listing_id);
create index if not exists idx_marketplace_entitlements_music_track_id on public.marketplace_entitlements(music_track_id);

create table if not exists public.user_music_library (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid not null references public.marketplace_order_items(id) on delete cascade,
  entitlement_id uuid references public.marketplace_entitlements(id) on delete set null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  music_track_id uuid not null references public.artist_music(id) on delete cascade,
  seller_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'marketplace_purchase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_user_id, music_track_id)
);

create index if not exists idx_user_music_library_buyer_created_at on public.user_music_library(buyer_user_id, created_at desc);
create index if not exists idx_user_music_library_track on public.user_music_library(music_track_id);

drop trigger if exists user_music_library_touch_updated_at on public.user_music_library;
create trigger user_music_library_touch_updated_at before update on public.user_music_library
for each row execute procedure public.marketplace_touch_updated_at();

alter table public.user_music_library enable row level security;

drop policy if exists "user_music_library_owner_read" on public.user_music_library;
create policy "user_music_library_owner_read" on public.user_music_library
for select using (auth.uid() = buyer_user_id);

drop policy if exists "user_music_library_owner_manage" on public.user_music_library;
create policy "user_music_library_owner_manage" on public.user_music_library
for all using (auth.uid() = buyer_user_id) with check (auth.uid() = buyer_user_id);

create table if not exists public.music_playlists (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private',
  cover_image_url text,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_playlists_visibility_check check (visibility in ('private', 'public', 'unlisted'))
);

create index if not exists idx_music_playlists_owner_created_at on public.music_playlists(owner_user_id, created_at desc);

drop trigger if exists music_playlists_touch_updated_at on public.music_playlists;
create trigger music_playlists_touch_updated_at before update on public.music_playlists
for each row execute procedure public.marketplace_touch_updated_at();

create table if not exists public.music_playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.music_playlists(id) on delete cascade,
  music_track_id uuid not null references public.artist_music(id) on delete cascade,
  added_by_user_id uuid not null references auth.users(id) on delete set null,
  position integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, music_track_id)
);

create index if not exists idx_music_playlist_items_playlist_position on public.music_playlist_items(playlist_id, position);
create index if not exists idx_music_playlist_items_track on public.music_playlist_items(music_track_id);

drop trigger if exists music_playlist_items_touch_updated_at on public.music_playlist_items;
create trigger music_playlist_items_touch_updated_at before update on public.music_playlist_items
for each row execute procedure public.marketplace_touch_updated_at();

create table if not exists public.music_playlist_shares (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.music_playlists(id) on delete cascade,
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  feed_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_music_playlist_shares_playlist on public.music_playlist_shares(playlist_id, created_at desc);
create index if not exists idx_music_playlist_shares_shared_with on public.music_playlist_shares(shared_with_user_id, created_at desc);

alter table public.music_playlists enable row level security;
alter table public.music_playlist_items enable row level security;
alter table public.music_playlist_shares enable row level security;

drop policy if exists "music_playlists_public_read" on public.music_playlists;
create policy "music_playlists_public_read" on public.music_playlists
for select using (visibility = 'public');

drop policy if exists "music_playlists_owner_manage" on public.music_playlists;
create policy "music_playlists_owner_manage" on public.music_playlists
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "music_playlist_items_owner_or_public_read" on public.music_playlist_items;
create policy "music_playlist_items_owner_or_public_read" on public.music_playlist_items
for select using (
  exists (
    select 1
    from public.music_playlists playlists
    where playlists.id = playlist_id
      and (playlists.owner_user_id = auth.uid() or playlists.visibility = 'public')
  )
);

drop policy if exists "music_playlist_items_owner_manage" on public.music_playlist_items;
create policy "music_playlist_items_owner_manage" on public.music_playlist_items
for all using (
  exists (
    select 1
    from public.music_playlists playlists
    where playlists.id = playlist_id and playlists.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.music_playlists playlists
    where playlists.id = playlist_id and playlists.owner_user_id = auth.uid()
  )
);

drop policy if exists "music_playlist_shares_owner_read" on public.music_playlist_shares;
create policy "music_playlist_shares_owner_read" on public.music_playlist_shares
for select using (
  auth.uid() = shared_by_user_id
  or auth.uid() = shared_with_user_id
  or exists (
    select 1
    from public.music_playlists playlists
    where playlists.id = playlist_id and playlists.owner_user_id = auth.uid()
  )
);

drop policy if exists "music_playlist_shares_owner_create" on public.music_playlist_shares;
create policy "music_playlist_shares_owner_create" on public.music_playlist_shares
for insert with check (
  auth.uid() = shared_by_user_id
  and exists (
    select 1
    from public.music_playlists playlists
    where playlists.id = playlist_id and playlists.owner_user_id = auth.uid()
  )
);

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
  coalesce((tracks.stats ->> 'plays')::int, 0) as play_count,
  coalesce((tracks.stats ->> 'likes')::int, 0) as likes_count,
  coalesce((tracks.stats ->> 'shares')::int, 0) as shares_count,
  coalesce((tracks.stats ->> 'comments')::int, 0) as comments_count,
  profiles.username as artist_username,
  coalesce(profiles.full_name, profiles.username) as artist_name,
  tracks.created_at,
  tracks.updated_at
from public.artist_music tracks
left join public.profiles on profiles.id = tracks.user_id;
