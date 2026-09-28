-- Harden applicant document storage for production.
-- This bucket must not expose uploaded applicant documents via public URLs.

update storage.buckets
   set public = false
 where id = 'application-documents';

drop policy if exists "application_documents_public_read" on storage.objects;
drop policy if exists "application_documents_select_own" on storage.objects;

create policy "application_documents_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-documents'
    and owner = auth.uid()
  );

-- Materialized views cannot enforce security_invoker like normal views.
-- Keep direct Data API access closed; expose forum data through guarded routes/RPCs.
revoke all on table public.forum_threads_hot_mv from anon, authenticated;
revoke all on table public.forum_threads_top_mv from anon, authenticated;
