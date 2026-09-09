-- Unified guest list, artist allocation, and crew admission foundation.
-- All privileged mutations are exposed only to service_role through thin
-- security-invoker wrappers. The transactional implementations live in the
-- unexposed private schema with an empty search_path.

set client_min_messages = warning;
create extension if not exists pgcrypto;
create schema if not exists private;

set search_path = private, public;

create table if not exists ticketing_migration_issues (
  source_table text not null,
  source_id uuid not null,
  issue_code text not null,
  details jsonb not null default '{}'::jsonb,
  reported_at timestamptz not null default now(),
  primary key (source_table, source_id, issue_code)
);

alter table ticketing_migration_issues enable row level security;
set search_path = public;

-- Ticket types are part of the events_v2 admission graph. Existing production
-- data was audited as empty; the update remains safe for any resolvable rows.
update public.ticket_types tt
set event_id = e.promoted_event_v2_id
from public.events e
where tt.event_id = e.id
  and e.promoted_event_v2_id is not null
  and tt.event_id <> e.promoted_event_v2_id;

insert into private.ticketing_migration_issues(source_table, source_id, issue_code, details)
select 'ticket_types', tt.id, 'unresolved_event_v2', jsonb_build_object('legacy_event_id', tt.event_id)
from public.ticket_types tt
where not exists (select 1 from public.events_v2 ev2 where ev2.id = tt.event_id)
on conflict do nothing;

alter table public.ticket_types
  drop constraint if exists ticket_types_event_id_fkey;
alter table public.ticket_types
  add constraint ticket_types_event_id_fkey
  foreign key (event_id) references public.events_v2(id) on delete cascade not valid;

do $$
begin
  if not exists (
    select 1 from public.ticket_types tt
    where not exists (select 1 from public.events_v2 ev2 where ev2.id = tt.event_id)
  ) then
    alter table public.ticket_types validate constraint ticket_types_event_id_fkey;
  end if;
end $$;

alter table public.ticket_allocations
  add column if not exists reservation_id uuid references public.ticket_inventory_reservations(id) on delete set null,
  add column if not exists release_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists purpose text not null default 'guest';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_allocations_status_check'
      and conrelid = 'public.ticket_allocations'::regclass
  ) then
    alter table public.ticket_allocations
      add constraint ticket_allocations_status_check
      check (status in ('active', 'released', 'canceled')) not valid;
    alter table public.ticket_allocations
      validate constraint ticket_allocations_status_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_allocations_purpose_check'
      and conrelid = 'public.ticket_allocations'::regclass
  ) then
    alter table public.ticket_allocations
      add constraint ticket_allocations_purpose_check
      check (purpose in ('guest', 'artist_guest', 'staff', 'crew')) not valid;
    alter table public.ticket_allocations
      validate constraint ticket_allocations_purpose_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_allocations_quantity_bounds_check'
      and conrelid = 'public.ticket_allocations'::regclass
  ) then
    alter table public.ticket_allocations
      add constraint ticket_allocations_quantity_bounds_check
      check (quantity_total >= 0 and quantity_issued >= 0 and quantity_issued <= quantity_total) not valid;
    alter table public.ticket_allocations
      validate constraint ticket_allocations_quantity_bounds_check;
  end if;
end $$;

alter table public.ticket_inventory_reservations
  add column if not exists quantity_consumed integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_inventory_reservations_consumed_bounds_check'
      and conrelid = 'public.ticket_inventory_reservations'::regclass
  ) then
    alter table public.ticket_inventory_reservations
      add constraint ticket_inventory_reservations_consumed_bounds_check
      check (quantity_consumed >= 0 and quantity_consumed <= quantity) not valid;
    alter table public.ticket_inventory_reservations
      validate constraint ticket_inventory_reservations_consumed_bounds_check;
  end if;
end $$;

create table if not exists public.ticket_allocation_managers (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.ticket_allocations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (allocation_id, user_id)
);

