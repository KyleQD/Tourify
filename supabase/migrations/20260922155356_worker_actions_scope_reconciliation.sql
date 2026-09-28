-- DB-010 / WORK-006: reviewed active worker-action evidence tables.
--
-- Replaces the archived local-only worker-actions SQL with a forward-only
-- additive migration. It creates append-only tables only when absent, preserves
-- existing rows, and does not enable FEATURE_WORK_MODE_WORKER_ACTIONS.

set lock_timeout = '5s';
set statement_timeout = '60s';

create schema if not exists work_mode_security;

create table if not exists public.work_mode_publication_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.employment_assignments(id),
  publication_id uuid not null references public.work_mode_publications(id),
  user_id uuid not null references auth.users(id),
  acknowledged_at timestamptz not null default now(),
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint work_mode_publication_ack_assignment_publication_key unique (assignment_id, publication_id),
  constraint work_mode_publication_ack_user_request_key unique (user_id, client_request_id)
);

create table if not exists public.work_mode_check_in_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.employment_assignments(id),
  user_id uuid not null references auth.users(id),
  -- Work Mode can still resolve a legacy event_id; an events_v2-only FK
  -- would reject a valid assignment until that identity cutover is complete.
  event_id uuid,
  action text not null,
  occurred_at timestamptz not null default now(),
  device_occurred_at timestamptz,
  client_request_id uuid not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint work_mode_check_in_events_action_check check (action in ('check_in', 'check_out')),
  constraint work_mode_check_in_events_context_object_check check (jsonb_typeof(context) = 'object'),
  constraint work_mode_check_in_user_request_key unique (user_id, client_request_id)
);

-- If an operator previously applied the archived local-only SQL, make drift
-- visible before policies are recreated against an unknown shape.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.work_mode_publication_acknowledgements'::regclass
      and conname = 'work_mode_publication_ack_assignment_publication_key'
      and contype = 'u'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.work_mode_publication_acknowledgements'::regclass
      and conname = 'work_mode_publication_ack_user_request_key'
      and contype = 'u'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.work_mode_check_in_events'::regclass
      and conname = 'work_mode_check_in_user_request_key'
      and contype = 'u'
  ) then
    raise exception 'DB-010 existing worker-action table constraints differ; review catalog before applying';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('work_mode_publication_acknowledgements', 'work_mode_check_in_events')
      and policyname not in (
        'work_mode_publication_ack_select_own',
        'work_mode_publication_ack_insert_own_assignment',
        'work_mode_check_in_select_own',
        'work_mode_check_in_insert_own_assignment',
        'work_mode_publication_ack_worker_select',
        'work_mode_publication_ack_worker_insert',
        'work_mode_check_in_events_worker_select',
        'work_mode_check_in_events_worker_insert'
      )
  ) then
    raise exception 'DB-010 unexpected worker-action policy; review before applying';
  end if;
end $$;

create index if not exists work_mode_publication_ack_user_created_idx
  on public.work_mode_publication_acknowledgements (user_id, acknowledged_at desc);

create index if not exists work_mode_publication_ack_assignment_idx
  on public.work_mode_publication_acknowledgements (assignment_id, acknowledged_at desc);

create index if not exists work_mode_publication_ack_publication_idx
  on public.work_mode_publication_acknowledgements (publication_id, acknowledged_at desc);

create index if not exists work_mode_check_in_assignment_occurred_idx
  on public.work_mode_check_in_events (assignment_id, occurred_at desc);

create index if not exists work_mode_check_in_user_occurred_idx
  on public.work_mode_check_in_events (user_id, occurred_at desc);

create index if not exists work_mode_check_in_event_occurred_idx
  on public.work_mode_check_in_events (event_id, occurred_at desc)
  where event_id is not null;

alter table public.work_mode_publication_acknowledgements enable row level security;
alter table public.work_mode_publication_acknowledgements force row level security;
alter table public.work_mode_check_in_events enable row level security;
alter table public.work_mode_check_in_events force row level security;

revoke all on public.work_mode_publication_acknowledgements from public, anon, authenticated;
revoke all on public.work_mode_check_in_events from public, anon, authenticated;
grant select, insert on public.work_mode_publication_acknowledgements to authenticated;
grant select, insert on public.work_mode_check_in_events to authenticated;

