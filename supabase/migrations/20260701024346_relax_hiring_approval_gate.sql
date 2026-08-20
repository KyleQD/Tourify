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
begin
  if new.status <> 'approved' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  select coalesce(jpt.required_certifications, '{}')
  into required_certifications
  from job_posting_templates jpt
  where jpt.id = new.job_posting_id;

  if coalesce(array_length(required_certifications, 1), 0) = 0 then
    return new;
  end if;

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

  return new;
end;
$$;;