create table if not exists public.ticket_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events_v2(id) on delete cascade,
  allocation_id uuid not null references public.ticket_allocations(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email_normalized text,
  recipient_name text,
  purpose text not null default 'guest',
  status text not null default 'pending',
  token_hash text not null unique,
  expires_at timestamptz not null,
  source_type text,
  source_id uuid,
  issued_ticket_id uuid references public.tickets(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_invites_recipient_check check (
    recipient_user_id is not null or recipient_email_normalized is not null
  ),
  constraint ticket_invites_email_normalized_check check (
    recipient_email_normalized is null
    or recipient_email_normalized = lower(btrim(recipient_email_normalized))
  ),
  constraint ticket_invites_purpose_check check (
    purpose in ('guest', 'artist_guest', 'staff', 'crew')
  ),
  constraint ticket_invites_status_check check (
    status in ('pending', 'accepted', 'declined', 'expired', 'revoked')
  ),
  constraint ticket_invites_send_count_check check (send_count >= 0)
);

alter table public.booking_requests
  add column if not exists event_v2_id uuid references public.events_v2(id) on delete set null;
alter table public.employment_assignments
  add column if not exists event_v2_id uuid references public.events_v2(id) on delete set null;

-- Accepted canonical tickets also power the user's Upcoming Events feed.
-- The legacy polymorphic attendance check did not yet allow events_v2.
alter table public.event_attendance
  drop constraint if exists event_attendance_event_table_check;
alter table public.event_attendance
  add constraint event_attendance_event_table_check
  check (event_table in ('artist_events', 'events', 'events_v2')) not valid;
alter table public.event_attendance
  validate constraint event_attendance_event_table_check;

update public.booking_requests br
set event_v2_id = ev2.id
from public.events_v2 ev2
where br.event_v2_id is null and br.event_id = ev2.id;

update public.booking_requests br
set event_v2_id = legacy.promoted_event_v2_id
from public.events legacy
where br.event_v2_id is null
  and legacy.id = br.event_id
  and legacy.promoted_event_v2_id is not null;

update public.employment_assignments ea
set event_v2_id = ev2.id
from public.events_v2 ev2
where ea.event_v2_id is null and ea.event_id = ev2.id;

update public.employment_assignments ea
set event_v2_id = legacy.promoted_event_v2_id
from public.events legacy
where ea.event_v2_id is null
  and legacy.id = ea.event_id
  and legacy.promoted_event_v2_id is not null;

insert into private.ticketing_migration_issues(source_table, source_id, issue_code, details)
select 'booking_requests', br.id, 'unresolved_event_v2', jsonb_build_object('legacy_event_id', br.event_id)
from public.booking_requests br
where br.event_v2_id is null
  and br.event_id is not null
  and br.status = 'accepted'
on conflict do nothing;

insert into private.ticketing_migration_issues(source_table, source_id, issue_code, details)
select 'employment_assignments', ea.id, 'unresolved_event_v2', jsonb_build_object('legacy_event_id', ea.event_id)
from public.employment_assignments ea
where ea.event_v2_id is null
  and ea.event_id is not null
  and ea.status in ('confirmed', 'active')
on conflict do nothing;

create index if not exists idx_ticket_allocations_event_status
  on public.ticket_allocations(event_id, status);
create index if not exists idx_ticket_allocations_reservation
  on public.ticket_allocations(reservation_id) where reservation_id is not null;
create index if not exists idx_ticket_allocation_managers_user
  on public.ticket_allocation_managers(user_id, allocation_id);
create index if not exists idx_ticket_invites_allocation_status
  on public.ticket_invites(allocation_id, status);
create index if not exists idx_ticket_invites_event_status
  on public.ticket_invites(event_id, status, created_at desc);
create index if not exists idx_ticket_invites_recipient_user
  on public.ticket_invites(recipient_user_id, status) where recipient_user_id is not null;
create index if not exists idx_ticket_invites_recipient_email
  on public.ticket_invites(recipient_email_normalized, status) where recipient_email_normalized is not null;
create unique index if not exists idx_ticket_invites_active_user
  on public.ticket_invites(event_id, recipient_user_id)
  where recipient_user_id is not null and status in ('pending', 'accepted');
create unique index if not exists idx_ticket_invites_active_email
  on public.ticket_invites(event_id, recipient_email_normalized)
  where recipient_email_normalized is not null and status in ('pending', 'accepted');
create index if not exists idx_booking_requests_event_v2_status
  on public.booking_requests(event_v2_id, status) where event_v2_id is not null;
create index if not exists idx_employment_assignments_event_v2_status
  on public.employment_assignments(event_v2_id, status) where event_v2_id is not null;

alter table public.ticket_allocation_managers enable row level security;
alter table public.ticket_invites enable row level security;

create or replace function private.is_ticket_allocation_manager(p_allocation_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ticket_allocation_managers tam
    where tam.allocation_id = p_allocation_id
      and tam.user_id = (select auth.uid())
  )
$$;

-- Ticketing foundations differ between deployed environments. Resolve access
-- without requiring can_ticketing_on_event or has_event_ticketing_grant to
-- exist, while still honoring them when they are available.
create or replace function private.can_access_event_ticketing(
  p_event_id uuid,
  p_permission text
) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_created_by uuid;
  v_allowed boolean := false;
  v_base_permission text := case
    when p_permission in ('manage_guestlist', 'manage') then 'ticketing.manage'
    else 'ticketing.view'
  end;
begin
  if v_user_id is null then return false; end if;

  select e.org_id, e.created_by into v_org_id, v_created_by
  from public.events_v2 e
  where e.id = p_event_id;
  if not found then return false; end if;
  if v_created_by = v_user_id then return true; end if;

  if to_regprocedure('public.can_ticketing_on_event(uuid,text)') is not null then
    execute 'select public.can_ticketing_on_event($1, $2::text)'
      into v_allowed using p_event_id, v_base_permission;
    if coalesce(v_allowed, false) then return true; end if;
  end if;

  if to_regclass('public.org_members') is not null and v_org_id is not null then
    execute $query$
      select exists (
        select 1 from public.org_members om
        where om.org_id = $1 and om.user_id = $2
          and om.role in ('owner', 'admin', 'production', 'tour_manager')
      )
    $query$ into v_allowed using v_org_id, v_user_id;
    if coalesce(v_allowed, false) then return true; end if;
  end if;

  if to_regclass('public.event_ticketing_config') is not null then
    execute $query$
      select exists (
        select 1 from public.event_ticketing_config etc
        where etc.event_id = $1 and etc.ticketing_owner_id = $2
      )
    $query$ into v_allowed using p_event_id, v_user_id;
    if coalesce(v_allowed, false) then return true; end if;
  end if;

  if to_regprocedure('public.has_event_ticketing_grant(uuid,text)') is not null then
    execute 'select public.has_event_ticketing_grant($1, $2::text)'
      into v_allowed using p_event_id, p_permission;
    if coalesce(v_allowed, false) then return true; end if;
  elsif to_regclass('public.event_ticketing_grants') is not null then
    execute $query$
      select exists (
        select 1 from public.event_ticketing_grants etg
        where etg.event_id = $1 and etg.user_id = $2 and etg.permission = $3
      )
    $query$ into v_allowed using p_event_id, v_user_id, p_permission;
    if coalesce(v_allowed, false) then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function private.can_manage_ticket_allocation(p_allocation_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ticket_allocations ta
    where ta.id = p_allocation_id
      and private.can_access_event_ticketing(ta.event_id, 'manage_guestlist')
  )
$$;

drop policy if exists ticket_allocations_all on public.ticket_allocations;
drop policy if exists tix102_ticket_allocations_select on public.ticket_allocations;
drop policy if exists tix102_ticket_allocations_write on public.ticket_allocations;

create policy unified_ticket_allocations_select
  on public.ticket_allocations for select to authenticated
  using (
    (select private.can_access_event_ticketing(event_id, 'view_overview'))
    or (select private.can_access_event_ticketing(event_id, 'manage_guestlist'))
    or (select private.is_ticket_allocation_manager(id))
  );

create policy ticket_allocation_managers_select
  on public.ticket_allocation_managers for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.can_manage_ticket_allocation(allocation_id))
  );

