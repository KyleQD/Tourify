set client_min_messages = warning;

-- Application documents contain applicant resumes/portfolios and must not be
-- exposed through public storage URLs. Access is brokered by authenticated app
-- routes that mint short-lived signed URLs after applicant/reviewer checks.

update storage.buckets
   set public = false,
       file_size_limit = coalesce(file_size_limit, 10485760),
       allowed_mime_types = coalesce(
         allowed_mime_types,
         array[
           'application/pdf',
           'image/jpeg',
           'image/png',
           'image/webp',
           'application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
         ]
       )
 where id = 'application-documents';

drop policy if exists "application_documents_public_read" on storage.objects;

do $application_documents_storage_hardening$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'application_documents_select_own'
  ) then
    create policy "application_documents_select_own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'application-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $application_documents_storage_hardening$;
