-- WORK-004: organization-scoped communications and scheduled worker reminders.

alter table public.team_communications
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists remind_at timestamptz;

create index if not exists idx_team_communications_org_sent
  on public.team_communications(org_id, sent_at desc)
  where org_id is not null;

create index if not exists idx_team_communications_recipients
  on public.team_communications using gin(recipients);

create index if not exists idx_team_communications_worker_reminders
  on public.team_communications(remind_at, sent_at desc)
  where message_type = 'reminder' and remind_at is not null;

-- Existing rows can be scoped through their canonical event or tour.
update public.team_communications communication
set org_id = coalesce(
  (select event_record.org_id from public.events_v2 event_record where event_record.id = communication.event_id),
  (select tour_record.org_id from public.tours tour_record where tour_record.id = communication.tour_id)
)
where communication.org_id is null
  and (communication.event_id is not null or communication.tour_id is not null);

alter table public.team_communications enable row level security;

drop policy if exists read_all_comms on public.team_communications;
drop policy if exists insert_comms on public.team_communications;
drop policy if exists update_comms on public.team_communications;
drop policy if exists team_communications_select on public.team_communications;
drop policy if exists team_communications_write on public.team_communications;
drop policy if exists team_communications_worker_read_recipient on public.team_communications;
create policy team_communications_worker_read_recipient
  on public.team_communications
  for select
  to authenticated
  using (
    recipients @> array[(select auth.uid())]
    or sender_id = (select auth.uid())
    or exists (
      select 1
      from public.org_members member
      where member.org_id = team_communications.org_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.revoked_at is null
    )
  );

alter table public.event_bulletins enable row level security;
drop policy if exists event_bulletins_read on public.event_bulletins;
create policy event_bulletins_read
  on public.event_bulletins
  for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.events_v2 event_record
      join public.org_members member on member.org_id = event_record.org_id
      where event_record.id = event_bulletins.event_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.revoked_at is null
    )
    or exists (
      select 1
      from public.employment_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and coalesce(assignment.event_v2_id, assignment.event_id) = event_bulletins.event_id
    )
  );

drop policy if exists events_v2_worker_assignment_select on public.events_v2;
create policy events_v2_worker_assignment_select
  on public.events_v2
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where assignment.user_id = (select auth.uid())
        and assignment.status in ('invited', 'confirmed', 'active')
        and coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id) = events_v2.id
    )
  );

drop policy if exists venues_v2_worker_assignment_select on public.venues_v2;
create policy venues_v2_worker_assignment_select
  on public.venues_v2
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events_v2 event_record
      join public.employment_assignments assignment on true
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where event_record.venue_id = venues_v2.id
        and coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id) = event_record.id
        and assignment.user_id = (select auth.uid())
        and assignment.status in ('invited', 'confirmed', 'active')
    )
  );

drop policy if exists tasks_worker_assignee_select on public.tasks;
create policy tasks_worker_assignee_select
  on public.tasks
  for select
  to authenticated
  using (assignee_id = (select auth.uid()));

drop policy if exists organizations_worker_assignment_select on public.organizations;
create policy organizations_worker_assignment_select
  on public.organizations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events_v2 event_record
      join public.employment_assignments assignment on true
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where event_record.org_id = organizations.id
        and coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id) = event_record.id
        and assignment.user_id = (select auth.uid())
        and assignment.status in ('invited', 'confirmed', 'active')
    )
    or exists (
      select 1
      from public.team_communications communication
      where communication.org_id = organizations.id
        and communication.recipients @> array[(select auth.uid())]
    )
  );

drop policy if exists work_mode_publications_worker_assignment_select on public.work_mode_publications;
create policy work_mode_publications_worker_assignment_select
  on public.work_mode_publications
  for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and (
          coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id) = work_mode_publications.event_id
          or assignment.tour_id = work_mode_publications.tour_id
        )
    )
  );

comment on column public.team_communications.org_id is
  'Canonical organization scope for admin-authored worker communications.';
comment on column public.team_communications.remind_at is
  'Worker-facing reminder date/time when message_type is reminder.';
