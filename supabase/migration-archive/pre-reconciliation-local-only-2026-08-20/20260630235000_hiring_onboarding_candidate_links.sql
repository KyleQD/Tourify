set client_min_messages = warning;

-- Repair the relational link between onboarding candidates and the hiring pipeline.
--
-- Background: on legacy/staging databases staff_onboarding_candidates.application_id
-- references staff_applications(id), not job_applications(id). The approval pipeline
-- worked around this by inserting application_id = null and stashing the job
-- application id in notes as "job_application_id:{uuid}". As a result the admin
-- onboarding list query fails with:
--   "Could not find a relationship between 'staff_onboarding_candidates'
--    and 'job_applications' in the schema cache"
-- because there is no declared FK PostgREST can embed on.
--
-- Fix: add canonical, correctly targeted columns/foreign keys and backfill existing
-- rows. Legacy application_id is left untouched to avoid breaking older data.
--
-- Safety: additive only. No drops, renames, or data resets.

do $hiring_onboarding_candidate_links$
begin
  if to_regclass('public.staff_onboarding_candidates') is null then
    return;
  end if;

  -- Canonical link to the originating job application.
  alter table public.staff_onboarding_candidates
    add column if not exists job_application_id uuid;

  -- Direct link to the job posting (avoids an impossible embed via a missing column).
  alter table public.staff_onboarding_candidates
    add column if not exists job_posting_id uuid;

  -- template_id may be missing on databases created from admin_staffing_core.
  alter table public.staff_onboarding_candidates
    add column if not exists template_id uuid;

  -- FK: job_application_id -> job_applications(id)
  if to_regclass('public.job_applications') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where constraint_schema = 'public'
         and table_name = 'staff_onboarding_candidates'
         and constraint_name = 'staff_onboarding_candidates_job_application_id_fkey'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_job_application_id_fkey
      foreign key (job_application_id)
      references public.job_applications(id) on delete set null;
  end if;

  -- FK: job_posting_id -> job_posting_templates(id)
  if to_regclass('public.job_posting_templates') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where constraint_schema = 'public'
         and table_name = 'staff_onboarding_candidates'
         and constraint_name = 'staff_onboarding_candidates_job_posting_id_fkey'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_job_posting_id_fkey
      foreign key (job_posting_id)
      references public.job_posting_templates(id) on delete set null;
  end if;

  -- FK: template_id -> staff_onboarding_templates(id). Added NOT VALID so existing
  -- rows are not re-checked, while PostgREST can still embed the relationship. Skip if
  -- any foreign key already exists on template_id (name varies across environments).
  if to_regclass('public.staff_onboarding_templates') is not null
     and not exists (
       select 1
       from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name
        and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_onboarding_candidates'
         and kcu.column_name = 'template_id'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_template_id_fkey
      foreign key (template_id)
      references public.staff_onboarding_templates(id) on delete set null
      not valid;
  end if;
end $hiring_onboarding_candidate_links$;

-- FK: staff_documents.candidate_id -> staff_onboarding_candidates(id).
-- NOT VALID to avoid failing on any pre-existing orphan document rows.
do $staff_documents_candidate_fk$
begin
  if to_regclass('public.staff_documents') is not null
     and to_regclass('public.staff_onboarding_candidates') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'staff_documents'
         and column_name = 'candidate_id'
     )
     and not exists (
       select 1
       from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name
        and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_documents'
         and kcu.column_name = 'candidate_id'
     )
  then
    alter table public.staff_documents
      add constraint staff_documents_candidate_id_fkey
      foreign key (candidate_id)
      references public.staff_onboarding_candidates(id) on delete cascade
      not valid;
  end if;
end $staff_documents_candidate_fk$;

-- Backfill job_application_id from the legacy notes workaround "job_application_id:{uuid}".
update public.staff_onboarding_candidates c
set job_application_id = sub.extracted_id
from (
  select
    id,
    (substring(notes from 'job_application_id:([0-9a-fA-F-]{36})'))::uuid as extracted_id
  from public.staff_onboarding_candidates
  where job_application_id is null
    and notes ~ 'job_application_id:[0-9a-fA-F-]{36}'
) as sub
where c.id = sub.id
  and sub.extracted_id is not null
  and exists (
    select 1 from public.job_applications ja where ja.id = sub.extracted_id
  );

-- Backfill job_posting_id from the linked job application.
update public.staff_onboarding_candidates c
set job_posting_id = ja.job_posting_id
from public.job_applications ja
where c.job_application_id = ja.id
  and c.job_posting_id is null
  and ja.job_posting_id is not null;

create index if not exists idx_candidates_job_application
  on public.staff_onboarding_candidates(job_application_id);

create index if not exists idx_candidates_job_posting
  on public.staff_onboarding_candidates(job_posting_id);
