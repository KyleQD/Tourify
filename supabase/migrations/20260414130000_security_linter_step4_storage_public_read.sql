set client_min_messages = warning;

-- Step 4 (security linter 0025_public_bucket_allows_listing):
-- Public buckets must not use SELECT policies that match only bucket_id (full-bucket list).
-- Require a normal object path: first segment + at least one file segment, bounded length, no "..".

-- Legacy / duplicate policy names (from older migrations or dashboard)
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Event media images are publicly accessible" on storage.objects;
drop policy if exists "Post media images are publicly accessible" on storage.objects;
drop policy if exists "Public venue images are viewable by everyone" on storage.objects;
drop policy if exists "Venue media images are publicly accessible" on storage.objects;
drop policy if exists "Preview photos are publicly viewable" on storage.objects;
drop policy if exists "Thumbnail photos are publicly viewable" on storage.objects;
drop policy if exists "Watermarked photos are publicly viewable" on storage.objects;
drop policy if exists "Users can view post images" on storage.objects;
drop policy if exists "Users can view profile images" on storage.objects;

-- Policies defined in comprehensive_storage_setup (broad SELECT)
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "post-media: public read" on storage.objects;
drop policy if exists "venue-media: public read" on storage.objects;
drop policy if exists "event-media: public read" on storage.objects;
drop policy if exists "artist-merchandise: public read" on storage.objects;

create policy "avatars: public read" on storage.objects
for select using (
  bucket_id = 'avatars'
  and name is not null
  and char_length(name) <= 1024
  and name not like '%..%'
  and position('/' in name) > 0
  and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
  and nullif(split_part(name, '/', 2), '') is not null
);

create policy "post-media: public read" on storage.objects
for select using (
  bucket_id = 'post-media'
  and name is not null
  and char_length(name) <= 1024
  and name not like '%..%'
  and position('/' in name) > 0
  and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
  and nullif(split_part(name, '/', 2), '') is not null
);

create policy "venue-media: public read" on storage.objects
for select using (
  bucket_id = 'venue-media'
  and name is not null
  and char_length(name) <= 1024
  and name not like '%..%'
  and position('/' in name) > 0
  and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
  and nullif(split_part(name, '/', 2), '') is not null
);

create policy "event-media: public read" on storage.objects
for select using (
  bucket_id = 'event-media'
  and name is not null
  and char_length(name) <= 1024
  and name not like '%..%'
  and position('/' in name) > 0
  and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
  and nullif(split_part(name, '/', 2), '') is not null
);

create policy "artist-merchandise: public read" on storage.objects
for select using (
  bucket_id = 'artist-merchandise'
  and name is not null
  and char_length(name) <= 1024
  and name not like '%..%'
  and position('/' in name) > 0
  and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
  and nullif(split_part(name, '/', 2), '') is not null
);

-- Photo marketplace buckets (may exist only on some projects)
drop policy if exists "photos-preview: public read" on storage.objects;
drop policy if exists "photos-thumbnail: public read" on storage.objects;
drop policy if exists "photos-watermarked: public read" on storage.objects;
drop policy if exists "posts: public read" on storage.objects;
drop policy if exists "profiles: public read" on storage.objects;

do $body$
begin
  if exists (select 1 from storage.buckets where id = 'photos-preview') then
    execute 'drop policy if exists "photos-preview: public read" on storage.objects';
    execute $p$
      create policy "photos-preview: public read" on storage.objects
      for select using (
        bucket_id = 'photos-preview'
        and name is not null
        and char_length(name) <= 1024
        and name not like '%..%'
        and position('/' in name) > 0
        and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
        and nullif(split_part(name, '/', 2), '') is not null
      )
    $p$;
  end if;
end $body$;

do $body$
begin
  if exists (select 1 from storage.buckets where id = 'photos-thumbnail') then
    execute 'drop policy if exists "photos-thumbnail: public read" on storage.objects';
    execute $p$
      create policy "photos-thumbnail: public read" on storage.objects
      for select using (
        bucket_id = 'photos-thumbnail'
        and name is not null
        and char_length(name) <= 1024
        and name not like '%..%'
        and position('/' in name) > 0
        and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
        and nullif(split_part(name, '/', 2), '') is not null
      )
    $p$;
  end if;
end $body$;

do $body$
begin
  if exists (select 1 from storage.buckets where id = 'photos-watermarked') then
    execute 'drop policy if exists "photos-watermarked: public read" on storage.objects';
    execute $p$
      create policy "photos-watermarked: public read" on storage.objects
      for select using (
        bucket_id = 'photos-watermarked'
        and name is not null
        and char_length(name) <= 1024
        and name not like '%..%'
        and position('/' in name) > 0
        and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
        and nullif(split_part(name, '/', 2), '') is not null
      )
    $p$;
  end if;
end $body$;

do $body$
begin
  if exists (select 1 from storage.buckets where id = 'posts') then
    execute 'drop policy if exists "posts: public read" on storage.objects';
    execute $p$
      create policy "posts: public read" on storage.objects
      for select using (
        bucket_id = 'posts'
        and name is not null
        and char_length(name) <= 1024
        and name not like '%..%'
        and position('/' in name) > 0
        and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
        and nullif(split_part(name, '/', 2), '') is not null
      )
    $p$;
  end if;
end $body$;

do $body$
begin
  if exists (select 1 from storage.buckets where id = 'profiles') then
    execute 'drop policy if exists "profiles: public read" on storage.objects';
    execute $p$
      create policy "profiles: public read" on storage.objects
      for select using (
        bucket_id = 'profiles'
        and name is not null
        and char_length(name) <= 1024
        and name not like '%..%'
        and position('/' in name) > 0
        and coalesce((storage.foldername(name))[1], '') ~ '^[a-z0-9][a-z0-9_-]{0,126}$'
        and nullif(split_part(name, '/', 2), '') is not null
      )
    $p$;
  end if;
end $body$;
