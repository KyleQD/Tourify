-- Phase 11 — Staff onboarding storage, document metadata, and compliance helpers.
-- This migration is additive and safe to run after Phase 1.
-- Do not reset the database. Do not drop venue_id.

begin;

-- -----------------------------------------------------------------------------
-- Storage buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'staff-documents',
    'staff-documents',
    false,
    20971520,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'staff-certifications',
    'staff-certifications',
    false,
    10485760,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'staff-id-documents',
    'staff-id-documents',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'staff-waivers',
    'staff-waivers',
    false,
    10485760,
    array['application/pdf']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- staff_documents metadata. Create the table only if a repo does not already have it.
-- Cursor should merge this with the existing table if present.
-- -----------------------------------------------------------------------------
create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  candidate_id uuid,
  staff_member_id uuid,
  venue_id uuid,
  employer_entity_type text check (employer_entity_type in ('venue', 'organization', 'artist')),
  employer_entity_id uuid,
  field_id text,
  label text,
  document_type text not null default 'general_document',
  credential_type text,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  status text not null default 'uploaded' check (status in ('missing', 'uploaded', 'needs_review', 'approved', 'rejected', 'expired')),
  expires_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists employer_entity_type text check (employer_entity_type in ('venue', 'organization', 'artist')),
  add column if not exists employer_entity_id uuid,
  add column if not exists candidate_id uuid,
  add column if not exists staff_member_id uuid,
  add column if not exists field_id text,
  add column if not exists label text,
  add column if not exists document_type text default 'general_document',
  add column if not exists credential_type text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint default 0,
  add column if not exists status text default 'uploaded',
  add column if not exists expires_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

-- Legacy rows use owner_user_id; universal hiring upload service expects user_id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'owner_user_id'
  )
  and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'user_id'
  ) then
    execute $sql$
      update public.staff_documents
      set user_id = owner_user_id
      where user_id is null
        and owner_user_id is not null
    $sql$;
  end if;
end $$;

update public.staff_documents
set employer_entity_type = 'venue',
    employer_entity_id = venue_id
where employer_entity_type is null
  and employer_entity_id is null
  and venue_id is not null;

create index if not exists idx_staff_documents_employer
on public.staff_documents (employer_entity_type, employer_entity_id);

create index if not exists idx_staff_documents_candidate
on public.staff_documents (candidate_id);

create index if not exists idx_staff_documents_staff_member
on public.staff_documents (staff_member_id);

create index if not exists idx_staff_documents_status
on public.staff_documents (status);

create index if not exists idx_staff_documents_storage_path
on public.staff_documents (storage_bucket, storage_path);

-- -----------------------------------------------------------------------------
-- Candidate compliance columns
-- -----------------------------------------------------------------------------
alter table public.staff_onboarding_candidates
  add column if not exists compliance_status text default 'not_started',
  add column if not exists compliance_issues jsonb not null default '[]'::jsonb,
  add column if not exists compliance_checked_at timestamptz;

-- -----------------------------------------------------------------------------
-- Staff member compliance columns
-- -----------------------------------------------------------------------------
alter table public.staff_members
  add column if not exists compliance_status text default 'not_started',
  add column if not exists compliance_checked_at timestamptz;

-- -----------------------------------------------------------------------------
-- Storage policies. These policies rely on service-role uploads for Phase 11 routes.
-- End-user direct client uploads should be added only after token/session scoped storage
-- paths are finalized.
-- -----------------------------------------------------------------------------
alter table public.staff_documents enable row level security;

do $$
declare
  v_owner_clause text := 'false';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'user_id'
  ) then
    v_owner_clause := 'user_id = auth.uid()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'owner_user_id'
  ) then
    if v_owner_clause <> 'false' then
      v_owner_clause := v_owner_clause || ' or owner_user_id = auth.uid()';
    else
      v_owner_clause := 'owner_user_id = auth.uid()';
    end if;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_documents' and policyname = 'staff_documents_select_by_employer'
  ) then
    execute format(
      'create policy "staff_documents_select_by_employer"
       on public.staff_documents
       for select
       to authenticated
       using (
         public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
         or (%s)
       )',
      v_owner_clause
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_documents' and policyname = 'staff_documents_update_by_employer'
  ) then
    create policy "staff_documents_update_by_employer"
    on public.staff_documents
    for update
    to authenticated
    using (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))
    with check (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id));
  end if;
end $$;

do $$
declare
  v_owner_clause text := 'false';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'user_id'
  ) then
    v_owner_clause := 'user_id = auth.uid()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'owner_user_id'
  ) then
    if v_owner_clause <> 'false' then
      v_owner_clause := v_owner_clause || ' or owner_user_id = auth.uid()';
    else
      v_owner_clause := 'owner_user_id = auth.uid()';
    end if;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_documents' and policyname = 'staff_documents_insert_by_employer'
  ) then
    execute format(
      'create policy "staff_documents_insert_by_employer"
       on public.staff_documents
       for insert
       to authenticated
       with check (
         public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
         or (%s)
       )',
      v_owner_clause
    );
  end if;
end $$;

-- Keep storage object access private. API routes should generate signed URLs after
-- validating token/session scope. This policy allows authenticated writes only to
-- the private staff buckets. Tighten path-specific rules if the app later supports
-- direct browser-to-storage uploads.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'staff_onboarding_storage_authenticated_write'
  ) then
    create policy "staff_onboarding_storage_authenticated_write"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id in ('staff-documents', 'staff-certifications', 'staff-id-documents', 'staff-waivers'));
  end if;
end $$;

commit;
