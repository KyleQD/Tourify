-- Cached staffing summary snapshots for dashboard hot paths

create table if not exists staffing_overview_cache (
  venue_id uuid primary key,
  total_staff bigint not null default 0,
  active_staff bigint not null default 0,
  pending_applications bigint not null default 0,
  onboarding_in_progress bigint not null default 0,
  documents_pending_verification bigint not null default 0,
  credentials_expiring_30_days bigint not null default 0,
  active_assignments bigint not null default 0,
  unique_roles bigint not null default 0,
  agreements_pending bigint not null default 0,
  refreshed_at timestamptz not null default now()
);

create index if not exists idx_staffing_overview_cache_refreshed
  on staffing_overview_cache(refreshed_at desc);

create or replace function refresh_staffing_overview_cache(p_venue_id uuid)
returns void
language plpgsql
as $$
declare
  v_total_staff bigint := 0;
  v_active_staff bigint := 0;
  v_pending_applications bigint := 0;
  v_onboarding_in_progress bigint := 0;
  v_documents_pending_verification bigint := 0;
  v_credentials_expiring_30_days bigint := 0;
  v_active_assignments bigint := 0;
  v_unique_roles bigint := 0;
  v_agreements_pending bigint := 0;
begin
  select
    total_staff,
    active_staff,
    pending_applications,
    onboarding_in_progress,
    documents_pending_verification,
    credentials_expiring_30_days,
    active_assignments,
    unique_roles
  into
    v_total_staff,
    v_active_staff,
    v_pending_applications,
    v_onboarding_in_progress,
    v_documents_pending_verification,
    v_credentials_expiring_30_days,
    v_active_assignments,
    v_unique_roles
  from staffing_overview_counts(p_venue_id)
  limit 1;

  select count(*)::bigint into v_agreements_pending
  from staff_onboarding_candidates c
  where c.venue_id = p_venue_id
    and c.user_id is not null
    and not exists (
      select 1
      from agreement_acceptances aa
      where aa.organization_id = p_venue_id
        and aa.user_id = c.user_id
    );

  insert into staffing_overview_cache (
    venue_id,
    total_staff,
    active_staff,
    pending_applications,
    onboarding_in_progress,
    documents_pending_verification,
    credentials_expiring_30_days,
    active_assignments,
    unique_roles,
    agreements_pending,
    refreshed_at
  )
  values (
    p_venue_id,
    coalesce(v_total_staff, 0),
    coalesce(v_active_staff, 0),
    coalesce(v_pending_applications, 0),
    coalesce(v_onboarding_in_progress, 0),
    coalesce(v_documents_pending_verification, 0),
    coalesce(v_credentials_expiring_30_days, 0),
    coalesce(v_active_assignments, 0),
    coalesce(v_unique_roles, 0),
    coalesce(v_agreements_pending, 0),
    now()
  )
  on conflict (venue_id)
  do update set
    total_staff = excluded.total_staff,
    active_staff = excluded.active_staff,
    pending_applications = excluded.pending_applications,
    onboarding_in_progress = excluded.onboarding_in_progress,
    documents_pending_verification = excluded.documents_pending_verification,
    credentials_expiring_30_days = excluded.credentials_expiring_30_days,
    active_assignments = excluded.active_assignments,
    unique_roles = excluded.unique_roles,
    agreements_pending = excluded.agreements_pending,
    refreshed_at = excluded.refreshed_at;
end;
$$;
