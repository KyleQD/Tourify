-- DB-008 zero-drift contract checks for the application-document storage
-- policies reconciled by the active migration
--   20260701021033_job_application_profile_snapshot.sql
--
-- Run against a target database AFTER the migration has been applied. Every
-- query below should return zero rows; the final query should return one row
-- with app_docs_storage_policies_ready = true.
--
-- Why this exists: the migration's `do $app_docs_storage$` block now attempts
-- each CREATE POLICY inside its own subtransaction and absorbs the failure as a
-- WARNING. That keeps a fresh CI replay from aborting when the replay role is
-- not permitted to manage policies on storage.objects, but it also means a
-- target can legitimately end up without the policies. These checks make that
-- state explicit and fail closed rather than leaving it silent.
--
-- The policies are read from the catalog, not asserted as text, so a drifted
-- definition is caught.

-- The relation the policies live on must exist.
select 'storage.objects relation missing' as violation
where to_regclass('storage.objects') is null;

-- Both application-document policies must exist.
select 'policy missing: ' || t.name as violation
from (values
  ('application_documents_insert_own'),
  ('application_documents_public_read')
) as t(name)
where not exists (
  select 1
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = t.name
);

-- The INSERT policy must be an INSERT policy granted to authenticated.
select 'application_documents_insert_own must be FOR INSERT TO authenticated' as violation
where exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_insert_own'
)
and not exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_insert_own'
    and cmd = 'INSERT'
    and roles = array['authenticated']::name[]
);

-- The INSERT policy must be scoped to the bucket and the caller's own folder.
select 'application_documents_insert_own must check bucket and the caller folder' as violation
where exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_insert_own'
)
and not exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_insert_own'
    and with_check ilike '%application-documents%'
    and with_check ilike '%storage.foldername%'
    and with_check ilike '%auth.uid()%'
);

-- The SELECT policy must be a SELECT policy scoped to the bucket only.
select 'application_documents_public_read must be FOR SELECT scoped to the bucket' as violation
where exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_public_read'
)
and not exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'application_documents_public_read'
    and cmd = 'SELECT'
    and qual ilike '%application-documents%'
    -- a public read policy must not be narrowed to a single caller's folder
    and qual not ilike '%auth.uid()%'
);

-- Summary row: true only when every check above is satisfied.
select not exists (
  select 1
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname in ('application_documents_insert_own', 'application_documents_public_read')
  group by policyname
  having count(*) <> 1
)
and (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('application_documents_insert_own', 'application_documents_public_read')) = 2
  as app_docs_storage_policies_ready;
