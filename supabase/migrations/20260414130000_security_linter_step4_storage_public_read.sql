set client_min_messages = warning;
-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_0$
  begin


    -- Step 4 (security linter 0025_public_bucket_allows_listing):
    -- Public buckets must not use SELECT policies that match only bucket_id (full-bucket list).
    -- Require a normal object path: first segment + at least one file segment, bounded length, no "..".

    -- Legacy / duplicate policy names (from older migrations or dashboard)
    drop policy if exists "Anyone can view avatars" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy anyone can view avatars on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_0$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_1$
  begin

    drop policy if exists "Avatar images are publicly accessible" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy avatar images are publicly accessible on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_1$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_2$
  begin

    drop policy if exists "Event media images are publicly accessible" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy event media images are publicly accessible on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_2$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_3$
  begin

    drop policy if exists "Post media images are publicly accessible" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy post media images are publicly accessible on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_3$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_4$
  begin

    drop policy if exists "Public venue images are viewable by everyone" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy public venue images are viewable by everyone on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_4$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_5$
  begin

    drop policy if exists "Venue media images are publicly accessible" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy venue media images are publicly accessible on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_5$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_6$
  begin

    drop policy if exists "Preview photos are publicly viewable" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy preview photos are publicly viewable on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_6$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_7$
  begin

    drop policy if exists "Thumbnail photos are publicly viewable" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy thumbnail photos are publicly viewable on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_7$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_8$
  begin

    drop policy if exists "Watermarked photos are publicly viewable" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy watermarked photos are publicly viewable on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_8$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_9$
  begin

    drop policy if exists "Users can view post images" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy users can view post images on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_9$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_10$
  begin

    drop policy if exists "Users can view profile images" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy users can view profile images on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_10$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_11$
  begin


    -- Policies defined in comprehensive_storage_setup (broad SELECT)
    drop policy if exists "avatars: public read" on storage.objects;


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
  exception when others then
    raise warning
      'Skipping policy avatars: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_11$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_12$
  begin

    drop policy if exists "post-media: public read" on storage.objects;


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
  exception when others then
    raise warning
      'Skipping policy post-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_12$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_13$
  begin

    drop policy if exists "venue-media: public read" on storage.objects;


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
  exception when others then
    raise warning
      'Skipping policy venue-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_13$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_14$
  begin

    drop policy if exists "event-media: public read" on storage.objects;


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
  exception when others then
    raise warning
      'Skipping policy event-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_14$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_15$
  begin

    drop policy if exists "artist-merchandise: public read" on storage.objects;


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
  exception when others then
    raise warning
      'Skipping policy artist-merchandise: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_15$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_16$
  begin


    -- Photo marketplace buckets (may exist only on some projects)
    drop policy if exists "photos-preview: public read" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy photos-preview: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_16$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_17$
  begin

    drop policy if exists "photos-thumbnail: public read" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy photos-thumbnail: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_17$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_18$
  begin

    drop policy if exists "photos-watermarked: public read" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy photos-watermarked: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_18$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_19$
  begin

    drop policy if exists "posts: public read" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy posts: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_19$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_20$
  begin

    drop policy if exists "profiles: public read" on storage.objects;
  exception when others then
    raise warning
      'Skipping policy profiles: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_20$;



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
