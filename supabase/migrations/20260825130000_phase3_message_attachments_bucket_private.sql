-- PHASE 3 (ADM-M-010 / P1-07): message-attachments storage bucket promoted
-- from migration-archive into the active chain.
--
-- Security posture corrected during promotion (P1-08): the archived policy
-- granted public read ("Anyone can read message attachments"). Chat
-- attachments are private content; access is now participant-scoped by user
-- folder prefix with short-lived signed URLs issued server-side. The inbox
-- client is migrated off getPublicUrl separately (Phase 7).

set client_min_messages = warning;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do update set public = false;

-- Owner-scoped folder prefix: attachments upload to {auth.uid()}/...
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
