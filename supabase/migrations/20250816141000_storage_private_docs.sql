set client_min_messages = warning;
-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_0$
  begin


    -- Private docs storage bucket and policies
    -- Create bucket if not exists
    insert into storage.buckets (id, name, public) values ('private-docs','private-docs', false)
    on conflict (id) do nothing;
  exception when others then
    raise warning
      'Skipping bucket seed private-docs on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_0$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_1$
  begin


    -- Enable RLS on storage.objects (default in Supabase)

    -- Allow authenticated users to upload to their org-scoped folders via API (service role) or their own user folder
    -- For download, we'll issue signed URLs via server (no broad read policy here)

    -- Write policy: allow inserts from service role or authenticated users to the bucket
    drop policy if exists "private-docs-insert" on storage.objects;

    create policy "private-docs-insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'private-docs');
  exception when others then
    raise warning
      'Skipping policy private-docs-insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_1$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_2$
  begin


    drop policy if exists "private-docs-insert-svc" on storage.objects;

    create policy "private-docs-insert-svc" on storage.objects
      for insert to service_role
      with check (bucket_id = 'private-docs');
  exception when others then
    raise warning
      'Skipping policy private-docs-insert-svc on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_2$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_3$
  begin


    -- Update policy: service role only
    drop policy if exists "private-docs-update" on storage.objects;

    create policy "private-docs-update" on storage.objects
      for update to service_role using (bucket_id = 'private-docs');
  exception when others then
    raise warning
      'Skipping policy private-docs-update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_3$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_4$
  begin


    -- Delete policy: service role only
    drop policy if exists "private-docs-delete" on storage.objects;

    create policy "private-docs-delete" on storage.objects
      for delete to service_role using (bucket_id = 'private-docs');
  exception when others then
    raise warning
      'Skipping policy private-docs-delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_4$;
