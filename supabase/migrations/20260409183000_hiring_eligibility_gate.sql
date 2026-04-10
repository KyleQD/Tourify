-- Hiring eligibility gate hardening + snapshot ledger

create table if not exists hiring_eligibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  venue_id uuid,
  job_posting_id uuid,
  is_eligible boolean not null,
  mode text not null default 'enforce' check (mode in ('off', 'shadow', 'enforce')),
  blocking_reasons jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hiring_eligibility_snapshots_application_created
  on hiring_eligibility_snapshots(application_id, created_at desc);

create index if not exists idx_hiring_eligibility_snapshots_applicant_created
  on hiring_eligibility_snapshots(applicant_id, created_at desc);

alter table hiring_eligibility_snapshots enable row level security;

drop policy if exists hiring_eligibility_snapshots_read on hiring_eligibility_snapshots;
create policy hiring_eligibility_snapshots_read on hiring_eligibility_snapshots
  for select using (auth.role() = 'authenticated');

drop policy if exists hiring_eligibility_snapshots_insert on hiring_eligibility_snapshots;
create policy hiring_eligibility_snapshots_insert on hiring_eligibility_snapshots
  for insert with check (auth.role() = 'authenticated');

create or replace function enforce_job_application_approval_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_certifications text[];
  cert text;
  normalized_cert text;
  has_required_certification boolean;
  has_verified_document boolean;
  has_signed_agreement boolean;
begin
  if new.status <> 'approved' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  select exists(
    select 1
    from staff_documents d
    where d.owner_user_id = new.applicant_id
      and d.verified_status = 'approved'
      and (d.expires_at is null or d.expires_at > now())
  )
  into has_verified_document;

  if not has_verified_document then
    raise exception 'HIRING_GATE_BLOCKED: missing_verified_document';
  end if;

  select exists(
    select 1
    from agreement_acceptances aa
    where aa.user_id = new.applicant_id
      and (aa.organization_id is null or aa.organization_id = new.venue_id)
  )
  into has_signed_agreement;

  if not has_signed_agreement then
    raise exception 'HIRING_GATE_BLOCKED: agreement_not_signed';
  end if;

  select coalesce(jpt.required_certifications, '{}')
  into required_certifications
  from job_posting_templates jpt
  where jpt.id = new.job_posting_id;

  if coalesce(array_length(required_certifications, 1), 0) > 0 then
    foreach cert in array required_certifications loop
      normalized_cert := regexp_replace(lower(cert), '[^a-z0-9]+', '-', 'g');
      normalized_cert := regexp_replace(normalized_cert, '(^-+|-+$)', '', 'g');

      select exists(
        select 1
        from staff_documents d
        where d.owner_user_id = new.applicant_id
          and d.verified_status = 'approved'
          and (d.expires_at is null or d.expires_at > now())
          and (
            d.document_type = concat('certification:', normalized_cert)
            or d.document_type ilike concat('%', normalized_cert, '%')
          )
      )
      into has_required_certification;

      if not has_required_certification then
        raise exception 'HIRING_GATE_BLOCKED: required_certifications_missing';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_job_application_approval_gate on job_applications;
create trigger trg_enforce_job_application_approval_gate
  before update of status on job_applications
  for each row
  execute function enforce_job_application_approval_gate();
