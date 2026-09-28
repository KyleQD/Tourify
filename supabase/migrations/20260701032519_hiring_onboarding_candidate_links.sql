set client_min_messages = warning;

do $hiring_onboarding_candidate_links$
begin
  if to_regclass('public.staff_onboarding_candidates') is null then
    return;
  end if;

  alter table public.staff_onboarding_candidates
    add column if not exists job_application_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists job_posting_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists template_id uuid;

  if to_regclass('public.job_applications') is not null
     and not exists (
       select 1 from information_schema.table_constraints
       where constraint_schema = 'public' and table_name = 'staff_onboarding_candidates'
         and constraint_name = 'staff_onboarding_candidates_job_application_id_fkey'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_job_application_id_fkey
      foreign key (job_application_id)
      references public.job_applications(id) on delete set null;
  end if;

  if to_regclass('public.job_posting_templates') is not null
     and not exists (
       select 1 from information_schema.table_constraints
       where constraint_schema = 'public' and table_name = 'staff_onboarding_candidates'
         and constraint_name = 'staff_onboarding_candidates_job_posting_id_fkey'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_job_posting_id_fkey
      foreign key (job_posting_id)
      references public.job_posting_templates(id) on delete set null;
  end if;

  if to_regclass('public.staff_onboarding_templates') is not null
     and not exists (
       select 1 from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY' and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_onboarding_candidates' and kcu.column_name = 'template_id'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_template_id_fkey
      foreign key (template_id)
      references public.staff_onboarding_templates(id) on delete set null not valid;
  end if;
end $hiring_onboarding_candidate_links$;

do $staff_documents_candidate_fk$
begin
  if to_regclass('public.staff_documents') is not null
     and to_regclass('public.staff_onboarding_candidates') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'staff_documents' and column_name = 'candidate_id'
     )
     and not exists (
       select 1 from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY' and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_documents' and kcu.column_name = 'candidate_id'
     )
  then
    alter table public.staff_documents
      add constraint staff_documents_candidate_id_fkey
      foreign key (candidate_id)
      references public.staff_onboarding_candidates(id) on delete cascade not valid;
  end if;
end $staff_documents_candidate_fk$;

update public.staff_onboarding_candidates c
set job_application_id = sub.extracted_id
from (
  select id, (substring(notes from 'job_application_id:([0-9a-fA-F-]{36})'))::uuid as extracted_id
  from public.staff_onboarding_candidates
  where job_application_id is null and notes ~ 'job_application_id:[0-9a-fA-F-]{36}'
) as sub
where c.id = sub.id and sub.extracted_id is not null
  and exists (select 1 from public.job_applications ja where ja.id = sub.extracted_id);

update public.staff_onboarding_candidates c
set job_posting_id = ja.job_posting_id
from public.job_applications ja
where c.job_application_id = ja.id and c.job_posting_id is null and ja.job_posting_id is not null;

create index if not exists idx_candidates_job_application on public.staff_onboarding_candidates(job_application_id);
create index if not exists idx_candidates_job_posting on public.staff_onboarding_candidates(job_posting_id);;
