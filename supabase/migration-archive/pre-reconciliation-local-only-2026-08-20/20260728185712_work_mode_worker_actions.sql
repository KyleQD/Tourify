-- Manual application only. Do not reset or restore the database.
-- Additive worker acknowledgements and assignment-scoped check-in/out events.

set lock_timeout = '5s';
set statement_timeout = '60s';

create extension if not exists pgcrypto;

create table if not exists public.work_mode_publication_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.employment_assignments(id),
  publication_id uuid not null references public.work_mode_publications(id),
  user_id uuid not null references auth.users(id),
  acknowledged_at timestamptz not null default now(),
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint work_mode_publication_ack_assignment_publication_key
    unique (assignment_id, publication_id),
  constraint work_mode_publication_ack_user_request_key
    unique (user_id, client_request_id)
);

create table if not exists public.work_mode_check_in_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.employment_assignments(id),
  user_id uuid not null references auth.users(id),
  event_id uuid null,
  action text not null check (action in ('check_in', 'check_out')),
  occurred_at timestamptz not null default now(),
  device_occurred_at timestamptz null,
  client_request_id uuid not null,
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  constraint work_mode_check_in_user_request_key
    unique (user_id, client_request_id)
);

create index if not exists work_mode_publication_ack_user_created_idx
  on public.work_mode_publication_acknowledgements (user_id, created_at desc);

create index if not exists work_mode_publication_ack_assignment_idx
  on public.work_mode_publication_acknowledgements (assignment_id, acknowledged_at desc);

create index if not exists work_mode_check_in_assignment_occurred_idx
  on public.work_mode_check_in_events (assignment_id, occurred_at desc);

create index if not exists work_mode_check_in_user_occurred_idx
  on public.work_mode_check_in_events (user_id, occurred_at desc);

alter table public.work_mode_publication_acknowledgements enable row level security;
alter table public.work_mode_publication_acknowledgements force row level security;
alter table public.work_mode_check_in_events enable row level security;
alter table public.work_mode_check_in_events force row level security;

revoke all on table public.work_mode_publication_acknowledgements from anon, authenticated;
revoke all on table public.work_mode_check_in_events from anon, authenticated;
grant select, insert on table public.work_mode_publication_acknowledgements to authenticated;
grant select, insert on table public.work_mode_check_in_events to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_mode_publication_acknowledgements'
      and policyname = 'work_mode_publication_ack_select_own'
  ) then
    create policy work_mode_publication_ack_select_own
      on public.work_mode_publication_acknowledgements
      for select to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_mode_publication_acknowledgements'
      and policyname = 'work_mode_publication_ack_insert_own_assignment'
  ) then
    create policy work_mode_publication_ack_insert_own_assignment
      on public.work_mode_publication_acknowledgements
      for insert to authenticated
      with check (
        (select auth.uid()) is not null
        and (select auth.uid()) = user_id
        and exists (
          select 1
          from public.employment_assignments assignment
          join public.work_mode_publications publication
            on publication.id =
              work_mode_publication_acknowledgements.publication_id
          where assignment.id =
              work_mode_publication_acknowledgements.assignment_id
            and assignment.user_id = (select auth.uid())
            and assignment.status in ('confirmed', 'active')
            and publication.status = 'published'
            and publication.event_id is not distinct from assignment.event_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_mode_check_in_events'
      and policyname = 'work_mode_check_in_select_own'
  ) then
    create policy work_mode_check_in_select_own
      on public.work_mode_check_in_events
      for select to authenticated
      using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'work_mode_check_in_events'
      and policyname = 'work_mode_check_in_insert_own_assignment'
  ) then
    create policy work_mode_check_in_insert_own_assignment
      on public.work_mode_check_in_events
      for insert to authenticated
      with check (
        (select auth.uid()) is not null
        and (select auth.uid()) = user_id
        and exists (
          select 1
          from public.employment_assignments assignment
          where assignment.id = work_mode_check_in_events.assignment_id
            and assignment.user_id = (select auth.uid())
            and assignment.status in ('confirmed', 'active')
            and assignment.permissions -> 'check_in_out' = 'true'::jsonb
            and assignment.event_id is not distinct from work_mode_check_in_events.event_id
        )
      );
  end if;
end
$$;

comment on table public.work_mode_publication_acknowledgements is
  'Worker acknowledgement evidence for assignment-scoped published packets.';
comment on table public.work_mode_check_in_events is
  'Append-only assignment-scoped worker check-in and check-out evidence.';
