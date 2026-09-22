-- Cover the job lineage foreign keys added to organization seats so approval
-- lookups and parent-row deletes do not require full membership scans.
create index if not exists org_members_job_posting_idx
  on public.org_members(job_posting_id)
  where job_posting_id is not null;

create index if not exists org_members_job_application_idx
  on public.org_members(job_application_id)
  where job_application_id is not null;
