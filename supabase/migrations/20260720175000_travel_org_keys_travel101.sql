-- TRAVEL-101: Add/backfill org keys on travel/lodging/transport children.
-- Expand-only. Never invent org_id — inherit from parent; quarantine unresolved.
-- Reuses admin_tenant_key_quarantine from SEC-105.

-- ---------------------------------------------------------------------------
-- 1) Additive org_id columns
-- ---------------------------------------------------------------------------
alter table if exists public.travel_group_members
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.flight_passenger_assignments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.transportation_passenger_assignments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.hotel_room_assignments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.lodging_guest_assignments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.lodging_payments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.lodging_calendar_events
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.travel_coordination_timeline
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.rental_agreement_items
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.rental_payments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Backfill from parents (never invent)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.travel_group_members') is not null
     and to_regclass('public.travel_groups') is not null then
    update public.travel_group_members m
    set org_id = g.org_id
    from public.travel_groups g
    where m.org_id is null
      and m.group_id = g.id
      and g.org_id is not null;
  end if;

  if to_regclass('public.flight_passenger_assignments') is not null
     and to_regclass('public.flight_coordination') is not null then
    update public.flight_passenger_assignments a
    set org_id = f.org_id
    from public.flight_coordination f
    where a.org_id is null
      and a.flight_id = f.id
      and f.org_id is not null;
  end if;

  if to_regclass('public.transportation_passenger_assignments') is not null
     and to_regclass('public.ground_transportation_coordination') is not null then
    update public.transportation_passenger_assignments a
    set org_id = t.org_id
    from public.ground_transportation_coordination t
    where a.org_id is null
      and a.transportation_id = t.id
      and t.org_id is not null;
  end if;

  if to_regclass('public.hotel_room_assignments') is not null
     and to_regclass('public.lodging_bookings') is not null then
    update public.hotel_room_assignments a
    set org_id = b.org_id
    from public.lodging_bookings b
    where a.org_id is null
      and a.lodging_booking_id = b.id
      and b.org_id is not null;
  end if;

  if to_regclass('public.lodging_guest_assignments') is not null
     and to_regclass('public.lodging_bookings') is not null then
    update public.lodging_guest_assignments a
    set org_id = b.org_id
    from public.lodging_bookings b
    where a.org_id is null
      and a.booking_id = b.id
      and b.org_id is not null;
  end if;

  if to_regclass('public.lodging_payments') is not null
     and to_regclass('public.lodging_bookings') is not null then
    update public.lodging_payments p
    set org_id = b.org_id
    from public.lodging_bookings b
    where p.org_id is null
      and p.booking_id = b.id
      and b.org_id is not null;
  end if;

  if to_regclass('public.lodging_calendar_events') is not null
     and to_regclass('public.lodging_bookings') is not null then
    update public.lodging_calendar_events e
    set org_id = b.org_id
    from public.lodging_bookings b
    where e.org_id is null
      and e.booking_id = b.id
      and b.org_id is not null;
  end if;

  if to_regclass('public.travel_coordination_timeline') is not null then
    if to_regclass('public.tours') is not null then
      update public.travel_coordination_timeline tl
      set org_id = t.org_id
      from public.tours t
      where tl.org_id is null
        and tl.tour_id = t.id
        and t.org_id is not null;
    end if;
    if to_regclass('public.events_v2') is not null then
      update public.travel_coordination_timeline tl
      set org_id = e.org_id
      from public.events_v2 e
      where tl.org_id is null
        and tl.event_id = e.id
        and e.org_id is not null;
    end if;
    if to_regclass('public.travel_groups') is not null then
      update public.travel_coordination_timeline tl
      set org_id = g.org_id
      from public.travel_groups g
      where tl.org_id is null
        and tl.group_id = g.id
        and g.org_id is not null;
    end if;
  end if;

  if to_regclass('public.rental_agreement_items') is not null
     and to_regclass('public.rental_agreements') is not null then
    update public.rental_agreement_items i
    set org_id = r.org_id
    from public.rental_agreements r
    where i.org_id is null
      and i.rental_agreement_id = r.id
      and r.org_id is not null;
  end if;

  if to_regclass('public.rental_payments') is not null
     and to_regclass('public.rental_agreements') is not null then
    update public.rental_payments p
    set org_id = r.org_id
    from public.rental_agreements r
    where p.org_id is null
      and p.rental_agreement_id = r.id
      and r.org_id is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Quarantine unresolved null org_id rows
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'travel_group_members',
    'flight_passenger_assignments',
    'transportation_passenger_assignments',
    'hotel_room_assignments',
    'lodging_guest_assignments',
    'lodging_payments',
    'lodging_calendar_events',
    'travel_coordination_timeline',
    'rental_agreement_items',
    'rental_payments'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'org_id'
    ) then
      continue;
    end if;
    execute format(
      $sql$
        insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
        select %L, id, 'unresolvable_org_id_after_parent_backfill'
        from public.%I
        where org_id is null
        on conflict (table_name, record_id) do nothing
      $sql$,
      t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Restrictive null-org deny + indexes
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'travel_group_members',
    'flight_passenger_assignments',
    'transportation_passenger_assignments',
    'hotel_room_assignments',
    'lodging_guest_assignments',
    'lodging_payments',
    'lodging_calendar_events',
    'travel_coordination_timeline',
    'rental_agreement_items',
    'rental_payments'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'org_id'
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists travel101_require_org_id on public.%I', t);
    execute format(
      'create policy travel101_require_org_id on public.%I as restrictive for all to authenticated using (org_id is not null) with check (org_id is not null)',
      t
    );
    execute format(
      'create index if not exists idx_%s_org_id on public.%I (org_id) where org_id is not null',
      t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Verification RPC — counts + parent/child org consistency
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_travel_org_keys()
returns table (
  table_name text,
  total_rows bigint,
  keyed_rows bigint,
  null_org_rows bigint,
  quarantine_open bigint,
  parent_mismatch_rows bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
begin
  return query
  with checks as (
    select 'travel_group_members'::text as table_name,
      (select count(*) from public.travel_group_members) as total_rows,
      (select count(*) from public.travel_group_members where org_id is not null) as keyed_rows,
      (select count(*) from public.travel_group_members where org_id is null) as null_org_rows,
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'travel_group_members' and q.resolved_at is null) as quarantine_open,
      (select count(*) from public.travel_group_members m
        join public.travel_groups g on g.id = m.group_id
        where m.org_id is not null and g.org_id is not null and m.org_id is distinct from g.org_id) as parent_mismatch_rows
    where to_regclass('public.travel_group_members') is not null

    union all
    select 'flight_passenger_assignments',
      (select count(*) from public.flight_passenger_assignments),
      (select count(*) from public.flight_passenger_assignments where org_id is not null),
      (select count(*) from public.flight_passenger_assignments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'flight_passenger_assignments' and q.resolved_at is null),
      (select count(*) from public.flight_passenger_assignments a
        join public.flight_coordination f on f.id = a.flight_id
        where a.org_id is not null and f.org_id is not null and a.org_id is distinct from f.org_id)
    where to_regclass('public.flight_passenger_assignments') is not null

    union all
    select 'transportation_passenger_assignments',
      (select count(*) from public.transportation_passenger_assignments),
      (select count(*) from public.transportation_passenger_assignments where org_id is not null),
      (select count(*) from public.transportation_passenger_assignments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'transportation_passenger_assignments' and q.resolved_at is null),
      (select count(*) from public.transportation_passenger_assignments a
        join public.ground_transportation_coordination t on t.id = a.transportation_id
        where a.org_id is not null and t.org_id is not null and a.org_id is distinct from t.org_id)
    where to_regclass('public.transportation_passenger_assignments') is not null

    union all
    select 'hotel_room_assignments',
      (select count(*) from public.hotel_room_assignments),
      (select count(*) from public.hotel_room_assignments where org_id is not null),
      (select count(*) from public.hotel_room_assignments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'hotel_room_assignments' and q.resolved_at is null),
      (select count(*) from public.hotel_room_assignments a
        join public.lodging_bookings b on b.id = a.lodging_booking_id
        where a.org_id is not null and b.org_id is not null and a.org_id is distinct from b.org_id)
    where to_regclass('public.hotel_room_assignments') is not null

    union all
    select 'lodging_guest_assignments',
      (select count(*) from public.lodging_guest_assignments),
      (select count(*) from public.lodging_guest_assignments where org_id is not null),
      (select count(*) from public.lodging_guest_assignments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'lodging_guest_assignments' and q.resolved_at is null),
      (select count(*) from public.lodging_guest_assignments a
        join public.lodging_bookings b on b.id = a.booking_id
        where a.org_id is not null and b.org_id is not null and a.org_id is distinct from b.org_id)
    where to_regclass('public.lodging_guest_assignments') is not null

    union all
    select 'lodging_payments',
      (select count(*) from public.lodging_payments),
      (select count(*) from public.lodging_payments where org_id is not null),
      (select count(*) from public.lodging_payments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'lodging_payments' and q.resolved_at is null),
      (select count(*) from public.lodging_payments p
        join public.lodging_bookings b on b.id = p.booking_id
        where p.org_id is not null and b.org_id is not null and p.org_id is distinct from b.org_id)
    where to_regclass('public.lodging_payments') is not null

    union all
    select 'lodging_calendar_events',
      (select count(*) from public.lodging_calendar_events),
      (select count(*) from public.lodging_calendar_events where org_id is not null),
      (select count(*) from public.lodging_calendar_events where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'lodging_calendar_events' and q.resolved_at is null),
      (select count(*) from public.lodging_calendar_events e
        join public.lodging_bookings b on b.id = e.booking_id
        where e.org_id is not null and b.org_id is not null and e.org_id is distinct from b.org_id)
    where to_regclass('public.lodging_calendar_events') is not null

    union all
    select 'travel_coordination_timeline',
      (select count(*) from public.travel_coordination_timeline),
      (select count(*) from public.travel_coordination_timeline where org_id is not null),
      (select count(*) from public.travel_coordination_timeline where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'travel_coordination_timeline' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.travel_coordination_timeline') is not null

    union all
    select 'travel_groups',
      (select count(*) from public.travel_groups),
      (select count(*) from public.travel_groups where org_id is not null),
      (select count(*) from public.travel_groups where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'travel_groups' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.travel_groups') is not null

    union all
    select 'flight_coordination',
      (select count(*) from public.flight_coordination),
      (select count(*) from public.flight_coordination where org_id is not null),
      (select count(*) from public.flight_coordination where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'flight_coordination' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.flight_coordination') is not null

    union all
    select 'ground_transportation_coordination',
      (select count(*) from public.ground_transportation_coordination),
      (select count(*) from public.ground_transportation_coordination where org_id is not null),
      (select count(*) from public.ground_transportation_coordination where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'ground_transportation_coordination' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.ground_transportation_coordination') is not null

    union all
    select 'lodging_bookings',
      (select count(*) from public.lodging_bookings),
      (select count(*) from public.lodging_bookings where org_id is not null),
      (select count(*) from public.lodging_bookings where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'lodging_bookings' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.lodging_bookings') is not null
  )
  select c.table_name, c.total_rows, c.keyed_rows, c.null_org_rows, c.quarantine_open, c.parent_mismatch_rows
  from checks c;
end;
$$;

revoke all on function public.admin_verify_travel_org_keys() from public;
grant execute on function public.admin_verify_travel_org_keys() to service_role;

comment on function public.admin_verify_travel_org_keys() is
  'TRAVEL-101 verification: per-table keyed/null/quarantine counts and parent org mismatches.';
