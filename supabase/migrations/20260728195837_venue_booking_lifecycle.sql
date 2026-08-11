-- Venue booking lifecycle expansion.
--
-- Additive only:
--   * preserves the legacy status column and all existing rows;
--   * adds a nullable canonical lifecycle alongside legacy status;
--   * adds append-only lifecycle evidence;
--   * exposes a venue-scoped, resumable operator backfill.
--
-- This file is supplied for manual review and execution. Keep
-- FEATURE_VENUE_BOOKING_LIFECYCLE disabled until the runbook postflight passes.

set client_min_messages = warning;
set lock_timeout = '5s';
set statement_timeout = '60s';

alter table if exists public.venue_booking_requests
  add column if not exists lifecycle_status text,
  add column if not exists lifecycle_owner_id uuid,
  add column if not exists lifecycle_due_at timestamptz,
  add column if not exists currency text,
  add column if not exists agreed_amount numeric(12, 2),
  add column if not exists conflict_state text,
  add column if not exists lifecycle_revision integer;

alter table if exists public.venue_booking_requests
  alter column conflict_state set default 'none',
  alter column lifecycle_revision set default 1;

do $$
begin
  if to_regclass('public.venue_booking_requests') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.venue_booking_requests'::regclass
         and conname = 'venue_booking_requests_lifecycle_status_check'
     ) then
    alter table public.venue_booking_requests
      add constraint venue_booking_requests_lifecycle_status_check
      check (
        lifecycle_status is null
        or lifecycle_status in ('inquiry', 'hold', 'offer', 'contract', 'confirmed', 'cancelled')
      ) not valid;
  end if;

  if to_regclass('public.venue_booking_requests') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.venue_booking_requests'::regclass
         and conname = 'venue_booking_requests_currency_check'
     ) then
    alter table public.venue_booking_requests
      add constraint venue_booking_requests_currency_check
      check (currency is null or currency ~ '^[A-Z]{3}$') not valid;
  end if;

  if to_regclass('public.venue_booking_requests') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.venue_booking_requests'::regclass
         and conname = 'venue_booking_requests_agreed_amount_check'
     ) then
    alter table public.venue_booking_requests
      add constraint venue_booking_requests_agreed_amount_check
      check (agreed_amount is null or agreed_amount >= 0) not valid;
  end if;

  if to_regclass('public.venue_booking_requests') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.venue_booking_requests'::regclass
         and conname = 'venue_booking_requests_conflict_state_check'
     ) then
    alter table public.venue_booking_requests
      add constraint venue_booking_requests_conflict_state_check
      check (
        conflict_state is null
        or conflict_state in ('none', 'warning', 'blocked')
      ) not valid;
  end if;

  if to_regclass('public.venue_booking_requests') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.venue_booking_requests'::regclass
         and conname = 'venue_booking_requests_lifecycle_revision_check'
     ) then
    alter table public.venue_booking_requests
      add constraint venue_booking_requests_lifecycle_revision_check
      check (lifecycle_revision is null or lifecycle_revision > 0) not valid;
  end if;
end
$$;

create table if not exists public.venue_booking_request_timeline (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null,
  venue_id uuid not null,
  actor_user_id uuid,
  client_request_id uuid,
  lifecycle_status text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.venue_booking_request_timeline
  add column if not exists client_request_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venue_booking_request_timeline'::regclass
      and conname = 'venue_booking_request_timeline_booking_request_fk'
  ) then
    alter table public.venue_booking_request_timeline
      add constraint venue_booking_request_timeline_booking_request_fk
      foreign key (booking_request_id)
      references public.venue_booking_requests(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venue_booking_request_timeline'::regclass
      and conname = 'venue_booking_request_timeline_venue_fk'
  ) then
    alter table public.venue_booking_request_timeline
      add constraint venue_booking_request_timeline_venue_fk
      foreign key (venue_id)
      references public.venue_profiles(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venue_booking_request_timeline'::regclass
      and conname = 'venue_booking_request_timeline_actor_fk'
  ) then
    alter table public.venue_booking_request_timeline
      add constraint venue_booking_request_timeline_actor_fk
      foreign key (actor_user_id)
      references auth.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venue_booking_request_timeline'::regclass
      and conname = 'venue_booking_request_timeline_status_check'
  ) then
    alter table public.venue_booking_request_timeline
      add constraint venue_booking_request_timeline_status_check
      check (
        lifecycle_status in ('inquiry', 'hold', 'offer', 'contract', 'confirmed', 'cancelled')
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.venue_booking_request_timeline'::regclass
      and conname = 'venue_booking_request_timeline_metadata_check'
  ) then
    alter table public.venue_booking_request_timeline
      add constraint venue_booking_request_timeline_metadata_check
      check (jsonb_typeof(metadata) = 'object') not valid;
  end if;
