set client_min_messages = warning;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Canonical hierarchy and shared shift/task definitions
-- ---------------------------------------------------------------------------

alter table public.tour_team_members
  add column if not exists staff_member_id uuid references public.staff_members(id) on delete restrict,
  add column if not exists propagate_to_future_events boolean not null default false;

alter table public.staff_shift_assignments
  add column if not exists is_active boolean not null default true,
  add column if not exists inactive_at timestamptz,
  add column if not exists superseded_by_id uuid references public.staff_shift_assignments(id) on delete set null;

create table if not exists public.tour_member_event_scopes (
  id uuid primary key default gen_random_uuid(),
  tour_team_member_id uuid not null references public.tour_team_members(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  origin text not null check (origin in ('explicit', 'current_events_bulk', 'future_rule')),
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  inactive_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_shift_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  employer_entity_type text not null,
  employer_entity_id uuid not null,
  tour_id uuid references public.tours(id) on delete restrict,
  event_id uuid references public.events_v2(id) on delete restrict,
  title text not null,
  role text,
  department text,
  shift_type text not null default 'event',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  required_headcount integer not null default 1 check (required_headcount > 0),
  required_skills text[] not null default '{}'::text[],
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  break_duration_minutes integer not null default 0 check (break_duration_minutes >= 0),
  break_requirements text,
  location_type text not null default 'onsite' check (location_type in ('onsite', 'remote', 'travel')),
  venue_id uuid,
  reporting_name text,
  reporting_address text,
  directions text,
  access_instructions text,
  worker_instructions text,
  supervisor_name text,
  supervisor_contact text,
  attire_ppe_credentials text,
  hazards text,
  emergency_procedure text,
  emergency_contact text,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- Private notes are intentionally outside the worker-readable plan row.
create table if not exists public.staff_shift_plan_private_notes (
  staff_shift_plan_id uuid primary key references public.staff_shift_plans(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  manager_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.staff_shifts
  add column if not exists staff_shift_plan_id uuid references public.staff_shift_plans(id) on delete restrict;
alter table public.staff_shifts alter column venue_id drop not null;
alter table public.staff_shifts drop constraint if exists staff_shifts_status_check;
alter table public.staff_shifts add constraint staff_shifts_status_check
  check (status in ('draft', 'scheduled', 'published', 'invited', 'confirmed', 'active', 'completed', 'cancelled', 'declined'));

alter table public.workflow_tasks
  add column if not exists staff_shift_plan_id uuid references public.staff_shift_plans(id) on delete restrict,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists version integer not null default 1;

create table if not exists public.workflow_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.workflow_tasks(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  state text not null default 'assigned' check (state in ('assigned', 'acknowledged', 'doing', 'blocked', 'done', 'cancelled')),
  blocked_reason text,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  blocked_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  check (state <> 'blocked' or nullif(btrim(blocked_reason), '') is not null)
);

create table if not exists public.workforce_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  delivery_type text not null check (delivery_type in ('shift_invitation', 'shift_change', 'shift_cancellation', 'task_assignment', 'task_change', 'task_cancellation')),
  source_type text not null,
  source_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reconciliation. Preserve IDs; deactivate redundant evidence.
-- ---------------------------------------------------------------------------

update public.tour_team_members member
set staff_member_id = staff.id,
    org_id = coalesce(member.org_id, staff.org_id),
    updated_at = now()
from public.staff_members staff
join public.tours tour on tour.org_id = staff.org_id
where member.staff_member_id is null
  and member.tour_id = tour.id
  and member.user_id = staff.user_id;

with ranked_members as (
  select id,
    first_value(id) over (partition by tour_id, staff_member_id order by created_at, id) as keeper_id,
    row_number() over (partition by tour_id, staff_member_id order by created_at, id) as row_number
  from public.tour_team_members
  where staff_member_id is not null and is_active
)
update public.tour_team_members member
set is_active = false,
    status = 'inactive',
    profile = coalesce(member.profile, '{}'::jsonb) || jsonb_build_object(
      'supersededByTourTeamMemberId', ranked_members.keeper_id,
      'reconciledAt', now()
    ),
    updated_at = now()
from ranked_members
where member.id = ranked_members.id and ranked_members.row_number > 1;

with ranked as (
  select id,
         first_value(id) over (
           partition by staff_member_id, employer_entity_type, employer_entity_id,
             coalesce(tour_id, '00000000-0000-0000-0000-000000000000'::uuid),
             coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
             coalesce(shift_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at, id
         ) keeper_id,
         row_number() over (
           partition by staff_member_id, employer_entity_type, employer_entity_id,
             coalesce(tour_id, '00000000-0000-0000-0000-000000000000'::uuid),
             coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
             coalesce(shift_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at, id
         ) row_number
  from public.staff_shift_assignments
  where is_active
)
update public.staff_shift_assignments assignment
set is_active = false, inactive_at = now(), superseded_by_id = ranked.keeper_id
from ranked
where assignment.id = ranked.id and ranked.row_number > 1;

insert into public.tour_team_members (
  tour_id, user_id, staff_member_id, org_id, role, role_in_team, name, email,
  phone, status, assigned_by, is_active, propagate_to_future_events
)
select distinct on (bridge.tour_id, staff.id)
  bridge.tour_id, staff.user_id, staff.id, tour.org_id,
  coalesce(nullif(staff.position, ''), nullif(staff.role, ''), 'member'),
  coalesce(nullif(staff.position, ''), nullif(staff.role, ''), 'member'),
  staff.name, staff.email, staff.phone, 'confirmed', bridge.assigned_by, true, false
from public.staff_shift_assignments bridge
join public.staff_members staff on staff.id = bridge.staff_member_id
join public.tours tour on tour.id = bridge.tour_id
where bridge.tour_id is not null
  and staff.user_id is not null
  and staff.status = 'active'
  and (staff.org_id = tour.org_id or staff.employer_entity_id = tour.org_id)
  and not exists (
    select 1 from public.tour_team_members existing
    where existing.tour_id = bridge.tour_id
      and existing.staff_member_id = staff.id
      and existing.is_active
  )
order by bridge.tour_id, staff.id, bridge.created_at;

insert into public.tour_member_event_scopes (
  tour_team_member_id, tour_id, event_id, origin, granted_by
)
select member.id, member.tour_id, relation.event_id, 'current_events_bulk', member.assigned_by
from public.tour_team_members member
join public.tour_events relation on relation.tour_id = member.tour_id
where member.staff_member_id is not null and member.is_active
  and not exists (
    select 1 from public.tour_member_event_scopes scope
    where scope.tour_team_member_id = member.id
      and scope.event_id = relation.event_id
      and scope.is_active
  );

-- Group materially identical legacy worker rows under one shared definition.
-- Worker shift IDs and their individual response states remain unchanged.
with legacy_groups as (
  select distinct on (
    shift.org_id, shift.event_id, shift.venue_id, shift.shift_date, shift.start_time,
    shift.end_time, shift.break_duration, shift.zone_assignment, shift.role_assignment, shift.notes
  )
    shift.org_id,
    coalesce(staff.employer_entity_type, 'organization') as employer_entity_type,
    coalesce(staff.employer_entity_id, shift.org_id) as employer_entity_id,
    relation.tour_id,
    shift.event_id,
    shift.venue_id,
    shift.shift_date,
    shift.start_time,
    shift.end_time,
    shift.break_duration,
    shift.zone_assignment,
    shift.role_assignment,
    shift.notes,
    shift.created_by,
    coalesce(event.timezone, 'UTC') as timezone,
    count(*) over (
      partition by shift.org_id, shift.event_id, shift.venue_id, shift.shift_date,
        shift.start_time, shift.end_time, shift.break_duration, shift.zone_assignment,
        shift.role_assignment, shift.notes
    )::integer as required_headcount
  from public.staff_shifts shift
  join public.staff_members staff on staff.id = shift.staff_member_id
  left join public.events_v2 event on event.id = shift.event_id
  left join lateral (
    select tour_event.tour_id from public.tour_events tour_event
    where tour_event.event_id = shift.event_id
    order by tour_event.created_at, tour_event.id limit 1
  ) relation on true
  where shift.staff_shift_plan_id is null and shift.deleted_at is null and shift.org_id is not null
  order by shift.org_id, shift.event_id, shift.venue_id, shift.shift_date, shift.start_time,
    shift.end_time, shift.break_duration, shift.zone_assignment, shift.role_assignment,
    shift.notes, shift.created_at, shift.id
)
insert into public.staff_shift_plans (
  org_id, employer_entity_type, employer_entity_id, tour_id, event_id, title, role,
  department, shift_type, required_headcount, starts_at, ends_at, timezone,
  break_duration_minutes, location_type, venue_id, worker_instructions,
  status, published_at, created_by
)
select
  org_id, employer_entity_type, employer_entity_id, tour_id, event_id,
  coalesce(nullif(role_assignment, ''), nullif(zone_assignment, ''), 'Legacy shift'),
  role_assignment, zone_assignment, case when event_id is null then 'venue' else 'event' end,
  greatest(required_headcount, 1),
  (shift_date + start_time) at time zone timezone,
  (shift_date + end_time + case when end_time <= start_time then interval '1 day' else interval '0 days' end) at time zone timezone,
  timezone, coalesce(break_duration, 0), 'onsite', venue_id, notes,
  'published', now(), created_by
from legacy_groups;

update public.staff_shifts shift
set staff_shift_plan_id = plan.id,
    updated_at = now()
from public.staff_shift_plans plan
where shift.staff_shift_plan_id is null
  and shift.deleted_at is null
  and shift.org_id = plan.org_id
  and shift.event_id is not distinct from plan.event_id
  and shift.venue_id is not distinct from plan.venue_id
  and shift.role_assignment is not distinct from plan.role
  and shift.zone_assignment is not distinct from plan.department
  and ((shift.shift_date + shift.start_time) at time zone plan.timezone) = plan.starts_at
  and ((shift.shift_date + shift.end_time + case when shift.end_time <= shift.start_time then interval '1 day' else interval '0 days' end) at time zone plan.timezone) = plan.ends_at;

with ranked_worker_shifts as (
  select id,
    row_number() over (
      partition by staff_shift_plan_id, staff_member_id order by created_at, id
    ) as row_number
  from public.staff_shifts
  where staff_shift_plan_id is not null and deleted_at is null
)
update public.staff_shifts shift
set deleted_at = now(), status = 'cancelled', updated_at = now()
from ranked_worker_shifts ranked
where shift.id = ranked.id and ranked.row_number > 1;

-- ---------------------------------------------------------------------------
-- Semantic uniqueness and policy indexes
-- ---------------------------------------------------------------------------

create unique index if not exists tour_team_members_active_staff_semantic_key
  on public.tour_team_members(tour_id, staff_member_id)
  where staff_member_id is not null and is_active;
create index if not exists tour_team_members_staff_member_idx
  on public.tour_team_members(staff_member_id) where staff_member_id is not null;

create unique index if not exists tour_member_event_scopes_active_key
  on public.tour_member_event_scopes(tour_team_member_id, event_id) where is_active;
create index if not exists tour_member_event_scopes_worker_idx
  on public.tour_member_event_scopes(tour_team_member_id, is_active, event_id);
create index if not exists tour_member_event_scopes_tour_event_idx
  on public.tour_member_event_scopes(tour_id, event_id, is_active);

create unique index if not exists staff_shift_assignments_active_semantic_key
  on public.staff_shift_assignments(
    staff_member_id, employer_entity_type, employer_entity_id,
    coalesce(tour_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(shift_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where is_active and (tour_id is not null or event_id is not null or shift_id is not null);

create index if not exists staff_shift_plans_org_status_idx on public.staff_shift_plans(org_id, status, starts_at);
create index if not exists staff_shift_plans_tour_event_idx on public.staff_shift_plans(tour_id, event_id);
create unique index if not exists staff_shifts_active_plan_worker_key
  on public.staff_shifts(staff_shift_plan_id, staff_member_id)
  where staff_shift_plan_id is not null and deleted_at is null;
create index if not exists staff_shifts_plan_idx on public.staff_shifts(staff_shift_plan_id)
  where staff_shift_plan_id is not null;

create unique index if not exists workflow_tasks_source_key
  on public.workflow_tasks(source_type, source_id)
  where source_type is not null and source_id is not null;
create unique index if not exists workflow_task_assignments_active_key
  on public.workflow_task_assignments(task_id, worker_user_id) where is_active;
create index if not exists workflow_task_assignments_worker_state_idx
  on public.workflow_task_assignments(worker_user_id, state, updated_at desc) where is_active;
create index if not exists workflow_task_assignments_staff_idx
  on public.workflow_task_assignments(staff_member_id, state) where is_active;
create unique index if not exists workforce_delivery_outbox_idempotency_key
  on public.workforce_delivery_outbox(idempotency_key);
create index if not exists workforce_delivery_outbox_pending_idx
  on public.workforce_delivery_outbox(status, available_at) where status in ('pending', 'failed');
create index if not exists workforce_delivery_outbox_recipient_idx
  on public.workforce_delivery_outbox(recipient_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Atomic functions. Definer bodies live outside the exposed schema.
-- ---------------------------------------------------------------------------

create or replace function private.assign_tour_membership(
  p_staff_member_id uuid,
  p_tour_id uuid,
  p_team_id uuid,
  p_role text,
  p_zone text,
  p_manager_user_id uuid,
  p_notes text,
  p_propagate_to_future_events boolean,
  p_selected_event_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_staff public.staff_members%rowtype;
  v_tour public.tours%rowtype;
  v_member public.tour_team_members%rowtype;
  v_event_ids uuid[];
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_staff from public.staff_members where id = p_staff_member_id for update;
  select * into v_tour from public.tours where id = p_tour_id;
  if v_staff.id is null or v_tour.id is null then raise exception 'Roster member or tour not found' using errcode = 'P0002'; end if;
  if v_tour.org_id is null or not public.can_workforce(v_actor, v_tour.org_id, 'workforce.manage') then
    raise exception 'Not allowed to manage this tour workforce' using errcode = '42501';
  end if;
  if v_staff.status <> 'active' or v_staff.user_id is null then raise exception 'Roster member must be active and linked to a user'; end if;
  if not (v_staff.org_id = v_tour.org_id or v_staff.employer_entity_id = v_tour.org_id) then
    raise exception 'Roster member and tour belong to different employers';
  end if;
  if p_team_id is not null and not exists (select 1 from public.tour_teams where id = p_team_id and tour_id = p_tour_id) then
    raise exception 'Team does not belong to this tour';
  end if;

  if coalesce(array_length(p_selected_event_ids, 1), 0) > 0 then
    if exists (
      select 1 from unnest(p_selected_event_ids) selected(event_id)
      where not exists (select 1 from public.tour_events relation where relation.tour_id = p_tour_id and relation.event_id = selected.event_id)
    ) then raise exception 'One or more selected events do not belong to this tour'; end if;
    v_event_ids := p_selected_event_ids;
  else
    select coalesce(array_agg(event_id order by ordinal nulls last, created_at), '{}'::uuid[])
      into v_event_ids from public.tour_events where tour_id = p_tour_id;
  end if;

  select * into v_member from public.tour_team_members
  where tour_id = p_tour_id and staff_member_id = p_staff_member_id and is_active
  order by created_at limit 1 for update;

  if v_member.id is null then
    insert into public.tour_team_members (
      tour_id, user_id, staff_member_id, org_id, team_id, role, role_in_team,
      name, email, phone, status, assigned_by, is_active, propagate_to_future_events
    ) values (
      p_tour_id, v_staff.user_id, v_staff.id, v_tour.org_id, p_team_id,
      coalesce(nullif(p_role, ''), nullif(v_staff.position, ''), nullif(v_staff.role, ''), 'member'),
      coalesce(nullif(p_role, ''), nullif(v_staff.position, ''), nullif(v_staff.role, ''), 'member'),
      v_staff.name, v_staff.email, v_staff.phone, 'confirmed', v_actor, true, coalesce(p_propagate_to_future_events, false)
    ) returning * into v_member;
  else
    update public.tour_team_members set
      team_id = coalesce(p_team_id, team_id),
      role = coalesce(nullif(p_role, ''), role),
      role_in_team = coalesce(nullif(p_role, ''), role_in_team),
      status = 'confirmed', is_active = true,
      propagate_to_future_events = coalesce(p_propagate_to_future_events, false),
      assigned_by = v_actor, updated_at = now()
    where id = v_member.id returning * into v_member;
  end if;

  update public.staff_members set
    assigned_zone = coalesce(nullif(p_zone, ''), assigned_zone),
    assigned_manager_id = coalesce(p_manager_user_id, assigned_manager_id),
    notes = coalesce(nullif(p_notes, ''), notes), updated_at = now()
  where id = p_staff_member_id;

  update public.tour_member_event_scopes set is_active = false, inactive_at = now(), updated_at = now()
  where tour_team_member_id = v_member.id and is_active and not (event_id = any(v_event_ids));

  insert into public.tour_member_event_scopes (
    tour_team_member_id, tour_id, event_id, origin, granted_by
  )
  select v_member.id, p_tour_id, selected.event_id,
    case when coalesce(array_length(p_selected_event_ids, 1), 0) > 0 then 'explicit' else 'current_events_bulk' end,
    v_actor
  from unnest(v_event_ids) selected(event_id)
  on conflict (tour_team_member_id, event_id) where is_active do update
    set origin = excluded.origin, granted_by = excluded.granted_by, updated_at = now();

  return jsonb_build_object(
    'tourTeamMemberId', v_member.id,
    'tourId', p_tour_id,
    'eventIds', v_event_ids,
    'propagateToFutureEvents', coalesce(p_propagate_to_future_events, false)
  );
end;
$$;

create or replace function public.assign_tour_membership(
  p_staff_member_id uuid,
  p_tour_id uuid,
  p_team_id uuid default null,
  p_role text default null,
  p_zone text default null,
  p_manager_user_id uuid default null,
  p_notes text default null,
  p_propagate_to_future_events boolean default false,
  p_selected_event_ids uuid[] default null
) returns jsonb language sql security invoker set search_path = public, private
as $$ select private.assign_tour_membership($1,$2,$3,$4,$5,$6,$7,$8,$9) $$;

create or replace function private.propagate_tour_event_scope() returns trigger
language plpgsql security definer set search_path = public, private
as $$
begin
  insert into public.tour_member_event_scopes(tour_team_member_id, tour_id, event_id, origin, granted_by)
  select member.id, new.tour_id, new.event_id, 'future_rule', member.assigned_by
  from public.tour_team_members member
  where member.tour_id = new.tour_id and member.is_active and member.propagate_to_future_events
  on conflict (tour_team_member_id, event_id) where is_active do nothing;
  return new;
end;
$$;

create or replace function private.deactivate_removed_tour_event_scope() returns trigger
language plpgsql security definer set search_path = public, private
as $$
begin
  update public.tour_member_event_scopes
  set is_active = false, inactive_at = now(), updated_at = now()
  where tour_id = old.tour_id and event_id = old.event_id and is_active and origin = 'future_rule';
  return old;
end;
$$;

drop trigger if exists tour_event_scope_propagation on public.tour_events;
create trigger tour_event_scope_propagation after insert on public.tour_events
for each row execute function private.propagate_tour_event_scope();
drop trigger if exists tour_event_scope_deactivation on public.tour_events;
create trigger tour_event_scope_deactivation before delete on public.tour_events
for each row execute function private.deactivate_removed_tour_event_scope();

create or replace function private.publish_staff_shift_plan(
  p_plan_id uuid,
  p_staff_member_ids uuid[],
  p_conflict_override_reason text
) returns jsonb
language plpgsql security definer set search_path = public, private, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_plan public.staff_shift_plans%rowtype;
  v_staff public.staff_members%rowtype;
  v_shift_id uuid;
  v_shift_ids uuid[] := '{}'::uuid[];
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_plan from public.staff_shift_plans where id = p_plan_id for update;
  if v_plan.id is null then raise exception 'Shift plan not found' using errcode = 'P0002'; end if;
  if not public.can_workforce(v_actor, v_plan.org_id, 'workforce.publish') and not public.can_workforce(v_actor, v_plan.org_id, 'workforce.manage') then
    raise exception 'Not allowed to publish workforce schedules' using errcode = '42501';
  end if;
  if v_plan.status not in ('draft', 'published') then raise exception 'Only draft or published plans can be published'; end if;
  if v_plan.starts_at is null or v_plan.ends_at is null or v_plan.ends_at <= v_plan.starts_at then raise exception 'Valid shift start and end times are required'; end if;
  if v_plan.event_id is not null and not exists (select 1 from public.events_v2 where id = v_plan.event_id and org_id = v_plan.org_id) then raise exception 'Event belongs to a different employer'; end if;
  if v_plan.tour_id is not null and not exists (select 1 from public.tours where id = v_plan.tour_id and org_id = v_plan.org_id) then raise exception 'Tour belongs to a different employer'; end if;
  if v_plan.tour_id is not null and v_plan.event_id is not null and not exists (select 1 from public.tour_events where tour_id = v_plan.tour_id and event_id = v_plan.event_id) then raise exception 'Event does not belong to the selected tour'; end if;
  if v_plan.location_type = 'onsite' and (nullif(btrim(v_plan.reporting_name), '') is null or nullif(btrim(v_plan.reporting_address), '') is null) then raise exception 'Complete event location before publishing'; end if;
  if coalesce(array_length(p_staff_member_ids, 1), 0) = 0 then raise exception 'Select at least one roster member'; end if;

  for v_staff in select * from public.staff_members where id = any(p_staff_member_ids) for update loop
    if v_staff.status <> 'active' or v_staff.user_id is null then raise exception 'Every assigned worker must be an active user-backed roster member'; end if;
    if not (v_staff.org_id = v_plan.org_id or v_staff.employer_entity_id = v_plan.org_id) then raise exception 'Worker belongs to a different employer'; end if;
    if coalesce(v_staff.onboarding_progress, 0) < 100 or coalesce(v_staff.compliance_status, 'not_started') not in ('approved', 'complete', 'completed', 'verified', 'compliant', 'submitted') then
      raise exception 'Worker onboarding or compliance is incomplete for %', v_staff.name;
    end if;
    if exists (
      select 1 from public.staff_shifts conflict
      where conflict.staff_member_id = v_staff.id and conflict.deleted_at is null
        and conflict.id not in (select id from public.staff_shifts where staff_shift_plan_id = v_plan.id)
        and (conflict.shift_date + conflict.start_time) < (v_plan.ends_at at time zone v_plan.timezone)
        and (conflict.shift_date + conflict.end_time) > (v_plan.starts_at at time zone v_plan.timezone)
    ) and nullif(btrim(p_conflict_override_reason), '') is null then
      raise exception 'Scheduling conflict for %. Record an override reason to continue.', v_staff.name;
    end if;

    insert into public.staff_shifts (
      venue_id, event_id, staff_member_id, shift_date, start_time, end_time,
      break_duration, zone_assignment, role_assignment, status, notes, created_by,
      org_id, staff_shift_plan_id
    ) values (
      v_plan.venue_id, v_plan.event_id, v_staff.id,
      (v_plan.starts_at at time zone v_plan.timezone)::date,
      (v_plan.starts_at at time zone v_plan.timezone)::time,
      (v_plan.ends_at at time zone v_plan.timezone)::time,
      v_plan.break_duration_minutes, v_plan.department, coalesce(v_plan.role, v_plan.title),
      'invited', v_plan.worker_instructions, v_actor, v_plan.org_id, v_plan.id
    )
    on conflict (staff_shift_plan_id, staff_member_id) where staff_shift_plan_id is not null and deleted_at is null
    do update set
      venue_id = excluded.venue_id, event_id = excluded.event_id,
      shift_date = excluded.shift_date, start_time = excluded.start_time, end_time = excluded.end_time,
      break_duration = excluded.break_duration, zone_assignment = excluded.zone_assignment,
      role_assignment = excluded.role_assignment, notes = excluded.notes, updated_at = now()
    returning id into v_shift_id;
    v_shift_ids := array_append(v_shift_ids, v_shift_id);

    insert into public.employment_assignments (
      user_id, event_id, venue_id, role_title, department, starts_at, ends_at, status,
      employer_entity_type, employer_entity_id, staff_shift_id, staff_member_id, source,
      position, tour_id, assignment_kind
    ) values (
      v_staff.user_id, v_plan.event_id, v_plan.venue_id, coalesce(v_plan.role, v_plan.title),
      v_plan.department, v_plan.starts_at, v_plan.ends_at, 'invited', v_plan.employer_entity_type,
      v_plan.employer_entity_id, v_shift_id, v_staff.id, 'staff_shift_plan',
      coalesce(v_plan.role, v_plan.title), v_plan.tour_id, 'shift'
    )
    on conflict (staff_shift_id) where staff_shift_id is not null do update set
      event_id = excluded.event_id, venue_id = excluded.venue_id, role_title = excluded.role_title,
      department = excluded.department, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
      staff_member_id = excluded.staff_member_id, tour_id = excluded.tour_id,
      assignment_kind = 'shift', updated_at = now();

    insert into public.workforce_delivery_outbox(
      org_id, recipient_user_id, delivery_type, source_type, source_id, payload, idempotency_key
    ) values (
      v_plan.org_id, v_staff.user_id, 'shift_invitation', 'staff_shift_plan', v_plan.id,
      jsonb_build_object('shiftId', v_shift_id, 'title', v_plan.title, 'startsAt', v_plan.starts_at),
      'shift-invitation:' || v_plan.id || ':' || v_staff.id || ':v' || v_plan.version
    ) on conflict (idempotency_key) do nothing;
  end loop;

  if (select count(*) from unnest(p_staff_member_ids) worker_id) <> array_length(v_shift_ids, 1) then
    raise exception 'One or more selected roster members were not found';
  end if;
  update public.staff_shift_plans set status = 'published', published_at = coalesce(published_at, now()), updated_by = v_actor, updated_at = now()
  where id = v_plan.id;
  return jsonb_build_object('planId', v_plan.id, 'shiftIds', v_shift_ids, 'status', 'published');
end;
$$;

create or replace function public.publish_staff_shift_plan(
  p_plan_id uuid, p_staff_member_ids uuid[], p_conflict_override_reason text default null
) returns jsonb language sql security invoker set search_path = public, private
as $$ select private.publish_staff_shift_plan($1,$2,$3) $$;

create or replace function private.refresh_workflow_task_aggregate() returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_task_id uuid; v_count integer; v_user uuid; v_status text;
begin
  v_task_id := case when tg_op = 'DELETE' then old.task_id else new.task_id end;
  select count(*), min(worker_user_id) into v_count, v_user
  from public.workflow_task_assignments where task_id = v_task_id and is_active and state <> 'cancelled';
  select case
    when v_count = 0 then 'todo'
    when bool_and(state = 'done') then 'done'
    when bool_or(state = 'blocked') then 'blocked'
    when bool_or(state = 'doing') then 'doing'
    else 'todo' end into v_status
  from public.workflow_task_assignments where task_id = v_task_id and is_active and state <> 'cancelled';
  update public.workflow_tasks set status = coalesce(v_status, 'todo'), assignee_id = case when v_count = 1 then v_user else null end, updated_at = now()
  where id = v_task_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists workflow_task_assignment_aggregate on public.workflow_task_assignments;
create trigger workflow_task_assignment_aggregate after insert or update or delete on public.workflow_task_assignments
for each row execute function private.refresh_workflow_task_aggregate();

create or replace function private.create_workflow_task_assignments(
  p_thread_id uuid, p_title text, p_description text, p_priority text, p_due_at timestamptz,
  p_dependency_task_ids uuid[], p_labels text[], p_metadata jsonb, p_staff_member_ids uuid[],
  p_staff_shift_plan_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, private, extensions
as $$
declare v_actor uuid := auth.uid(); v_thread public.workflow_threads%rowtype; v_task public.workflow_tasks%rowtype; v_staff public.staff_members%rowtype; v_assignment_id uuid; v_ids uuid[] := '{}'::uuid[];
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_thread from public.workflow_threads where id = p_thread_id;
  if v_thread.id is null then raise exception 'Workflow thread not found' using errcode = 'P0002'; end if;
  if v_thread.org_id is null or not public.can_workforce(v_actor, v_thread.org_id, 'workforce.manage') then raise exception 'Not allowed to assign workforce tasks' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Task title is required'; end if;
  if coalesce(array_length(p_staff_member_ids, 1), 0) = 0 then raise exception 'Select at least one assignee'; end if;
  if p_staff_shift_plan_id is not null and not exists (
    select 1 from public.staff_shift_plans plan
    where plan.id = p_staff_shift_plan_id and plan.org_id = v_thread.org_id and plan.status <> 'cancelled'
  ) then raise exception 'Shift plan does not belong to this employer'; end if;
  if v_thread.scope_type in ('shift', 'staff_shift_plan')
     and (p_staff_shift_plan_id is null or p_staff_shift_plan_id <> v_thread.scope_id) then
    raise exception 'Shift task scope does not match the selected shift';
  end if;

  insert into public.workflow_tasks(thread_id,title,description,status,priority,due_at,dependency_task_ids,labels,metadata,created_by,staff_shift_plan_id)
  values (p_thread_id,btrim(p_title),nullif(btrim(p_description),''),'todo',coalesce(p_priority,'medium'),p_due_at,coalesce(p_dependency_task_ids,'{}'),coalesce(p_labels,'{}'),coalesce(p_metadata,'{}'),v_actor,p_staff_shift_plan_id)
  returning * into v_task;

  for v_staff in select * from public.staff_members where id = any(p_staff_member_ids) for update loop
    if v_staff.user_id is null or v_staff.status <> 'active' or not (v_staff.org_id = v_thread.org_id or v_staff.employer_entity_id = v_thread.org_id) then raise exception 'Every assignee must be an active roster member for this employer'; end if;
    if v_thread.scope_type = 'tour' and not exists (select 1 from public.tour_team_members where tour_id = v_thread.scope_id and staff_member_id = v_staff.id and is_active) then raise exception 'Assignee does not have access to this tour'; end if;
    if v_thread.scope_type = 'event' and not (
      exists (
        select 1 from public.tour_member_event_scopes scope join public.tour_team_members member on member.id = scope.tour_team_member_id
        where scope.event_id = v_thread.scope_id and scope.is_active and member.staff_member_id = v_staff.id and member.is_active
      )
      or exists (
        select 1 from public.staff_shifts shift join public.staff_shift_plans plan on plan.id = shift.staff_shift_plan_id
        where plan.event_id = v_thread.scope_id and shift.staff_member_id = v_staff.id and shift.deleted_at is null
      )
    ) then raise exception 'Assignee does not have access to this event'; end if;
    if v_thread.scope_type in ('shift', 'staff_shift_plan') and not exists (
      select 1 from public.staff_shifts shift
      where shift.staff_shift_plan_id = p_staff_shift_plan_id and shift.staff_member_id = v_staff.id and shift.deleted_at is null
    ) then raise exception 'Assignee is not assigned to this shift'; end if;
    insert into public.workflow_task_assignments(task_id,worker_user_id,staff_member_id,assigned_by)
    values(v_task.id,v_staff.user_id,v_staff.id,v_actor) returning id into v_assignment_id;
    v_ids := array_append(v_ids, v_assignment_id);
    insert into public.workforce_delivery_outbox(org_id,recipient_user_id,delivery_type,source_type,source_id,payload,idempotency_key)
    values(v_thread.org_id,v_staff.user_id,'task_assignment','workflow_task',v_task.id,jsonb_build_object('title',v_task.title,'dueAt',v_task.due_at),'task-assignment:'||v_task.id||':'||v_staff.id||':v'||v_task.version)
    on conflict(idempotency_key) do nothing;
  end loop;
  if (select count(*) from unnest(p_staff_member_ids) x) <> coalesce(array_length(v_ids,1),0) then raise exception 'One or more assignees were not found'; end if;
  return jsonb_build_object('taskId',v_task.id,'assignmentIds',v_ids);
end;
$$;

create or replace function public.create_workflow_task_assignments(
  p_thread_id uuid, p_title text, p_description text default null, p_priority text default 'medium',
  p_due_at timestamptz default null, p_dependency_task_ids uuid[] default '{}', p_labels text[] default '{}',
  p_metadata jsonb default '{}', p_staff_member_ids uuid[] default '{}', p_staff_shift_plan_id uuid default null
) returns jsonb language sql security invoker set search_path = public, private
as $$ select private.create_workflow_task_assignments($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) $$;

create or replace function private.transition_workflow_task_assignment(
  p_assignment_id uuid, p_action text, p_blocked_reason text
) returns jsonb
language plpgsql security definer set search_path = public, private
as $$
declare v_actor uuid := auth.uid(); v_assignment public.workflow_task_assignments%rowtype; v_next text;
begin
  select * into v_assignment from public.workflow_task_assignments where id = p_assignment_id and is_active for update;
  if v_actor is null or v_assignment.worker_user_id <> v_actor then raise exception 'Task assignment not found' using errcode = '42501'; end if;
  v_next := case p_action when 'acknowledge' then 'acknowledged' when 'start' then 'doing' when 'complete' then 'done' when 'block' then 'blocked' else null end;
  if v_next is null then raise exception 'Unsupported task action'; end if;
  if p_action = 'acknowledge' and v_assignment.state <> 'assigned' then raise exception 'Only assigned tasks can be acknowledged'; end if;
  if p_action = 'start' and v_assignment.state not in ('acknowledged','blocked') then raise exception 'A task must be acknowledged before it can start'; end if;
  if p_action in ('complete','block') and v_assignment.state not in ('acknowledged','doing','blocked') then raise exception 'Task must be acknowledged before this action'; end if;
  if p_action = 'block' and nullif(btrim(p_blocked_reason),'') is null then raise exception 'A blocked reason is required'; end if;
  update public.workflow_task_assignments set state=v_next,
    acknowledged_at=case when p_action='acknowledge' then now() else acknowledged_at end,
    started_at=case when p_action='start' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_action='complete' then now() else null end,
    blocked_at=case when p_action='block' then now() else null end,
    blocked_reason=case when p_action='block' then btrim(p_blocked_reason) else null end,
    updated_at=now()
  where id=p_assignment_id returning * into v_assignment;
  return to_jsonb(v_assignment);
end;
$$;

create or replace function public.transition_workflow_task_assignment(
  p_assignment_id uuid, p_action text, p_blocked_reason text default null
) returns jsonb language sql security invoker set search_path = public, private
as $$ select private.transition_workflow_task_assignment($1,$2,$3) $$;

-- Legacy task projection where a matching workforce thread is already available.
update public.workflow_threads thread
set org_id = coalesce(
  case when thread.scope_type='tour' then (select tour.org_id from public.tours tour where tour.id=thread.scope_id) end,
  case when thread.scope_type='event' then (select event.org_id from public.events_v2 event where event.id=thread.scope_id) end
), updated_at=now()
where thread.org_id is null and thread.scope_type in ('tour','event');

insert into public.workflow_tasks(thread_id,title,description,status,priority,due_at,metadata,created_by,source_type,source_id)
select thread.id, legacy.title, legacy.description,
  case legacy.status when 'completed' then 'done' when 'in_progress' then 'doing' when 'blocked' then 'blocked' else 'todo' end,
  coalesce(legacy.priority,'medium'), legacy.due_at,
  jsonb_build_object('legacyTaskId',legacy.id,'tourId',legacy.tour_id,'eventId',legacy.event_id), legacy.created_by, 'legacy_task', legacy.id
from public.tasks legacy
join public.workflow_threads thread on
  (legacy.event_id is not null and thread.scope_type='event' and thread.scope_id=legacy.event_id)
  or (legacy.event_id is null and legacy.tour_id is not null and thread.scope_type='tour' and thread.scope_id=legacy.tour_id)
where legacy.assigned_to is not null
on conflict (source_type,source_id) where source_type is not null and source_id is not null do nothing;

insert into public.workflow_task_assignments(task_id,worker_user_id,staff_member_id,assigned_by,state,blocked_reason,acknowledged_at,started_at,completed_at)
select task.id, staff.user_id, staff.id, legacy.created_by,
  case legacy.status when 'completed' then 'done' when 'in_progress' then 'doing' when 'blocked' then 'blocked' else 'assigned' end,
  case when legacy.status='blocked' then 'Migrated legacy task was blocked.' end,
  case when legacy.status in ('completed','in_progress','blocked') then coalesce(legacy.updated_at,legacy.created_at,now()) end,
  case when legacy.status in ('completed','in_progress') then coalesce(legacy.updated_at,legacy.created_at,now()) end,
  case when legacy.status='completed' then coalesce(legacy.updated_at,legacy.created_at,now()) end
from public.tasks legacy
join public.workflow_tasks task on task.source_type='legacy_task' and task.source_id=legacy.id
join public.staff_members staff on staff.user_id=legacy.assigned_to
where not exists (select 1 from public.workflow_task_assignments existing where existing.task_id=task.id and existing.worker_user_id=staff.user_id and existing.is_active);

-- ---------------------------------------------------------------------------
-- RLS: workers own their rows; managers require workforce capabilities.
-- ---------------------------------------------------------------------------

alter table public.tour_member_event_scopes enable row level security;
alter table public.staff_shift_plans enable row level security;
alter table public.staff_shift_plan_private_notes enable row level security;
alter table public.workflow_task_assignments enable row level security;
alter table public.workforce_delivery_outbox enable row level security;

drop policy if exists tour_team_members_worker_read_own on public.tour_team_members;
create policy tour_team_members_worker_read_own on public.tour_team_members for select to authenticated using (
  user_id=(select auth.uid()) or exists (
    select 1 from public.staff_members staff
    where staff.id=tour_team_members.staff_member_id and staff.user_id=(select auth.uid())
  )
);
drop policy if exists tours_worker_read_membership on public.tours;
create policy tours_worker_read_membership on public.tours for select to authenticated using (
  exists (select 1 from public.tour_team_members member
    where member.tour_id=tours.id and member.user_id=(select auth.uid()) and member.is_active)
);
drop policy if exists tour_teams_worker_read_membership on public.tour_teams;
create policy tour_teams_worker_read_membership on public.tour_teams for select to authenticated using (
  exists (select 1 from public.tour_team_members member
    where member.team_id=tour_teams.id and member.user_id=(select auth.uid()) and member.is_active)
);
drop policy if exists events_v2_worker_read_tour_scope on public.events_v2;
create policy events_v2_worker_read_tour_scope on public.events_v2 for select to authenticated using (
  exists (
    select 1 from public.tour_member_event_scopes scope
    join public.tour_team_members member on member.id=scope.tour_team_member_id
    where scope.event_id=events_v2.id and scope.is_active and member.is_active and member.user_id=(select auth.uid())
  )
);

create policy tour_member_event_scopes_read on public.tour_member_event_scopes for select to authenticated using (
  exists (select 1 from public.tour_team_members member join public.staff_members staff on staff.id=member.staff_member_id
    where member.id=tour_member_event_scopes.tour_team_member_id and staff.user_id=(select auth.uid()) and member.is_active)
  or (select public.can_workforce((select auth.uid()), (select org_id from public.tours where id=tour_member_event_scopes.tour_id), 'workforce.view'))
);
create policy tour_member_event_scopes_manage on public.tour_member_event_scopes for all to authenticated
  using ((select public.can_workforce((select auth.uid()), (select org_id from public.tours where id=tour_member_event_scopes.tour_id), 'workforce.manage')))
  with check ((select public.can_workforce((select auth.uid()), (select org_id from public.tours where id=tour_member_event_scopes.tour_id), 'workforce.manage')));

create policy staff_shift_plans_read on public.staff_shift_plans for select to authenticated using (
  (status <> 'draft' and exists (select 1 from public.staff_shifts shift join public.staff_members staff on staff.id=shift.staff_member_id
    where shift.staff_shift_plan_id=staff_shift_plans.id and shift.deleted_at is null and staff.user_id=(select auth.uid())))
  or (select public.can_workforce((select auth.uid()), staff_shift_plans.org_id, 'workforce.view'))
);
create policy staff_shift_plans_manage on public.staff_shift_plans for all to authenticated
  using ((select public.can_workforce((select auth.uid()), org_id, 'workforce.manage')))
  with check ((select public.can_workforce((select auth.uid()), org_id, 'workforce.manage')));
create policy staff_shift_plan_private_notes_manager on public.staff_shift_plan_private_notes for all to authenticated
  using ((select public.can_workforce((select auth.uid()), org_id, 'workforce.manage')))
  with check ((select public.can_workforce((select auth.uid()), org_id, 'workforce.manage')));

create policy workflow_task_assignments_read_own on public.workflow_task_assignments for select to authenticated
  using (worker_user_id=(select auth.uid()) or exists (
    select 1 from public.workflow_tasks task join public.workflow_threads thread on thread.id=task.thread_id
    where task.id=workflow_task_assignments.task_id and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.view'))
  ));
create policy workflow_task_assignments_manage on public.workflow_task_assignments for all to authenticated
  using (exists (select 1 from public.workflow_tasks task join public.workflow_threads thread on thread.id=task.thread_id where task.id=workflow_task_assignments.task_id and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))
  with check (exists (select 1 from public.workflow_tasks task join public.workflow_threads thread on thread.id=task.thread_id where task.id=workflow_task_assignments.task_id and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))));

create policy workforce_delivery_outbox_manager_read on public.workforce_delivery_outbox for select to authenticated
  using ((select public.can_workforce((select auth.uid()),org_id,'workforce.manage')));

drop policy if exists insert_shifts on public.staff_shifts;
drop policy if exists update_shifts on public.staff_shifts;
create policy staff_shifts_manager_insert on public.staff_shifts for insert to authenticated
  with check (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.manage')));
create policy staff_shifts_manager_update on public.staff_shifts for update to authenticated
  using (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.manage')))
  with check (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.manage')));

drop policy if exists workflow_threads_read on public.workflow_threads;
drop policy if exists workflow_threads_write on public.workflow_threads;
drop policy if exists workflow_tasks_read on public.workflow_tasks;
drop policy if exists workflow_tasks_write on public.workflow_tasks;
drop policy if exists workflow_messages_read on public.workflow_messages;
drop policy if exists workflow_messages_write on public.workflow_messages;
drop policy if exists workflow_participants_read on public.workflow_participants;
drop policy if exists workflow_participants_write on public.workflow_participants;

create policy workflow_threads_scoped_read on public.workflow_threads for select to authenticated using (
  created_by=(select auth.uid())
  or exists (select 1 from public.workflow_participants participant where participant.thread_id=workflow_threads.id and participant.user_id=(select auth.uid()) and participant.status='active')
  or exists (select 1 from public.workflow_tasks task join public.workflow_task_assignments assignment on assignment.task_id=task.id where task.thread_id=workflow_threads.id and assignment.worker_user_id=(select auth.uid()) and assignment.is_active)
  or (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.view')))
);
create policy workflow_threads_manager_write on public.workflow_threads for all to authenticated
  using (created_by=(select auth.uid()) or (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.manage'))))
  with check (created_by=(select auth.uid()) or (org_id is not null and (select public.can_workforce((select auth.uid()),org_id,'workforce.manage'))));

create policy workflow_tasks_scoped_read on public.workflow_tasks for select to authenticated using (
  created_by=(select auth.uid())
  or exists (select 1 from public.workflow_task_assignments assignment where assignment.task_id=workflow_tasks.id and assignment.worker_user_id=(select auth.uid()) and assignment.is_active)
  or exists (select 1 from public.workflow_threads thread where thread.id=workflow_tasks.thread_id and thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.view')))
  or exists (select 1 from public.workflow_threads thread join public.workflow_participants participant on participant.thread_id=thread.id where thread.id=workflow_tasks.thread_id and thread.org_id is null and participant.user_id=(select auth.uid()) and participant.status='active')
);
create policy workflow_tasks_manager_write on public.workflow_tasks for all to authenticated
  using (exists (select 1 from public.workflow_threads thread where thread.id=workflow_tasks.thread_id and (thread.created_by=(select auth.uid()) or (thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))))
  with check (exists (select 1 from public.workflow_threads thread where thread.id=workflow_tasks.thread_id and (thread.created_by=(select auth.uid()) or (thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))));

create policy workflow_messages_participant_read on public.workflow_messages for select to authenticated using (
  sender_id=(select auth.uid()) or exists (select 1 from public.workflow_participants participant where participant.thread_id=workflow_messages.thread_id and participant.user_id=(select auth.uid()) and participant.status='active')
  or exists (select 1 from public.workflow_threads thread where thread.id=workflow_messages.thread_id and thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.view')))
);
create policy workflow_messages_participant_write on public.workflow_messages for insert to authenticated with check (
  sender_id=(select auth.uid()) and exists (select 1 from public.workflow_participants participant where participant.thread_id=workflow_messages.thread_id and participant.user_id=(select auth.uid()) and participant.status='active')
);
create policy workflow_messages_manager_update on public.workflow_messages for update to authenticated
  using (exists (select 1 from public.workflow_threads thread where thread.id=workflow_messages.thread_id and thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))
  with check (exists (select 1 from public.workflow_threads thread where thread.id=workflow_messages.thread_id and thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))));

create policy workflow_participants_scoped_read on public.workflow_participants for select to authenticated using (
  user_id=(select auth.uid()) or exists (select 1 from public.workflow_threads thread where thread.id=workflow_participants.thread_id and thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.view')))
);
create policy workflow_participants_manager_write on public.workflow_participants for all to authenticated
  using (exists (select 1 from public.workflow_threads thread where thread.id=workflow_participants.thread_id and (thread.created_by=(select auth.uid()) or (thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))))
  with check (exists (select 1 from public.workflow_threads thread where thread.id=workflow_participants.thread_id and (thread.created_by=(select auth.uid()) or (thread.org_id is not null and (select public.can_workforce((select auth.uid()),thread.org_id,'workforce.manage'))))));

revoke all on function private.assign_tour_membership(uuid,uuid,uuid,text,text,uuid,text,boolean,uuid[]) from public;
revoke all on function private.publish_staff_shift_plan(uuid,uuid[],text) from public;
revoke all on function private.create_workflow_task_assignments(uuid,text,text,text,timestamptz,uuid[],text[],jsonb,uuid[],uuid) from public;
revoke all on function private.transition_workflow_task_assignment(uuid,text,text) from public;
revoke all on function public.assign_tour_membership(uuid,uuid,uuid,text,text,uuid,text,boolean,uuid[]) from public;
revoke all on function public.publish_staff_shift_plan(uuid,uuid[],text) from public;
revoke all on function public.create_workflow_task_assignments(uuid,text,text,text,timestamptz,uuid[],text[],jsonb,uuid[],uuid) from public;
revoke all on function public.transition_workflow_task_assignment(uuid,text,text) from public;
grant execute on function public.assign_tour_membership(uuid,uuid,uuid,text,text,uuid,text,boolean,uuid[]) to authenticated, service_role;
grant execute on function public.publish_staff_shift_plan(uuid,uuid[],text) to authenticated, service_role;
grant execute on function public.create_workflow_task_assignments(uuid,text,text,text,timestamptz,uuid[],text[],jsonb,uuid[],uuid) to authenticated, service_role;
grant execute on function public.transition_workflow_task_assignment(uuid,text,text) to authenticated, service_role;

revoke all on table public.tour_member_event_scopes from anon;
revoke all on table public.staff_shift_plans from anon;
revoke all on table public.staff_shift_plan_private_notes from anon;
revoke all on table public.workflow_task_assignments from anon;
revoke all on table public.workforce_delivery_outbox from anon;
grant select, insert, update, delete on table public.tour_member_event_scopes to authenticated, service_role;
grant select, insert, update, delete on table public.staff_shift_plans to authenticated, service_role;
grant select, insert, update, delete on table public.staff_shift_plan_private_notes to authenticated, service_role;
grant select, insert, update, delete on table public.workflow_task_assignments to authenticated, service_role;
grant select on table public.workforce_delivery_outbox to authenticated;
grant select, insert, update, delete on table public.workforce_delivery_outbox to service_role;

comment on table public.staff_shift_plans is 'Shared worker-facing shift definitions. Per-worker responses remain in staff_shifts/employment_assignments.';
comment on table public.workflow_task_assignments is 'Per-worker acknowledgement and execution state for canonical workflow tasks.';
comment on table public.tour_member_event_scopes is 'Concrete event information scope granted by a canonical tour membership.';
