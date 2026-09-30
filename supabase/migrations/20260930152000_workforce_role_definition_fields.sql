-- Workforce role catalog expansion.
-- Adds structured job-definition fields to reusable role templates and snapshots
-- the selected role definition onto job postings so later template edits do not
-- silently change the requirements of already-published jobs.

-- Bootstrap the reusable role table for environments whose migration history
-- predates the role-template migration. CREATE/ALTER statements are idempotent.
create table if not exists public.role_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  department text not null,
  role_category text not null default 'general'
    check (role_category in (
      'bar_service','security','technical','production','hospitality',
      'creative','operations','management','general'
    )),
  employment_type text not null default 'part_time'
    check (employment_type in ('full_time','part_time','contractor','volunteer','intern')),
  permissions jsonb not null default '{}'::jsonb,
  required_documents text[] not null default '{}',
  required_credentials jsonb not null default '[]'::jsonb,
  estimated_onboarding_days integer not null default 7,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  owner_entity_type text check (owner_entity_type in ('venue','organization')),
  owner_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_role_templates_global_key
  on public.role_templates (key) where owner_entity_id is null;
create unique index if not exists idx_role_templates_owner_key
  on public.role_templates (owner_entity_id, key) where owner_entity_id is not null;
create index if not exists idx_role_templates_owner
  on public.role_templates (owner_entity_type, owner_entity_id);

alter table public.employment_assignments
  add column if not exists role_template_id uuid references public.role_templates(id) on delete set null,
  add column if not exists role_category text;

create index if not exists idx_employment_assignments_role_template
  on public.employment_assignments (role_template_id);

-- Expand legacy job classification constraints so the workforce catalog can use
-- stable role slugs instead of the original six-role beta enum.
alter table public.job_posting_templates
  drop constraint if exists job_posting_templates_role_type_check,
  drop constraint if exists job_posting_templates_employment_type_check,
  drop constraint if exists job_posting_templates_experience_level_check;

alter table public.job_posting_templates
  add constraint job_posting_templates_role_type_check
    check (role_type is null or role_type ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  add constraint job_posting_templates_employment_type_check
    check (employment_type is null or employment_type in ('full_time','part_time','contractor','volunteer','intern')),
  add constraint job_posting_templates_experience_level_check
    check (experience_level is null or experience_level in ('entry','mid','senior','executive','any'));

do $$
begin
  if to_regclass('public.job_board_postings') is not null then
    alter table public.job_board_postings
      drop constraint if exists job_board_postings_role_type_check,
      drop constraint if exists job_board_postings_employment_type_check,
      drop constraint if exists job_board_postings_experience_level_check;
    alter table public.job_board_postings
      add constraint job_board_postings_role_type_check
        check (role_type is null or role_type ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
      add constraint job_board_postings_employment_type_check
        check (employment_type in ('full_time','part_time','contractor','volunteer','intern')),
      add constraint job_board_postings_experience_level_check
        check (experience_level in ('entry','mid','senior','executive','any'));
  end if;

  if to_regclass('public.organization_job_postings') is not null then
    alter table public.organization_job_postings
      drop constraint if exists organization_job_postings_role_type_check,
      drop constraint if exists organization_job_postings_employment_type_check,
      drop constraint if exists organization_job_postings_experience_level_check;
    alter table public.organization_job_postings
      add constraint organization_job_postings_role_type_check
        check (role_type is null or role_type ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
      add constraint organization_job_postings_employment_type_check
        check (employment_type in ('full_time','part_time','contractor','volunteer','intern')),
      add constraint organization_job_postings_experience_level_check
        check (experience_level in ('entry','mid','senior','executive','any'));
  end if;
end $$;

alter table public.role_templates
  add column if not exists job_summary text,
  add column if not exists duties text[] not null default '{}',
  add column if not exists qualifications text[] not null default '{}',
  add column if not exists essentials text[] not null default '{}',
  add column if not exists workflow_requirements jsonb not null default '{}'::jsonb;

comment on column public.role_templates.job_summary is
  'Plain-language definition of the role and its purpose in live-event operations.';
comment on column public.role_templates.duties is
  'Default operational duties/responsibilities for jobs using this role.';
comment on column public.role_templates.qualifications is
  'Default experience, knowledge and skill qualifications for this role.';
comment on column public.role_templates.essentials is
  'Essential role conditions, access, communication and operational prerequisites.';
comment on column public.role_templates.workflow_requirements is
  'Management workflow integration metadata such as scheduling, credentials, communications, incident reporting and handoffs.';

alter table public.job_posting_templates
  add column if not exists role_template_id uuid references public.role_templates(id) on delete set null,
  add column if not exists role_essentials text[] not null default '{}',
  add column if not exists required_credentials jsonb not null default '[]'::jsonb,
  add column if not exists workflow_requirements jsonb not null default '{}'::jsonb,
  add column if not exists role_definition_snapshot jsonb;

create index if not exists idx_job_posting_templates_role_template
  on public.job_posting_templates (role_template_id);

alter table public.employment_assignments
  add column if not exists role_key text,
  add column if not exists role_definition_snapshot jsonb;

create index if not exists idx_employment_assignments_role_key
  on public.employment_assignments (role_key);

comment on column public.job_posting_templates.role_definition_snapshot is
  'Immutable-at-posting snapshot of the selected workforce role definition used for hiring and onboarding context.';
comment on column public.employment_assignments.role_key is
  'Stable workforce role key copied from the job posting for Work Mode and management surfaces.';
comment on column public.employment_assignments.role_definition_snapshot is
  'Role definition snapshot copied from the hiring job so workforce management preserves the original duties, qualifications, credentials, essentials, and workflow.';


-- Role-template access: global definitions are readable by authenticated users;
-- entity-owned overrides remain scoped to the venue/organization owner.
alter table public.role_templates enable row level security;

drop policy if exists role_templates_read on public.role_templates;
create policy role_templates_read on public.role_templates
  for select
  using (
    owner_entity_id is null
    or (
      owner_entity_type = 'venue'
      and owner_entity_id in (select id from public.venue_profiles where user_id = auth.uid())
    )
    or (
      owner_entity_type = 'organization'
      and owner_entity_id in (select id from public.organizer_accounts where user_id = auth.uid())
    )
  );

drop policy if exists role_templates_insert_own on public.role_templates;
create policy role_templates_insert_own on public.role_templates
  for insert
  with check (
    (
      owner_entity_type = 'venue'
      and owner_entity_id in (select id from public.venue_profiles where user_id = auth.uid())
    )
    or (
      owner_entity_type = 'organization'
      and owner_entity_id in (select id from public.organizer_accounts where user_id = auth.uid())
    )
  );

drop policy if exists role_templates_update_own on public.role_templates;
create policy role_templates_update_own on public.role_templates
  for update
  using (
    (
      owner_entity_type = 'venue'
      and owner_entity_id in (select id from public.venue_profiles where user_id = auth.uid())
    )
    or (
      owner_entity_type = 'organization'
      and owner_entity_id in (select id from public.organizer_accounts where user_id = auth.uid())
    )
  );

drop policy if exists role_templates_delete_own on public.role_templates;
create policy role_templates_delete_own on public.role_templates
  for delete
  using (
    (
      owner_entity_type = 'venue'
      and owner_entity_id in (select id from public.venue_profiles where user_id = auth.uid())
    )
    or (
      owner_entity_type = 'organization'
      and owner_entity_id in (select id from public.organizer_accounts where user_id = auth.uid())
    )
  );

-- Existing role rows remain valid and receive safe empty defaults. No destructive
-- backfill is performed because historical postings may have custom requirements.
