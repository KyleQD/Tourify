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

do $app_docs_storage$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'application_documents_insert_own'
  ) then
    create policy "application_documents_insert_own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'application-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'application_documents_public_read'
  ) then
    create policy "application_documents_public_read"
      on storage.objects
      for select
      using (bucket_id = 'application-documents');
  end if;
end $app_docs_storage$;;
