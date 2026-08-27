set client_min_messages = warning;

alter table if exists public.job_posting_templates
  add column if not exists archived_at timestamptz,
  add column if not exists filled_at timestamptz;

alter table if exists public.hiring_audit_events
  add column if not exists employer_entity_type text,
  add column if not exists employer_entity_id uuid,
  add column if not exists event_type text,
  add column if not exists subject_type text,
  add column if not exists subject_id uuid;

alter table if exists public.hiring_audit_events
  alter column application_id drop not null;

alter table if exists public.job_posting_templates
  drop constraint if exists job_posting_templates_status_check;

alter table if exists public.job_posting_templates
  drop constraint if exists job_postings_status_check;

do $$
begin
  if to_regclass('public.job_posting_templates') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.job_posting_templates'::regclass
        and conname = 'job_posting_templates_status_check'
    )
  then
    alter table public.job_posting_templates
      add constraint job_posting_templates_status_check
      check (status in ('draft', 'published', 'paused', 'closed', 'filled', 'archived'))
      not valid;
  end if;
end
$$;

create index if not exists idx_job_posting_templates_employer_status_created
  on public.job_posting_templates (employer_entity_type, employer_entity_id, status, created_at desc);

create index if not exists idx_job_applications_employer_job_status
  on public.job_applications (employer_entity_type, employer_entity_id, job_posting_id, status);

create index if not exists idx_onboarding_candidates_employer_job_status
  on public.staff_onboarding_candidates (employer_entity_type, employer_entity_id, job_posting_id, status);

create index if not exists idx_staff_members_employer_candidate_status
  on public.staff_members (employer_entity_type, employer_entity_id, onboarding_candidate_id, status)
  where onboarding_candidate_id is not null;

create index if not exists idx_hiring_audit_employer_created
  on public.hiring_audit_events (employer_entity_type, employer_entity_id, created_at desc);
