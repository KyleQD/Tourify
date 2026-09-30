-- Workforce role catalog expansion.
-- Adds structured job-definition fields to reusable role templates and snapshots
-- the selected role definition onto job postings so later template edits do not
-- silently change the requirements of already-published jobs.

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

comment on column public.job_posting_templates.role_definition_snapshot is
  'Immutable-at-posting snapshot of the selected workforce role definition used for hiring and onboarding context.';

-- Existing role rows remain valid and receive safe empty defaults. No destructive
-- backfill is performed because historical postings may have custom requirements.