create policy ticket_invites_select
  on public.ticket_invites for select to authenticated
  using (
    recipient_user_id = (select auth.uid())
    or (select private.can_access_event_ticketing(event_id, 'view_overview'))
    or (select private.can_access_event_ticketing(event_id, 'manage_guestlist'))
    or (select private.is_ticket_allocation_manager(allocation_id))
  );

grant select on public.ticket_allocation_managers to authenticated;
revoke select on public.ticket_invites from authenticated;
grant select (
  id, event_id, allocation_id, ticket_type_id, recipient_user_id,
  recipient_email_normalized, recipient_name, purpose, status, expires_at,
  source_type, source_id, issued_ticket_id, invited_by, accepted_at,
  declined_at, revoked_at, last_sent_at, send_count, created_at, updated_at
) on public.ticket_invites to authenticated;
grant all on public.ticket_allocation_managers, public.ticket_invites to service_role;

-- -------------------------------------------------------------------------
-- Transactional private implementations
-- -------------------------------------------------------------------------

create or replace function private.create_ticket_allocation(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_manager_user_id uuid,
  p_label text,
  p_quantity integer,
  p_release_at timestamptz,
  p_allocation_type text,
  p_purpose text,
  p_notes text,
  p_created_by uuid
) returns public.ticket_allocations
language plpgsql security definer set search_path = '' as $$
declare
  v_type public.ticket_types%rowtype;
  v_reservation_id uuid;
  v_allocation public.ticket_allocations%rowtype;
