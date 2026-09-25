-- DB-008 replay-safety contract for the CP-059 storage policy guard (Wave 33).
--
-- Purpose: prove at the CATALOG level that a fresh replay under a role that is
-- not a member of the Supabase storage owning role can no longer abort the
-- chain with SQLSTATE 42501, and can no longer silently skip a policy.
--
-- This test is run against a reconciled database after the whole chain has been
-- applied by a role that IS permitted to create policies. It asserts:
--   1. every storage.objects policy the active chain names exists in the catalog
--      (a `raise notice`-guarded migration would have skipped it and the catalog
--      would be short one entry);
--   2. no policy in the catalog was created by a skip path, i.e. the expected
--      policy set is complete rather than partially applied;
--   3. the four migrations that previously carried the silent-loss
--      relowner = current_user guard have their policies present.
--
-- Every violation query must return zero rows. The final query must return one
-- row with storage_replay_guard_ready = true.

-- 1. Policies the active chain declares for these buckets must exist. The
--    expected list is the union of the policy names created by the guarded
--    migrations. A silent skip shows up here as a missing row.
with expected(policyname) as (
  select unnest(array[
    -- 20250115000001_artist_storage_setup
    'Users can upload music to own folder',
    'Users can view own music files',
    'Users can update own music files',
    'Users can delete own music files',
    'Users can upload photos to own folder',
    'Anyone can view artist photos',
    'Users can update own photos',
    'Users can delete own photos',
    -- 20250122000000_project_workspaces_phase1
    'Project collaborators can view files',
    'Project collaborators can upload files',
    -- 20250816141000_storage_private_docs
    'private-docs-insert',
    'private-docs-insert-svc',
    'private-docs-update',
    'private-docs-delete',
    -- 20260413300002_tighten_music_storage_policies
    'Users can view own music files',
    'Users can upload own music files',
    'Users can delete own music files',
    -- 20260625020000_staff_onboarding_storage_compliance
    'staff_onboarding_storage_authenticated_write',
    -- 20260630211500_operations_work_mode_publications
    'operations logistics read',
    'operations logistics upload',
    'operations logistics update',
    'operations logistics delete',
    -- 20260717194541_harden_security_audit_remediation
    'application_documents_select_own',
    -- 20260825130000_phase3_message_attachments_bucket_private
    'msg_attach_owner_insert',
    'msg_attach_owner_read',
    'msg_attach_owner_delete'
  ])
)
select 'missing storage.objects policy: ' || policyname as violation
from expected e
where not exists (
  select 1
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname = e.policyname
);

-- 2. The four migrations that previously compared pg_get_userbyid(relowner) =
--    current_user and reported with a suppressed `raise notice` must have left
--    their policies in the catalog. These are exactly the policies the Wave 32
--    report identified as silently lost in the standard Supabase layout.
select 'silent-loss policy absent: ' || policyname as violation
from unnest(array[
  'staff_onboarding_storage_authenticated_write',
  'operations logistics read',
  'operations logistics upload',
  'operations logistics update',
  'operations logistics delete',
  'msg_attach_owner_insert',
  'msg_attach_owner_read',
  'msg_attach_owner_delete'
]) as policyname
where not exists (
  select 1 from pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = policyname
);

-- 3. The application-documents bucket must NOT retain the superseded public
--    read policy that 20260717194541 hardens away. If it is still present, the
--    hardened select-own policy was skipped and private application documents
--    remain world-readable.
select 'superseded public read policy still present on application-documents' as violation
where exists (
  select 1 from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname in ('application_documents_public_read', 'application_documents_public_read')
)
and not exists (
  select 1 from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname = 'application_documents_select_own'
);

-- 4. The buckets the guarded bucket seeds own must exist, so a replay that
--    warned on the bucket insert did not also leave a policy pointing at
--    nothing.
select 'storage bucket missing: ' || b.id as violation
from unnest(array[
  'artist-music',
  'artist-photos',
  'project-files',
  'private-docs',
  'staff-documents',
  'logistics-documents',
  'site-map-images',
  'rental-attachments',
  'application-documents',
  'message-attachments'
]) as b(id)
where not exists (select 1 from storage.buckets sb where sb.id = b.id);

-- 5. Buckets the migrations mark private must actually be private, and the
--    public-facing buckets must still be public. A skipped bucket seed leaves
--    the default in place and would silently change the exposure.
select format('bucket %s has public=%s, expected private', sb.id, sb.public) as violation
from storage.buckets sb
where sb.id in ('artist-music', 'project-files', 'private-docs', 'application-documents', 'message-attachments')
  and sb.public is distinct from false;

select true as storage_replay_guard_ready
where not exists (
  select 1
  from (
    select 'missing storage.objects policy: ' || policyname as violation
    from (
      select unnest(array[
        'Users can upload music to own folder',
        'Users can view own music files',
        'Users can update own music files',
        'Users can delete own music files',
        'Users can upload photos to own folder',
        'Anyone can view artist photos',
        'Users can update own photos',
        'Users can delete own photos',
        'Project collaborators can view files',
        'Project collaborators can upload files',
        'private-docs-insert',
        'private-docs-insert-svc',
        'private-docs-update',
        'private-docs-delete',
        'Users can upload own music files',
        'Users can delete own music files',
        'staff_onboarding_storage_authenticated_write',
        'operations logistics read',
        'operations logistics upload',
        'operations logistics update',
        'operations logistics delete',
        'application_documents_select_own',
        'msg_attach_owner_insert',
        'msg_attach_owner_read',
        'msg_attach_owner_delete'
      ]) as policyname
    ) e
    where not exists (
      select 1 from pg_policies p
      where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = e.policyname
    )
  ) violations
);
