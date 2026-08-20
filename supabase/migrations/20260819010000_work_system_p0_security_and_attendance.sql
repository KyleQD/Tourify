-- Work Hub + Work Mode P0 foundation.
-- Additive only: retain legacy event references while allowing the linked staff shift
-- to be the authoritative bridge to events_v2 publications and worker schedules.

set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.staff_shifts
  add column if not exists check_in_opens_at timestamptz,
  add column if not exists check_in_closes_at timestamptz,
  add column if not exists check_out_opens_at timestamptz;

alter table public.work_mode_publications
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_publication_id uuid references public.work_mode_publications(id) on delete set null,
  add column if not exists requires_acknowledgement boolean not null default false;

create index if not exists work_mode_publications_worker_event_idx
  on public.work_mode_publications (event_id, publication_type, published_at desc)
  where status = 'published';

create unique index if not exists work_mode_check_in_assignment_action_key
  on public.work_mode_check_in_events (assignment_id, action);

-- staff_shifts was exposed to every authenticated user by the beta policy. Workers only
-- need shifts linked to their own assignment; organization hiring managers retain scope.
drop policy if exists read_all_shifts on public.staff_shifts;
drop policy if exists staff_shifts_worker_read_own_assignment on public.staff_shifts;
create policy staff_shifts_worker_read_own_assignment
  on public.staff_shifts for select to authenticated
  using (
    exists (
      select 1
      from public.employment_assignments assignment
      where assignment.staff_shift_id = staff_shifts.id
        and assignment.user_id = (select auth.uid())
    )
  );

drop policy if exists staff_shifts_org_manager_read on public.staff_shifts;
create policy staff_shifts_org_manager_read
  on public.staff_shifts for select to authenticated
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members member
      where member.org_id = staff_shifts.org_id
        and member.user_id = (select auth.uid())
    )
  );

-- These policies repair the currently policy-less RLS table. Worker access is scoped
-- through their accepted assignment and supports the legacy assignment event FK or the
-- linked staff shift's canonical events_v2 reference.
drop policy if exists work_mode_publications_worker_select on public.work_mode_publications;
create policy work_mode_publications_worker_select
  on public.work_mode_publications for select to authenticated
  using (
    status = 'published'
    and 'assigned_workers' = any(visible_to)
    and exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and (
          assignment.event_id is not distinct from work_mode_publications.event_id
          or shift.event_id is not distinct from work_mode_publications.event_id
        )
    )
  );

drop policy if exists work_mode_publications_org_manager_select on public.work_mode_publications;
create policy work_mode_publications_org_manager_select
  on public.work_mode_publications for select to authenticated
  using (
    exists (
      select 1
      from public.events_v2 event
      join public.org_members member on member.org_id = event.org_id
      where event.id = work_mode_publications.event_id
        and member.user_id = (select auth.uid())
    )
  );

-- Publication acknowledgement is version-scoped because a new immutable publication row
-- receives a new id. The existing unique assignment/publication key therefore resets an
-- acknowledgement only for the changed packet.
comment on column public.work_mode_publications.version is
  'Immutable publication version. Publish an updated packet as a new row linked by supersedes_publication_id.';
comment on column public.work_mode_publications.requires_acknowledgement is
  'Whether assigned workers must acknowledge this immutable publication version.';
comment on column public.staff_shifts.check_in_opens_at is
  'Optional server-enforced earliest worker check-in timestamp.';
