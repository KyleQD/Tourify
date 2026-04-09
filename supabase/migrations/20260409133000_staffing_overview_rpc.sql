-- Fast aggregate RPC for staffing dashboard overview cards.
create or replace function staffing_overview_counts(p_venue_id uuid)
returns table (
  total_staff bigint,
  active_staff bigint,
  pending_applications bigint,
  onboarding_in_progress bigint,
  documents_pending_verification bigint,
  credentials_expiring_30_days bigint,
  active_assignments bigint,
  unique_roles bigint
)
language sql
stable
as $$
  with
  staff_counts as (
    select
      count(*)::bigint as total_staff,
      count(*) filter (where status = 'active')::bigint as active_staff
    from staff_members
    where venue_id = p_venue_id
  ),
  app_counts as (
    select count(*)::bigint as pending_applications
    from job_applications
    where venue_id = p_venue_id and status = 'pending'
  ),
  candidate_counts as (
    select count(*)::bigint as onboarding_in_progress
    from staff_onboarding_candidates
    where venue_id = p_venue_id and status in ('in_progress', 'pending')
  ),
  doc_counts as (
    select
      count(*) filter (where verified_status = 'pending')::bigint as documents_pending_verification,
      count(*) filter (
        where expires_at is not null
          and expires_at >= now()
          and expires_at <= (now() + interval '30 days')
      )::bigint as credentials_expiring_30_days
    from staff_documents
    where organization_id = p_venue_id
  ),
  role_counts as (
    select
      count(*)::bigint as active_assignments,
      count(distinct role_id)::bigint as unique_roles
    from rbac_user_entity_roles
    where entity_type = 'Venue'
      and entity_id = p_venue_id
      and is_active = true
  )
  select
    coalesce((select total_staff from staff_counts), 0) as total_staff,
    coalesce((select active_staff from staff_counts), 0) as active_staff,
    coalesce((select pending_applications from app_counts), 0) as pending_applications,
    coalesce((select onboarding_in_progress from candidate_counts), 0) as onboarding_in_progress,
    coalesce((select documents_pending_verification from doc_counts), 0) as documents_pending_verification,
    coalesce((select credentials_expiring_30_days from doc_counts), 0) as credentials_expiring_30_days,
    coalesce((select active_assignments from role_counts), 0) as active_assignments,
    coalesce((select unique_roles from role_counts), 0) as unique_roles
$$;