-- Audience rows are themselves RLS protected. This private helper lets the
-- worker-action insert policy distinguish "no targeted audience" from "this
-- worker is not in the targeted audience" without trusting caller input.
create or replace function work_mode_security.publication_audience_allows(p_publication_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    not exists (
      select 1
      from public.work_mode_publication_audiences audience
      where audience.publication_id = p_publication_id
    )
    or exists (
      select 1
      from public.work_mode_publication_audiences audience
      where audience.publication_id = p_publication_id
        and audience.worker_user_id = (select auth.uid())
    )
  );
$$;

revoke all on function work_mode_security.publication_audience_allows(uuid) from public, anon;
grant usage on schema work_mode_security to authenticated;
grant execute on function work_mode_security.publication_audience_allows(uuid) to authenticated;

-- Replace the archived local-only policies if an operator had applied them;
-- PostgreSQL ORs permissive policies, so leaving either insert policy would
-- reopen the null-event and audience bypasses.
drop policy if exists work_mode_publication_ack_select_own on public.work_mode_publication_acknowledgements;
drop policy if exists work_mode_publication_ack_insert_own_assignment on public.work_mode_publication_acknowledgements;
drop policy if exists work_mode_check_in_select_own on public.work_mode_check_in_events;
drop policy if exists work_mode_check_in_insert_own_assignment on public.work_mode_check_in_events;

drop policy if exists work_mode_publication_ack_worker_select on public.work_mode_publication_acknowledgements;
create policy work_mode_publication_ack_worker_select
  on public.work_mode_publication_acknowledgements
  for select
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists work_mode_publication_ack_worker_insert on public.work_mode_publication_acknowledgements;
create policy work_mode_publication_ack_worker_insert
  on public.work_mode_publication_acknowledgements
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      join public.work_mode_publications publication
        on publication.id = work_mode_publication_acknowledgements.publication_id
      left join public.events_v2 packet_event on packet_event.id = publication.event_id
      left join public.tours packet_tour on packet_tour.id = publication.tour_id
      where assignment.id = work_mode_publication_acknowledgements.assignment_id
        and assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and publication.status = 'published'
        and (
          publication.event_id is null
          or publication.event_id = coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id)
        )
        and (
          publication.tour_id is null
          or publication.tour_id = assignment.tour_id
        )
        and (
          publication.event_id is null
          or publication.tour_id is null
          or (packet_event.org_id is not null and packet_event.org_id = packet_tour.org_id)
        )
        and work_mode_security.publication_audience_allows(publication.id)
        and (
          cardinality(publication.visible_to) = 0
          or exists (
            select 1 from unnest(publication.visible_to) as audience_token(token)
            where lower(replace(btrim(audience_token.token), ' ', '_')) in
              ('all', 'assigned_workers', 'staff', 'crew')
              or lower(replace(btrim(audience_token.token), ' ', '_')) =
                lower(replace(btrim(assignment.role_title), ' ', '_'))
              or lower(replace(btrim(audience_token.token), ' ', '_')) =
                lower(replace(btrim(assignment.department), ' ', '_'))
          )
          or exists (
            select 1
            from public.work_mode_publication_audiences audience
            where audience.publication_id = publication.id
              and audience.worker_user_id = (select auth.uid())
          )
        )
        and (
          nullif(btrim(publication.payload ->> 'required_permission'), '') is null
          or assignment.permissions -> (publication.payload ->> 'required_permission') = 'true'::jsonb
        )
    )
  );

drop policy if exists work_mode_check_in_events_worker_select on public.work_mode_check_in_events;
create policy work_mode_check_in_events_worker_select
  on public.work_mode_check_in_events
  for select
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists work_mode_check_in_events_worker_insert on public.work_mode_check_in_events;
create policy work_mode_check_in_events_worker_insert
  on public.work_mode_check_in_events
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where assignment.id = work_mode_check_in_events.assignment_id
        and assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and assignment.permissions -> 'check_in_out' = 'true'::jsonb
        and work_mode_check_in_events.event_id is not distinct from
          coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id)
    )
  );

comment on table public.work_mode_publication_acknowledgements is
  'Append-only worker acknowledgement evidence for work mode publications. Added by DB-010; preserve rows as audit evidence.';

comment on table public.work_mode_check_in_events is
  'Append-only worker check-in and check-out evidence for Work Mode assignments. Added by DB-010; preserve rows as audit evidence.';

comment on policy work_mode_publication_ack_worker_insert on public.work_mode_publication_acknowledgements is
  'Workers can acknowledge only published packets scoped to their confirmed or active assignment, event or tour identity, publication audience, and required permission.';

comment on policy work_mode_check_in_events_worker_insert on public.work_mode_check_in_events is
  'Workers can append check-in/out only for their confirmed or active assignment with check_in_out permission and matching event identity.';
