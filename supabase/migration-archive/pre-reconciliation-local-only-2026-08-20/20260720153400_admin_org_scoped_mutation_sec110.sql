-- SEC-110 — Transactional parent-chain assertion for child mutations.
-- Call before child update/delete so parent org scope and child FK are checked
-- inside one database function (same transaction as the caller's statement).

create or replace function public.admin_assert_child_parent_org_chain(
  p_org_id uuid,
  p_parent_table text,
  p_parent_id uuid,
  p_child_table text,
  p_child_id uuid,
  p_parent_fk_column text
)
returns boolean
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
declare
  v_parent_exists boolean;
  v_child_exists boolean;
  v_sql text;
begin
  if p_org_id is null or p_parent_id is null or p_child_id is null then
    raise exception 'org_id, parent_id, and child_id are required' using errcode = '22023';
  end if;

  -- Allowlist tables/columns to avoid dynamic SQL injection via identifiers.
  if p_parent_table not in (
    'lodging_bookings',
    'flight_coordination',
    'ground_transportation_coordination',
    'travel_groups',
    'rental_agreements',
    'logistics_tasks',
    'ticket_sales'
  ) then
    raise exception 'parent table is not allowlisted for org chain checks' using errcode = '22023';
  end if;

  if p_child_table not in (
    'lodging_guest_assignments',
    'lodging_payments',
    'lodging_calendar_events',
    'hotel_room_assignments',
    'flight_passenger_assignments',
    'transportation_passenger_assignments',
    'travel_group_members',
    'rental_agreement_items',
    'rental_payments',
    'logistics_task_equipment',
    'logistics_activity',
    'tickets'
  ) then
    raise exception 'child table is not allowlisted for org chain checks' using errcode = '22023';
  end if;

  if p_parent_fk_column not in (
    'booking_id',
    'lodging_booking_id',
    'flight_id',
    'transportation_id',
    'group_id',
    'rental_agreement_id',
    'task_id',
    'order_id'
  ) then
    raise exception 'parent fk column is not allowlisted' using errcode = '22023';
  end if;

  execute format(
    'select exists (
       select 1 from public.%I
       where id = $1 and org_id = $2
     )',
    p_parent_table
  )
  into v_parent_exists
  using p_parent_id, p_org_id;

  if not v_parent_exists then
    raise exception 'parent record not found for organization' using errcode = 'P0002';
  end if;

  execute format(
    'select exists (
       select 1 from public.%I
       where id = $1 and %I = $2
     )',
    p_child_table,
    p_parent_fk_column
  )
  into v_child_exists
  using p_child_id, p_parent_id;

  if not v_child_exists then
    raise exception 'child record not found under verified parent' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_assert_child_parent_org_chain(uuid, text, uuid, text, uuid, text) from public;
grant execute on function public.admin_assert_child_parent_org_chain(uuid, text, uuid, text, uuid, text)
  to authenticated, service_role;

comment on function public.admin_assert_child_parent_org_chain(uuid, text, uuid, text, uuid, text) is
  'SEC-110: assert child→parent→org chain in one transactional DB call before child mutations.';