begin
  if p_quantity < 1 then raise exception 'quantity must be at least 1'; end if;
  if p_release_at <= now() then raise exception 'release cutoff must be in the future'; end if;

  select * into v_type from public.ticket_types
  where id = p_ticket_type_id for update;
  if not found or v_type.event_id <> p_event_id then
    raise exception 'ticket type does not belong to event';
  end if;
  if v_type.quantity_available - v_type.quantity_sold - v_type.quantity_reserved < p_quantity then
    raise exception 'insufficient ticket inventory';
  end if;

  insert into public.ticket_inventory_reservations(
    ticket_type_id, event_id, quantity, quantity_consumed, status,
    expires_at, created_by
  ) values (
    p_ticket_type_id, p_event_id, p_quantity, 0, 'active',
    p_release_at, p_created_by
  ) returning id into v_reservation_id;

  update public.ticket_types
  set quantity_reserved = quantity_reserved + p_quantity, updated_at = now()
  where id = p_ticket_type_id;

  insert into public.ticket_allocations(
    event_id, ticket_type_id, allocation_type, account_type, account_id,
    label, quantity_total, quantity_issued, notes, reservation_id, purpose,
    release_at, status, created_by
  ) values (
    p_event_id, p_ticket_type_id, p_allocation_type, 'user', p_manager_user_id,
    p_label, p_quantity, 0, p_notes, v_reservation_id, p_purpose,
    p_release_at, 'active', p_created_by
  ) returning * into v_allocation;

  insert into public.ticket_allocation_managers(allocation_id, user_id, assigned_by)
  values (v_allocation.id, p_manager_user_id, p_created_by)
  on conflict (allocation_id, user_id) do nothing;

  return v_allocation;
end;
$$;

create or replace function private.resize_ticket_allocation(
  p_allocation_id uuid,
  p_quantity integer,
  p_release_at timestamptz
) returns public.ticket_allocations
language plpgsql security definer set search_path = '' as $$
declare
  v_allocation public.ticket_allocations%rowtype;
  v_reservation public.ticket_inventory_reservations%rowtype;
  v_type public.ticket_types%rowtype;
  v_pending integer;
  v_delta integer;
begin
  if p_release_at is not null and p_release_at <= now() then
    raise exception 'release cutoff must be in the future';
  end if;

  select * into v_allocation from public.ticket_allocations
  where id = p_allocation_id for update;
  if not found or v_allocation.status <> 'active' then raise exception 'active allocation not found'; end if;

  select count(*) into v_pending from public.ticket_invites
  where allocation_id = p_allocation_id and status = 'pending';
  if p_quantity < v_allocation.quantity_issued + v_pending then
    raise exception 'quantity cannot be below accepted plus pending invitations';
  end if;
  if p_quantity < 1 then raise exception 'quantity must be at least 1'; end if;

  select * into v_reservation from public.ticket_inventory_reservations
  where id = v_allocation.reservation_id for update;
  select * into v_type from public.ticket_types
  where id = v_allocation.ticket_type_id for update;

  v_delta := p_quantity - v_allocation.quantity_total;
  if v_delta > 0 and v_type.quantity_available - v_type.quantity_sold - v_type.quantity_reserved < v_delta then
    raise exception 'insufficient ticket inventory';
  end if;

  update public.ticket_inventory_reservations
  set quantity = quantity + v_delta,
      expires_at = coalesce(p_release_at, expires_at),
      status = case when quantity_consumed < quantity + v_delta then 'active' else 'consumed' end,
      updated_at = now()
  where id = v_reservation.id;

  update public.ticket_types
  set quantity_reserved = quantity_reserved + v_delta, updated_at = now()
  where id = v_type.id;

  update public.ticket_allocations
  set quantity_total = p_quantity,
      release_at = coalesce(p_release_at, release_at),
      updated_at = now()
  where id = p_allocation_id
  returning * into v_allocation;
  return v_allocation;
end;
$$;

create or replace function private.create_ticket_invite(
  p_event_id uuid,
  p_allocation_id uuid,
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_purpose text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_source_type text,
  p_source_id uuid,
  p_invited_by uuid
) returns public.ticket_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_allocation public.ticket_allocations%rowtype;
  v_active_count integer;
  v_invite public.ticket_invites%rowtype;
  v_email text := nullif(lower(btrim(p_recipient_email)), '');
begin
  if p_expires_at <= now() then raise exception 'invitation expiry must be in the future'; end if;

  select * into v_allocation from public.ticket_allocations
  where id = p_allocation_id for update;
  if not found or v_allocation.event_id <> p_event_id or v_allocation.status <> 'active' then
    raise exception 'active allocation not found';
  end if;
  if p_purpose <> v_allocation.purpose then raise exception 'invitation purpose must match allocation'; end if;
  if v_allocation.release_at <= now() then raise exception 'allocation cutoff has passed'; end if;
  if p_recipient_user_id is null and v_email is null then raise exception 'recipient required'; end if;

  select count(*) into v_active_count from public.ticket_invites
  where allocation_id = p_allocation_id and status in ('pending', 'accepted');
  if v_active_count >= v_allocation.quantity_total then raise exception 'allocation is full'; end if;

  insert into public.ticket_invites(
    event_id, allocation_id, ticket_type_id, recipient_user_id,
    recipient_email_normalized, recipient_name, purpose, status, token_hash,
    expires_at, source_type, source_id, invited_by, last_sent_at, send_count
  ) values (
    p_event_id, p_allocation_id, v_allocation.ticket_type_id, p_recipient_user_id,
    v_email, nullif(btrim(p_recipient_name), ''), p_purpose, 'pending', p_token_hash,
    least(p_expires_at, v_allocation.release_at), p_source_type, p_source_id,
    p_invited_by, now(), 1
  ) returning * into v_invite;
  return v_invite;
