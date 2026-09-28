-- PHASE 3 (ADM-M-010 / P1-07): message-attachments storage bucket promoted
-- from migration-archive into the active chain.
--
-- Security posture corrected during promotion (P1-08): the archived policy
-- granted public read ("Anyone can read message attachments"). Chat
-- attachments are private content; access is now participant-scoped by user
-- folder prefix with short-lived signed URLs issued server-side. The inbox
-- client is migrated off getPublicUrl separately (Phase 7).

set client_min_messages = warning;

-- [CP-059 replay guard] storage.buckets is owned by the Supabase storage role,
-- so a replay role outside that owning role set must not be able to abort the
-- whole chain here. The server decides; a refusal is reported as a warning.
do $message_attachments_bucket$
begin
  insert into storage.buckets (id, name, public)
  values ('message-attachments', 'message-attachments', false)
  on conflict (id) do update set public = false;
exception when others then
  raise warning
    'Skipping message-attachments bucket seed on %.%: % %',
    'storage', 'buckets', sqlstate, sqlerrm;
end
$message_attachments_bucket$;

-- Owner-scoped folder prefix: attachments upload to {auth.uid()}/...
-- [CP-059 replay guard] The previous guard here compared
-- pg_get_userbyid(relowner) = current_user and then reported with `raise notice`.
-- Both halves were wrong for a fresh replay:
--   * `relowner = current_user` is a strict SUBSET of the server's
--     pg_class_ownercheck predicate, which also admits a superuser and any
--     member of the owning role. In the standard Supabase layout the migration
--     role is `postgres` (superuser, not owner), so the guard skipped every
--     policy while the server would have accepted all of them: silent loss.
--   * `raise notice` is suppressed by `set client_min_messages = warning`, so
--     the skip reported nothing at all.
-- The server is now asked directly: each statement runs in its own
-- subtransaction and a refusal is reported as a warning carrying sqlstate.
do $message_attachments_storage_policies$
begin
  begin
    drop policy if exists "Anyone can read message attachments" on storage.objects;
    drop policy if exists "msg_attach_owner_insert" on storage.objects;
    drop policy if exists "msg_attach_owner_read" on storage.objects;
    drop policy if exists "msg_attach_owner_delete" on storage.objects;

    create policy "msg_attach_owner_insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'message-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "msg_attach_owner_read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'message-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );

    create policy "msg_attach_owner_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'message-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping message attachment owner policies on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
end
$message_attachments_storage_policies$;