end
$$;

-- The index on the existing booking table is intentionally not created here.
-- PostgreSQL forbids CREATE INDEX CONCURRENTLY inside the transaction used for
-- this multi-statement package. Run the one-statement companion SQL only after
-- this file succeeds:
--   supabase/sql/20260728195837_venue_booking_lifecycle_concurrent_index.sql

create index if not exists venue_booking_request_timeline_request_created_idx
  on public.venue_booking_request_timeline (booking_request_id, created_at desc);

create index if not exists venue_booking_request_timeline_venue_created_idx
  on public.venue_booking_request_timeline (venue_id, created_at desc);

create unique index if not exists venue_booking_request_timeline_idempotency_idx
  on public.venue_booking_request_timeline (booking_request_id, client_request_id)
  where client_request_id is not null;

alter table if exists public.venue_profiles
  add column if not exists main_profile_id uuid references public.profiles(id) on delete set null;

alter table public.venue_booking_request_timeline enable row level security;
alter table public.venue_booking_request_timeline force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'venue_booking_request_timeline'
      and policyname = 'booking timeline participants can read'
  ) then
    create policy "booking timeline participants can read"
      on public.venue_booking_request_timeline
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.venue_booking_requests request
          where request.id = booking_request_id
            and (
              request.requester_id = (select auth.uid())
              or exists (
                select 1
                from public.venue_profiles venue
                where venue.id = request.venue_id
                  and (
                    venue.user_id = (select auth.uid())
                    or venue.main_profile_id = (select auth.uid())
                  )
              )
              or exists (
                select 1
                from public.venue_team_members member
                where member.venue_id = request.venue_id
                  and member.user_id = (select auth.uid())
                  and member.status = 'active'
                  and member.permissions ->> 'manage_bookings' = 'true'
              )
            )
        )
      );
  end if;
end
$$;

revoke all on table public.venue_booking_request_timeline from anon;
revoke all on table public.venue_booking_request_timeline from authenticated;
grant select on table public.venue_booking_request_timeline to authenticated;

