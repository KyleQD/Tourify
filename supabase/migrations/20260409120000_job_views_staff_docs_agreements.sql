-- Atomic view counter for job posting templates (avoid read-modify-write races)
create or replace function increment_job_posting_views(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update job_posting_templates
  set views_count = coalesce(views_count, 0) + 1,
      updated_at = now()
  where id = p_job_id;
end;
$$;

-- Staff documents registry (metadata + paths; files live in Supabase Storage)
create table if not exists staff_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  staff_member_id uuid,
  candidate_id uuid,
  document_type text not null,
  storage_bucket text not null default 'profile-images',
  storage_path text not null,
  verified_status text not null default 'pending' check (verified_status in ('pending', 'approved', 'rejected', 'expired')),
  expires_at timestamptz,
  retention_policy_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed (from an older migration without all columns),
-- add any missing columns so the index and RLS policies below succeed.
-- Columns are added without NOT NULL to avoid failures on existing rows.
alter table staff_documents add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table staff_documents add column if not exists organization_id uuid;
alter table staff_documents add column if not exists staff_member_id uuid;
alter table staff_documents add column if not exists candidate_id uuid;
alter table staff_documents add column if not exists document_type text;
alter table staff_documents add column if not exists storage_bucket text default 'profile-images';
alter table staff_documents add column if not exists storage_path text;
alter table staff_documents add column if not exists verified_status text default 'pending';
alter table staff_documents add column if not exists expires_at timestamptz;
alter table staff_documents add column if not exists retention_policy_id uuid;
alter table staff_documents add column if not exists metadata jsonb default '{}';

create index if not exists idx_staff_documents_owner on staff_documents(owner_user_id);
create index if not exists idx_staff_documents_org on staff_documents(organization_id);
create index if not exists idx_staff_documents_candidate on staff_documents(candidate_id);

drop trigger if exists trg_staff_documents_touch on staff_documents;
create trigger trg_staff_documents_touch
  before update on staff_documents
  for each row execute function touch_updated_at();

alter table staff_documents enable row level security;

drop policy if exists staff_documents_select_own on staff_documents;
create policy staff_documents_select_own on staff_documents
  for select using (auth.uid() = owner_user_id);

drop policy if exists staff_documents_insert_own on staff_documents;
create policy staff_documents_insert_own on staff_documents
  for insert with check (auth.uid() = owner_user_id);

drop policy if exists staff_documents_update_own on staff_documents;
create policy staff_documents_update_own on staff_documents
  for update using (auth.uid() = owner_user_id);

-- Agreement templates (org-supplied copy; versioning)
create table if not exists agreement_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  slug text not null,
  title text not null,
  body_markdown text,
  version int not null default 1,
  jurisdiction_hint text,
  created_at timestamptz not null default now(),
  unique (organization_id, slug, version)
);

create index if not exists idx_agreement_templates_org on agreement_templates(organization_id);

alter table agreement_templates enable row level security;

drop policy if exists agreement_templates_read on agreement_templates;
create policy agreement_templates_read on agreement_templates
  for select using (auth.role() = 'authenticated');

-- Acceptance ledger (append-only style updates discouraged in app code)
create table if not exists agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references agreement_templates(id) on delete set null,
  template_version int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  context text,
  signature_method text,
  ip text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_agreement_acceptances_user on agreement_acceptances(user_id);
create index if not exists idx_agreement_acceptances_template on agreement_acceptances(template_id);

alter table agreement_acceptances enable row level security;

drop policy if exists agreement_acceptances_select_own on agreement_acceptances;
create policy agreement_acceptances_select_own on agreement_acceptances
  for select using (auth.uid() = user_id);

drop policy if exists agreement_acceptances_insert_own on agreement_acceptances;
create policy agreement_acceptances_insert_own on agreement_acceptances
  for insert with check (auth.uid() = user_id);
