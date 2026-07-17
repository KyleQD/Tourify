-- Phase 13 real-data verification checks.
-- Run in Supabase SQL editor or with psql against a preview database.
-- These queries should return zero rows for the *_violations checks.

-- 1. Venue-era records that still need employer scope backfill.
select 'job_posting_templates_missing_employer_scope' as check_name, id, venue_id
from public.job_posting_templates
where venue_id is not null
  and (employer_entity_type is null or employer_entity_id is null);

select 'job_applications_missing_employer_scope' as check_name, id, venue_id
from public.job_applications
where venue_id is not null
  and (employer_entity_type is null or employer_entity_id is null);

select 'staff_onboarding_candidates_missing_employer_scope' as check_name, id, venue_id
from public.staff_onboarding_candidates
where venue_id is not null
  and (employer_entity_type is null or employer_entity_id is null);

select 'staff_members_missing_employer_scope' as check_name, id, venue_id
from public.staff_members
where venue_id is not null
  and (employer_entity_type is null or employer_entity_id is null);

-- 2. Staff members created without matching Work Mode assignments.
select sm.id as staff_member_id,
       sm.user_id,
       sm.employer_entity_type,
       sm.employer_entity_id
from public.staff_members sm
left join public.employment_assignments ea
  on ea.user_id = sm.user_id
 and ea.employer_entity_type = sm.employer_entity_type
 and ea.employer_entity_id = sm.employer_entity_id
where sm.status in ('active', 'onboarded', 'completed')
  and ea.id is null;

-- 3. Completed candidates without roster rows.
-- Note: staging schema uses user_id + employer scope join (no onboarding_candidate_id column on staff_members).
select c.id as candidate_id,
       c.user_id,
       c.employer_entity_type,
       c.employer_entity_id
from public.staff_onboarding_candidates c
left join public.staff_members sm
  on sm.user_id = c.user_id
 and sm.employer_entity_type = c.employer_entity_type
 and sm.employer_entity_id = c.employer_entity_id
where c.status = 'completed'
  and sm.id is null;

-- 4. Token rows that do not point to candidate scope.
-- Note: staging schema stores candidate_id inside position_details JSONB (not a top-level column).
select si.id as invitation_id,
       si.position_details->>'candidate_id' as candidate_id,
       si.employer_entity_type,
       si.employer_entity_id,
       c.employer_entity_type as candidate_entity_type,
       c.employer_entity_id as candidate_entity_id
from public.staff_invitations si
join public.staff_onboarding_candidates c
  on c.id = (si.position_details->>'candidate_id')::uuid
where coalesce(si.employer_entity_type, c.employer_entity_type) <> c.employer_entity_type
   or coalesce(si.employer_entity_id, c.employer_entity_id) <> c.employer_entity_id;

-- 5. Staff documents missing employer scope or candidate link.
select id, candidate_id, employer_entity_type, employer_entity_id
from public.staff_documents
where candidate_id is null
   or employer_entity_type is null
   or employer_entity_id is null;

-- 6. Required Hiring Hub roster columns missing after compatibility migration.
select 'staff_members_missing_operational_column' as check_name, column_name
from (
  values
    ('onboarding_candidate_id'),
    ('onboarding_progress'),
    ('started_at'),
    ('last_active_at'),
    ('assigned_zone'),
    ('assigned_manager_id'),
    ('notes'),
    ('position')
) required(column_name)
where not exists (
  select 1
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'staff_members'
    and c.column_name = required.column_name
);

-- 7. Roster statuses outside the canonical Hiring Hub lifecycle.
select 'staff_members_invalid_status' as check_name, id, status
from public.staff_members
where status not in ('pending', 'active', 'inactive', 'suspended', 'offboarded');

-- 8. Work Mode statuses outside the canonical assignment lifecycle.
select 'employment_assignments_invalid_status' as check_name, id, status
from public.employment_assignments
where status not in ('invited', 'confirmed', 'active', 'completed', 'cancelled');

-- 9. Completed/approved onboarding candidates without active roster metadata.
select 'completed_candidate_roster_not_finalized' as check_name,
       c.id as candidate_id,
       sm.id as staff_member_id,
       sm.status as staff_member_status,
       sm.compliance_status
from public.staff_onboarding_candidates c
left join public.staff_members sm
  on sm.user_id = c.user_id
 and sm.employer_entity_type = c.employer_entity_type
 and sm.employer_entity_id = c.employer_entity_id
where c.status in ('completed', 'approved')
  and (
    sm.id is null
    or sm.status <> 'active'
    or coalesce(sm.compliance_status, '') not in ('compliant', 'approved', 'submitted')
  );