-- Operator-only helper. Run once per reviewed venue id and repeat until it
-- returns zero. It never infers or changes tenant ownership.
create or replace function public.backfill_venue_booking_lifecycle(
  p_venue_id uuid,
  p_batch_size integer default 500
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  if p_venue_id is null then
    raise exception 'p_venue_id is required';
  end if;

  if p_batch_size < 1 or p_batch_size > 5000 then
    raise exception 'p_batch_size must be between 1 and 5000';
  end if;

  with batch as (
    select request.id
    from public.venue_booking_requests request
    where request.venue_id = p_venue_id
      and request.lifecycle_status is null
    order by request.id
    for update skip locked
    limit p_batch_size
  )
  update public.venue_booking_requests request
  set lifecycle_status = case request.status
      when 'approved' then 'confirmed'
      when 'rejected' then 'cancelled'
      when 'cancelled' then 'cancelled'
      else 'inquiry'
    end,
    conflict_state = coalesce(request.conflict_state, 'none'),
    lifecycle_revision = coalesce(request.lifecycle_revision, 1)
  from batch
  where request.id = batch.id;

  get diagnostics affected = row_count;
  return affected;
end
$$;

revoke all on function public.backfill_venue_booking_lifecycle(uuid, integer) from public;
revoke all on function public.backfill_venue_booking_lifecycle(uuid, integer) from anon;
revoke all on function public.backfill_venue_booking_lifecycle(uuid, integer) from authenticated;

create or replace function public.transition_venue_booking_lifecycle(
  p_booking_request_id uuid,
  p_expected_revision integer,
  p_lifecycle_status text,
  p_actor_user_id uuid,
  p_client_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_request public.venue_booking_requests%rowtype;
  previous_event public.venue_booking_request_timeline%rowtype;
  allowed boolean := false;
begin
  if p_booking_request_id is null
     or p_actor_user_id is null
     or p_client_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'booking request, actor, and client request ids are required';
  end if;

  select *
  into current_request
  from public.venue_booking_requests request
  where request.id = p_booking_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'booking request not found';
  end if;

  select *
  into previous_event
  from public.venue_booking_request_timeline event
  where event.booking_request_id = p_booking_request_id
    and event.client_request_id = p_client_request_id;

  if found then
    if previous_event.lifecycle_status <> p_lifecycle_status then
      raise exception using
        errcode = '23505',
        message = 'client request id was already used for a different transition';
    end if;
    return to_jsonb(current_request);
  end if;

  current_request.lifecycle_status := coalesce(
    current_request.lifecycle_status,
    case current_request.status
      when 'approved' then 'confirmed'
      when 'rejected' then 'cancelled'
      when 'cancelled' then 'cancelled'
      else 'inquiry'
    end
  );
  current_request.lifecycle_revision := coalesce(current_request.lifecycle_revision, 1);

  if current_request.lifecycle_revision <> p_expected_revision then
    raise exception using
      errcode = '40001',
      message = 'booking request was changed by another user';
  end if;

  allowed := case current_request.lifecycle_status
    when 'inquiry' then p_lifecycle_status in ('hold', 'offer', 'cancelled')
    when 'hold' then p_lifecycle_status in ('inquiry', 'offer', 'cancelled')
    when 'offer' then p_lifecycle_status in ('hold', 'contract', 'cancelled')
    when 'contract' then p_lifecycle_status in ('offer', 'confirmed', 'cancelled')
    when 'confirmed' then p_lifecycle_status = 'cancelled'
    else false
  end;

  if not allowed then
    raise exception using
      errcode = '22023',
      message = format(
        'invalid booking lifecycle transition from %s to %s',
        current_request.lifecycle_status,
        p_lifecycle_status
      );
  end if;

  update public.venue_booking_requests request
  set lifecycle_status = p_lifecycle_status,
      lifecycle_owner_id = p_actor_user_id,
      lifecycle_revision = current_request.lifecycle_revision + 1,
      status = case p_lifecycle_status
        when 'confirmed' then 'approved'
        when 'cancelled' then 'cancelled'
        else 'pending'
      end,
      responded_at = case
        when p_lifecycle_status in ('confirmed', 'cancelled') then now()
        else request.responded_at
      end,
      response_message = coalesce(p_note, request.response_message),
      updated_at = now()
  where request.id = p_booking_request_id
  returning * into current_request;

  insert into public.venue_booking_request_timeline (
    booking_request_id,
    venue_id,
    actor_user_id,
    client_request_id,
    lifecycle_status,
    note,
    metadata
  )
  values (
    current_request.id,
    current_request.venue_id,
    p_actor_user_id,
    p_client_request_id,
    p_lifecycle_status,
    p_note,
    jsonb_build_object('revision', current_request.lifecycle_revision)
  );

  return to_jsonb(current_request);
end
$$;

revoke all on function public.transition_venue_booking_lifecycle(
  uuid,
  integer,
  text,
  uuid,
  uuid,
  text
) from public;
revoke all on function public.transition_venue_booking_lifecycle(
  uuid,
  integer,
  text,
  uuid,
  uuid,
  text
) from anon;
revoke all on function public.transition_venue_booking_lifecycle(
  uuid,
  integer,
  text,
  uuid,
  uuid,
  text
) from authenticated;
grant execute on function public.transition_venue_booking_lifecycle(
  uuid,
  integer,
  text,
  uuid,
  uuid,
  text
) to service_role;