end;
$$;

create or replace function private.accept_ticket_invite(
  p_token_hash text,
  p_user_id uuid,
  p_verified_email text,
  p_credential_token text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.ticket_invites%rowtype;
  v_allocation public.ticket_allocations%rowtype;
  v_reservation public.ticket_inventory_reservations%rowtype;
  v_order_id uuid;
  v_ticket_id uuid;
  v_org_id uuid;
  v_email text := nullif(lower(btrim(p_verified_email)), '');
begin
  select * into v_invite from public.ticket_invites
  where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation not found'; end if;
  if v_invite.status = 'accepted' then
    if v_invite.recipient_user_id = p_user_id then
      return jsonb_build_object('invite_id', v_invite.id, 'ticket_id', v_invite.issued_ticket_id, 'status', 'accepted');
    end if;
    raise exception 'invitation belongs to another account';
  end if;
  if v_invite.status <> 'pending' then raise exception 'invitation is no longer pending'; end if;
  if v_invite.expires_at <= now() then raise exception 'invitation has expired'; end if;
  if v_invite.recipient_user_id is not null and v_invite.recipient_user_id <> p_user_id then
    raise exception 'invitation belongs to another account';
  end if;
  if v_invite.recipient_user_id is null and (v_email is null or v_email <> v_invite.recipient_email_normalized) then
    raise exception 'sign in with the invited email address';
  end if;

  select * into v_allocation from public.ticket_allocations
  where id = v_invite.allocation_id for update;
  if not found or v_allocation.status <> 'active' or v_allocation.release_at <= now() then
    raise exception 'allocation is no longer active';
  end if;
  if v_allocation.quantity_issued >= v_allocation.quantity_total then raise exception 'allocation is full'; end if;

  select * into v_reservation from public.ticket_inventory_reservations
  where id = v_allocation.reservation_id for update;
  perform 1 from public.ticket_types where id = v_invite.ticket_type_id for update;
  if v_reservation.quantity_consumed >= v_reservation.quantity then raise exception 'allocation inventory exhausted'; end if;

  select org_id into v_org_id from public.events_v2 where id = v_invite.event_id;
  if v_org_id is null then raise exception 'event organization is required for ticket issuance'; end if;

  insert into public.ticket_sales(
    org_id, event_id, ticket_type_id, buyer_user_id, buyer_name, buyer_email,
    quantity, unit_price, total_amount, payment_status, payment_method,
    issuance_status, order_number, finalized_at, metadata
  ) values (
    v_org_id, v_invite.event_id, v_invite.ticket_type_id, p_user_id,
    coalesce(v_invite.recipient_name, 'Guest'), v_email, 1, 0, 0,
    'completed', 'complimentary', 'issued',
    'COMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    now(), jsonb_build_object('complimentary', true, 'ticket_invite_id', v_invite.id, 'purpose', v_invite.purpose)
  ) returning id into v_order_id;

  insert into public.tickets(
    org_id, order_id, ticket_type_id, event_id, owner_user_id, owner_email,
    owner_name, status, is_complimentary, allocation_id, unit_price, metadata
  ) values (
    v_org_id, v_order_id, v_invite.ticket_type_id, v_invite.event_id, p_user_id, v_email,
    v_invite.recipient_name, 'valid', true, v_invite.allocation_id, 0,
    jsonb_build_object('admission_source', v_invite.purpose, 'ticket_invite_id', v_invite.id, 'non_transferable', true)
  ) returning id into v_ticket_id;

  insert into public.ticket_credentials(ticket_id, token, status, metadata)
  values (v_ticket_id, p_credential_token, 'active', jsonb_build_object('ticket_invite_id', v_invite.id));

  insert into public.ticket_ownership_events(
    ticket_id, to_user_id, to_email, event_type, actor_user_id, metadata
  ) values (
    v_ticket_id, p_user_id, v_email, 'issued', p_user_id,
    jsonb_build_object('order_id', v_order_id, 'complimentary', true, 'ticket_invite_id', v_invite.id)
  );

  update public.ticket_inventory_reservations
  set quantity_consumed = quantity_consumed + 1,
      status = case when quantity_consumed + 1 = quantity then 'consumed' else 'active' end,
      updated_at = now()
  where id = v_reservation.id;
  update public.ticket_types
  set quantity_reserved = greatest(quantity_reserved - 1, 0),
      quantity_sold = quantity_sold + 1,
      updated_at = now()
  where id = v_invite.ticket_type_id;
  update public.ticket_allocations
  set quantity_issued = quantity_issued + 1, updated_at = now()
  where id = v_invite.allocation_id;
  update public.ticket_invites
  set status = 'accepted', recipient_user_id = p_user_id,
      recipient_email_normalized = coalesce(recipient_email_normalized, v_email),
      accepted_at = now(), issued_ticket_id = v_ticket_id, updated_at = now()
  where id = v_invite.id;

  insert into public.event_attendance(event_id, user_id, event_table, status, updated_at)
  values (v_invite.event_id, p_user_id, 'events_v2', 'attending', now())
  on conflict (event_id, user_id, event_table)
  do update set status = 'attending', updated_at = excluded.updated_at;

  return jsonb_build_object(
    'invite_id', v_invite.id,
    'ticket_id', v_ticket_id,
    'order_id', v_order_id,
    'event_id', v_invite.event_id,
    'status', 'accepted'
  );
end;
$$;

create or replace function private.decline_ticket_invite(
  p_token_hash text,
  p_user_id uuid,
  p_verified_email text
) returns public.ticket_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.ticket_invites%rowtype;
  v_email text := nullif(lower(btrim(p_verified_email)), '');
begin
  select * into v_invite from public.ticket_invites where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation not found'; end if;
  if v_invite.status = 'declined' then return v_invite; end if;
  if v_invite.status <> 'pending' then raise exception 'invitation is no longer pending'; end if;
  if v_invite.recipient_user_id is not null and v_invite.recipient_user_id <> p_user_id then
    raise exception 'invitation belongs to another account';
  end if;
  if v_invite.recipient_user_id is null and (v_email is null or v_email <> v_invite.recipient_email_normalized) then
    raise exception 'sign in with the invited email address';
  end if;
  update public.ticket_invites
  set status = 'declined', declined_at = now(), updated_at = now()
  where id = v_invite.id returning * into v_invite;
  return v_invite;
end;
$$;

create or replace function private.revoke_ticket_invite(
  p_invite_id uuid,
  p_actor_user_id uuid,
  p_door_override boolean default false
) returns public.ticket_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.ticket_invites%rowtype;
  v_allocation public.ticket_allocations%rowtype;
  v_has_checkin boolean;
begin
  select * into v_invite from public.ticket_invites where id = p_invite_id for update;
  if not found then raise exception 'invitation not found'; end if;
  if v_invite.status = 'revoked' then return v_invite; end if;
  if v_invite.status not in ('pending', 'accepted') then raise exception 'invitation cannot be revoked'; end if;

  if v_invite.status = 'accepted' then
    select exists(
      select 1 from public.ticket_checkins
      where ticket_id = v_invite.issued_ticket_id and result = 'valid' and reversed_at is null
    ) into v_has_checkin;
    if v_has_checkin and not p_door_override then raise exception 'checked-in admission requires a door override'; end if;

    select * into v_allocation from public.ticket_allocations
    where id = v_invite.allocation_id for update;
    perform 1 from public.ticket_inventory_reservations
    where id = v_allocation.reservation_id for update;
    perform 1 from public.ticket_types where id = v_invite.ticket_type_id for update;

    update public.tickets set status = 'void', updated_at = now()
    where id = v_invite.issued_ticket_id;
    update public.ticket_credentials
    set status = 'revoked', revoked_at = now(), revoke_reason = 'guest list invitation revoked'
    where ticket_id = v_invite.issued_ticket_id and status = 'active';
    insert into public.ticket_ownership_events(ticket_id, from_user_id, event_type, actor_user_id, metadata)
    values (v_invite.issued_ticket_id, v_invite.recipient_user_id, 'canceled', p_actor_user_id,
      jsonb_build_object('ticket_invite_id', v_invite.id, 'door_override', p_door_override));

    update public.ticket_allocations
    set quantity_issued = greatest(quantity_issued - 1, 0), updated_at = now()
    where id = v_invite.allocation_id;
    update public.ticket_types
    set quantity_sold = greatest(quantity_sold - 1, 0), updated_at = now()
    where id = v_invite.ticket_type_id;

    if v_allocation.status = 'active' and v_allocation.release_at > now() then
      update public.ticket_inventory_reservations
      set quantity_consumed = greatest(quantity_consumed - 1, 0), status = 'active', updated_at = now()
      where id = v_allocation.reservation_id;
      update public.ticket_types
      set quantity_reserved = quantity_reserved + 1, updated_at = now()
      where id = v_invite.ticket_type_id;
    end if;
  end if;

  update public.ticket_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = v_invite.id returning * into v_invite;
  return v_invite;
end;
$$;

create or replace function private.release_ticket_allocation(
  p_allocation_id uuid,
  p_status text default 'released'
) returns public.ticket_allocations
language plpgsql security definer set search_path = '' as $$
declare
  v_allocation public.ticket_allocations%rowtype;
  v_reservation public.ticket_inventory_reservations%rowtype;
  v_remaining integer;
begin
  select * into v_allocation from public.ticket_allocations
  where id = p_allocation_id for update;
  if not found then raise exception 'allocation not found'; end if;
  if v_allocation.status <> 'active' then return v_allocation; end if;

  select * into v_reservation from public.ticket_inventory_reservations
  where id = v_allocation.reservation_id for update;
  perform 1 from public.ticket_types where id = v_allocation.ticket_type_id for update;
  v_remaining := greatest(v_reservation.quantity - v_reservation.quantity_consumed, 0);

  update public.ticket_invites
  set status = case when p_status = 'released' then 'expired' else 'revoked' end,
      revoked_at = case when p_status = 'canceled' then now() else revoked_at end,
      updated_at = now()
  where allocation_id = p_allocation_id and status = 'pending';
  update public.ticket_types
  set quantity_reserved = greatest(quantity_reserved - v_remaining, 0), updated_at = now()
  where id = v_allocation.ticket_type_id;
  update public.ticket_inventory_reservations
  set status = case when quantity_consumed = quantity then 'consumed' else 'released' end,
      updated_at = now()
  where id = v_reservation.id;
  update public.ticket_allocations
  set status = p_status, updated_at = now()
  where id = p_allocation_id returning * into v_allocation;
  return v_allocation;
end;
$$;

create or replace function private.replace_ticket_invite(
  p_invite_id uuid,
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_actor_user_id uuid,
  p_door_override boolean default false
) returns public.ticket_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.ticket_invites%rowtype;
begin
  select * into v_old from public.ticket_invites where id = p_invite_id for update;
  if not found then raise exception 'invitation not found'; end if;
  perform private.revoke_ticket_invite(p_invite_id, p_actor_user_id, p_door_override);
  return private.create_ticket_invite(
    v_old.event_id,
    v_old.allocation_id,
    p_recipient_user_id,
    p_recipient_email,
    p_recipient_name,
    v_old.purpose,
    p_token_hash,
    p_expires_at,
    v_old.source_type,
    v_old.source_id,
    p_actor_user_id
  );
end;
$$;

create or replace function private.rotate_ticket_invite_token(
  p_invite_id uuid,
  p_token_hash text
) returns public.ticket_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.ticket_invites%rowtype;
begin
  update public.ticket_invites
  set token_hash = p_token_hash,
      last_sent_at = now(),
      send_count = send_count + 1,
      updated_at = now()
  where id = p_invite_id and status = 'pending'
  returning * into v_invite;
  if not found then raise exception 'pending invitation not found'; end if;
  return v_invite;
end;
$$;

create or replace function private.expire_ticket_invites_and_allocations()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_allocation record;
  v_invites integer := 0;
  v_allocations integer := 0;
begin
  update public.ticket_invites
  set status = 'expired', updated_at = now()
  where status = 'pending' and expires_at <= now();
  get diagnostics v_invites = row_count;

  for v_allocation in
    select id from public.ticket_allocations
    where status = 'active' and release_at <= now()
    order by id for update
  loop
    perform private.release_ticket_allocation(v_allocation.id, 'released');
    v_allocations := v_allocations + 1;
  end loop;
  return jsonb_build_object('expired_invites', v_invites, 'released_allocations', v_allocations);
end;
$$;

-- Service-only RPC wrappers. These remain security invoker functions in the
-- exposed schema; authenticated users cannot execute them directly.
create or replace function public.ticketing_create_allocation(
  p_event_id uuid, p_ticket_type_id uuid, p_manager_user_id uuid, p_label text,
  p_quantity integer, p_release_at timestamptz, p_allocation_type text,
  p_purpose text, p_notes text, p_created_by uuid
) returns public.ticket_allocations
language sql security invoker set search_path = ''
as $$ select private.create_ticket_allocation(p_event_id, p_ticket_type_id, p_manager_user_id, p_label, p_quantity, p_release_at, p_allocation_type, p_purpose, p_notes, p_created_by) $$;

create or replace function public.ticketing_resize_allocation(
  p_allocation_id uuid, p_quantity integer, p_release_at timestamptz
) returns public.ticket_allocations
language sql security invoker set search_path = ''
as $$ select private.resize_ticket_allocation(p_allocation_id, p_quantity, p_release_at) $$;

create or replace function public.ticketing_create_invite(
  p_event_id uuid, p_allocation_id uuid, p_recipient_user_id uuid,
  p_recipient_email text, p_recipient_name text, p_purpose text,
  p_token_hash text, p_expires_at timestamptz, p_source_type text,
  p_source_id uuid, p_invited_by uuid
) returns public.ticket_invites
language sql security invoker set search_path = ''
as $$ select private.create_ticket_invite(p_event_id, p_allocation_id, p_recipient_user_id, p_recipient_email, p_recipient_name, p_purpose, p_token_hash, p_expires_at, p_source_type, p_source_id, p_invited_by) $$;

create or replace function public.ticketing_accept_invite(
  p_token_hash text, p_user_id uuid, p_verified_email text, p_credential_token text
) returns jsonb
language sql security invoker set search_path = ''
as $$ select private.accept_ticket_invite(p_token_hash, p_user_id, p_verified_email, p_credential_token) $$;

create or replace function public.ticketing_decline_invite(
  p_token_hash text, p_user_id uuid, p_verified_email text
) returns public.ticket_invites
language sql security invoker set search_path = ''
as $$ select private.decline_ticket_invite(p_token_hash, p_user_id, p_verified_email) $$;

create or replace function public.ticketing_revoke_invite(
  p_invite_id uuid, p_actor_user_id uuid, p_door_override boolean default false
) returns public.ticket_invites
language sql security invoker set search_path = ''
as $$ select private.revoke_ticket_invite(p_invite_id, p_actor_user_id, p_door_override) $$;

create or replace function public.ticketing_release_allocation(
  p_allocation_id uuid, p_status text default 'released'
) returns public.ticket_allocations
language sql security invoker set search_path = ''
as $$ select private.release_ticket_allocation(p_allocation_id, p_status) $$;

create or replace function public.ticketing_replace_invite(
  p_invite_id uuid, p_recipient_user_id uuid, p_recipient_email text,
  p_recipient_name text, p_token_hash text, p_expires_at timestamptz,
  p_actor_user_id uuid, p_door_override boolean default false
) returns public.ticket_invites
language sql security invoker set search_path = ''
as $$ select private.replace_ticket_invite(p_invite_id, p_recipient_user_id, p_recipient_email, p_recipient_name, p_token_hash, p_expires_at, p_actor_user_id, p_door_override) $$;

create or replace function public.ticketing_rotate_invite_token(
  p_invite_id uuid, p_token_hash text
) returns public.ticket_invites
language sql security invoker set search_path = ''
as $$ select private.rotate_ticket_invite_token(p_invite_id, p_token_hash) $$;

create or replace function public.ticketing_expire_invites_and_allocations()
returns jsonb
language sql security invoker set search_path = ''
as $$ select private.expire_ticket_invites_and_allocations() $$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
grant usage on schema private to authenticated;
grant execute on function private.is_ticket_allocation_manager(uuid) to authenticated;
grant execute on function private.can_manage_ticket_allocation(uuid) to authenticated;

revoke execute on function public.ticketing_create_allocation(uuid,uuid,uuid,text,integer,timestamptz,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.ticketing_resize_allocation(uuid,integer,timestamptz) from public, anon, authenticated;
revoke execute on function public.ticketing_create_invite(uuid,uuid,uuid,text,text,text,text,timestamptz,text,uuid,uuid) from public, anon, authenticated;
revoke execute on function public.ticketing_accept_invite(text,uuid,text,text) from public, anon, authenticated;
revoke execute on function public.ticketing_decline_invite(text,uuid,text) from public, anon, authenticated;
revoke execute on function public.ticketing_revoke_invite(uuid,uuid,boolean) from public, anon, authenticated;
revoke execute on function public.ticketing_release_allocation(uuid,text) from public, anon, authenticated;
revoke execute on function public.ticketing_replace_invite(uuid,uuid,text,text,text,timestamptz,uuid,boolean) from public, anon, authenticated;
revoke execute on function public.ticketing_rotate_invite_token(uuid,text) from public, anon, authenticated;
revoke execute on function public.ticketing_expire_invites_and_allocations() from public, anon, authenticated;

grant execute on function public.ticketing_create_allocation(uuid,uuid,uuid,text,integer,timestamptz,text,text,text,uuid) to service_role;
grant execute on function public.ticketing_resize_allocation(uuid,integer,timestamptz) to service_role;
grant execute on function public.ticketing_create_invite(uuid,uuid,uuid,text,text,text,text,timestamptz,text,uuid,uuid) to service_role;
grant execute on function public.ticketing_accept_invite(text,uuid,text,text) to service_role;
grant execute on function public.ticketing_decline_invite(text,uuid,text) to service_role;
grant execute on function public.ticketing_revoke_invite(uuid,uuid,boolean) to service_role;
grant execute on function public.ticketing_release_allocation(uuid,text) to service_role;
grant execute on function public.ticketing_replace_invite(uuid,uuid,text,text,text,timestamptz,uuid,boolean) to service_role;
grant execute on function public.ticketing_rotate_invite_token(uuid,text) to service_role;
grant execute on function public.ticketing_expire_invites_and_allocations() to service_role;
