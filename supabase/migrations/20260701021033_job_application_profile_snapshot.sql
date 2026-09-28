set client_min_messages = warning;

do $job_app_quick_apply$
begin
  if to_regclass('public.job_applications') is null then
    return;
  end if;

  alter table public.job_applications
    add column if not exists profile_snapshot jsonb,
    add column if not exists profile_snapshot_version text default '1',
    add column if not exists profile_shared_at timestamptz;

  alter table public.job_applications
    add column if not exists is_starred boolean not null default false,
    add column if not exists starred_at timestamptz,
    add column if not exists starred_by uuid references auth.users(id) on delete set null;

  alter table public.job_applications
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists decision_note text,
    add column if not exists reviewer_notes text;
end $job_app_quick_apply$;

create index if not exists idx_job_apps_starred
  on public.job_applications (employer_entity_type, employer_entity_id)
  where is_starred = true;

do $job_app_status_check$
declare
  r record;
begin
  if to_regclass('public.job_applications') is null then
    return;
  end if;

  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.job_applications'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.job_applications drop constraint if exists %I', r.conname);
  end loop;

  alter table public.job_applications
    add constraint job_applications_status_check
    check (status in ('pending','reviewed','shortlisted','waitlisted','approved','accepted','rejected','withdrawn'));
end $job_app_status_check$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- CREATE POLICY requires pg_class_ownercheck on the target relation, which the
-- server satisfies for the exact owner, a superuser, OR any member of the owning
-- role. A replay role that satisfies none of those aborts the whole chain with
-- SQLSTATE 42501 "must be owner of table objects", because CREATE POLICY cannot
-- be pre-checked without re-deriving that predicate. So each policy is attempted
-- inside its own subtransaction and the server's own verdict is used: whenever the
-- replay role may create the policy it is still created (identical to the
-- unguarded body), and otherwise the failure is absorbed and reported instead of
-- aborting the migration.
--
-- Skips are raised as WARNING, not NOTICE: line 1 sets client_min_messages to
-- warning, so NOTICE is suppressed and an invisible skip would hide this block
-- failing in CI.
do $app_docs_storage$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'application_documents_insert_own'
  ) then
    begin
      create policy "application_documents_insert_own"
        on storage.objects
        for insert
        to authenticated
        with check (
          bucket_id = 'application-documents'
          and (storage.foldername(name))[1] = auth.uid()::text
        );
    exception when others then
      raise warning
        'Skipping policy application_documents_insert_own on %.%: % %',
        'storage', 'objects', sqlstate, sqlerrm;
    end;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'application_documents_public_read'
  ) then
    begin
      create policy "application_documents_public_read"
        on storage.objects
        for select
        using (bucket_id = 'application-documents');
    exception when others then
      raise warning
        'Skipping policy application_documents_public_read on %.%: % %',
        'storage', 'objects', sqlstate, sqlerrm;
    end;
  end if;
exception when others then
  -- Backstop: the pg_policies existence reads above can themselves fail for a
  -- replay role with restricted catalog access. Never abort the chain here.
  raise warning
    'Could not reconcile application document storage policies on %.%: % %',
    'storage', 'objects', sqlstate, sqlerrm;
end $app_docs_storage$;
