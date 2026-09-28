-- Repair the event/tour staffing persistence contract.
-- Event staffing is organization scoped even when no physical venue is attached.

alter table public.staff_members
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

alter table public.staff_shifts
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

-- Preserve existing rows without inventing tenant ownership. Canonical entity
-- and event relationships are the only accepted sources for organization scope.
update public.staff_members sm
set org_id = sm.entity_id
where sm.org_id is null
  and sm.entity_type = 'org'
  and exists (
    select 1
    from public.organizations organization
    where organization.id = sm.entity_id
  );

update public.staff_members sm
set org_id = event.org_id
from public.events_v2 event
where sm.org_id is null
  and sm.entity_type = 'event'
  and sm.entity_id = event.id
  and event.org_id is not null;

update public.staff_shifts shift
set org_id = event.org_id
from public.events_v2 event
where shift.org_id is null
  and shift.event_id = event.id
  and event.org_id is not null;

create index if not exists staff_members_org_idx
  on public.staff_members(org_id)
  where org_id is not null;

create index if not exists staff_shifts_org_idx
  on public.staff_shifts(org_id)
  where org_id is not null;

alter table public.staff_shifts
  alter column venue_id drop not null;

alter table public.staff_shifts
  drop constraint if exists staff_shifts_requires_scope;

alter table public.staff_shifts
  add constraint staff_shifts_requires_scope
  check (org_id is not null or venue_id is not null) not valid;

alter table public.staff_shifts
  validate constraint staff_shifts_requires_scope;

alter table public.staff_invitations
  add column if not exists event_id uuid;

alter table public.staff_invitations
  drop constraint if exists staff_invitations_event_id_fkey;

alter table public.staff_invitations
  add constraint staff_invitations_event_id_fkey
  foreign key (event_id) references public.events_v2(id) on delete cascade not valid;

alter table public.staff_invitations
  validate constraint staff_invitations_event_id_fkey;

create index if not exists staff_invitations_event_idx
  on public.staff_invitations(event_id)
  where event_id is not null;

alter table public.employment_assignments
  drop constraint if exists employment_assignments_assignment_kind_check;

alter table public.employment_assignments
  add constraint employment_assignments_assignment_kind_check
  check (assignment_kind in ('event', 'shift', 'tour', 'legacy_engagement')) not valid;

alter table public.employment_assignments
  validate constraint employment_assignments_assignment_kind_check;

-- Idempotency keys used by the server-side provisioning flow.
create unique index if not exists staff_members_org_user_key
  on public.staff_members(org_id, user_id)
  where org_id is not null and user_id is not null;

create unique index if not exists staff_onboarding_candidates_invitation_token_key
  on public.staff_onboarding_candidates(invitation_token)
  where invitation_token is not null;

create unique index if not exists employment_assignments_active_tour_key
  on public.employment_assignments(employer_entity_id, user_id, tour_id)
  where employer_entity_type = 'organization'
    and employer_entity_id is not null
    and tour_id is not null
    and status in ('invited', 'confirmed', 'active');

create unique index if not exists staff_shifts_exact_active_key
  on public.staff_shifts(event_id, staff_member_id, shift_date, start_time, end_time)
  where event_id is not null
    and staff_member_id is not null
    and deleted_at is null
    and coalesce(status, 'scheduled') not in ('cancelled', 'declined');

alter table public.staff_shifts enable row level security;

drop policy if exists insert_shifts on public.staff_shifts;
drop policy if exists update_shifts on public.staff_shifts;
drop policy if exists read_all_shifts on public.staff_shifts;
drop policy if exists staff_shifts_org_manager_read on public.staff_shifts;
drop policy if exists staff_shifts_worker_read_own_assignment on public.staff_shifts;
drop policy if exists staff_shifts_scoped_read on public.staff_shifts;
drop policy if exists staff_shifts_scoped_insert on public.staff_shifts;
drop policy if exists staff_shifts_scoped_update on public.staff_shifts;
drop policy if exists staff_shifts_scoped_delete on public.staff_shifts;

create policy staff_shifts_scoped_read
on public.staff_shifts
for select
to authenticated
using (
  (org_id is not null and (select public.has_perm((select auth.uid()), org_id, 'workforce.view')))
  or (venue_id is not null and venue_id in (
    select vp.id from public.venue_profiles vp where vp.user_id = (select auth.uid())
  ))
  or exists (
    select 1
    from public.staff_members sm
    where sm.id = staff_shifts.staff_member_id
      and sm.user_id = (select auth.uid())
  )
);

create policy staff_shifts_scoped_insert
on public.staff_shifts
for insert
to authenticated
with check (
  (org_id is not null and (select public.has_perm((select auth.uid()), org_id, 'workforce.manage')))
  or (venue_id is not null and venue_id in (
    select vp.id from public.venue_profiles vp where vp.user_id = (select auth.uid())
  ))
);

create policy staff_shifts_scoped_update
on public.staff_shifts
for update
to authenticated
using (
  (org_id is not null and (select public.has_perm((select auth.uid()), org_id, 'workforce.manage')))
  or (venue_id is not null and venue_id in (
    select vp.id from public.venue_profiles vp where vp.user_id = (select auth.uid())
  ))
)
with check (
  (org_id is not null and (select public.has_perm((select auth.uid()), org_id, 'workforce.manage')))
  or (venue_id is not null and venue_id in (
    select vp.id from public.venue_profiles vp where vp.user_id = (select auth.uid())
  ))
);

create policy staff_shifts_scoped_delete
on public.staff_shifts
for delete
to authenticated
using (
  (org_id is not null and (select public.has_perm((select auth.uid()), org_id, 'workforce.manage')))
  or (venue_id is not null and venue_id in (
    select vp.id from public.venue_profiles vp where vp.user_id = (select auth.uid())
  ))
);
