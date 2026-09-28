-- SEC-107 — Replace logistics RLS.
-- Drop team/null-scope bypasses; require parent org_id + logistics capability.
-- Child policies may only authorize through the parent row's org_id (no child-ID
-- or parent-ID guess paths that skip tenant checks).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_logistics(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    uid is not null
    and oid is not null
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_logistics(uuid, uuid, text) from public;
grant execute on function public.can_logistics(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_logistics(uuid, uuid, text) is
  'SEC-107 logistics RLS predicate: membership + logistics.* capability.';

-- Prefer denormalized org_id; fall back to tour/event org for dual-scoped rows.
create or replace function public.resolve_logistics_org_id(
  p_org_id uuid,
  p_event_id uuid,
  p_tour_id uuid
)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select coalesce(
    p_org_id,
    (select t.org_id from public.tours t where t.id = p_tour_id and t.org_id is not null),
    (select e.org_id from public.events_v2 e where e.id = p_event_id and e.org_id is not null)
  );
$$;

revoke all on function public.resolve_logistics_org_id(uuid, uuid, uuid) from public;
grant execute on function public.resolve_logistics_org_id(uuid, uuid, uuid) to authenticated, service_role;

-- Additive org_id on rental parents (expand-only)
alter table if exists public.rental_agreements
  add column if not exists org_id uuid;

do $$
begin
  if to_regclass('public.rental_agreements') is not null then
    update public.rental_agreements ra
    set org_id = t.org_id
    from public.tours t
    where ra.org_id is null and ra.tour_id = t.id and t.org_id is not null;

    update public.rental_agreements ra
    set org_id = e.org_id
    from public.events_v2 e
    where ra.org_id is null and ra.event_id = e.id and e.org_id is not null;

    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'rental_agreements', id, 'unresolvable_org_id_after_parent_backfill'
    from public.rental_agreements
    where org_id is null
    on conflict (table_name, record_id) do nothing;

    alter table public.rental_agreements enable row level security;
    drop policy if exists sec105_require_org_id on public.rental_agreements;
    create policy sec105_require_org_id on public.rental_agreements
      as restrictive for all to authenticated
      using (org_id is not null)
      with check (org_id is not null);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Parent tables: org-capability policies (drop legacy bypass policies)
-- ---------------------------------------------------------------------------

-- lodging_bookings
drop policy if exists lodging_bookings_select on public.lodging_bookings;
drop policy if exists lodging_bookings_manage on public.lodging_bookings;
drop policy if exists sec107_lodging_bookings_select on public.lodging_bookings;
drop policy if exists sec107_lodging_bookings_insert on public.lodging_bookings;
drop policy if exists sec107_lodging_bookings_update on public.lodging_bookings;
drop policy if exists sec107_lodging_bookings_delete on public.lodging_bookings;

create policy sec107_lodging_bookings_select on public.lodging_bookings
  for select to authenticated
  using (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.view'
    )
    or public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

create policy sec107_lodging_bookings_insert on public.lodging_bookings
  for insert to authenticated
  with check (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

create policy sec107_lodging_bookings_update on public.lodging_bookings
  for update to authenticated
  using (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  )
  with check (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

create policy sec107_lodging_bookings_delete on public.lodging_bookings
  for delete to authenticated
  using (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

-- travel_groups
drop policy if exists travel_groups_select on public.travel_groups;
drop policy if exists travel_groups_manage on public.travel_groups;
drop policy if exists sec107_travel_groups_select on public.travel_groups;
drop policy if exists sec107_travel_groups_write on public.travel_groups;

create policy sec107_travel_groups_select on public.travel_groups
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
    or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_travel_groups_write on public.travel_groups
  for all to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  )
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

-- flight_coordination
drop policy if exists flight_coordination_select on public.flight_coordination;
drop policy if exists flight_coordination_manage on public.flight_coordination;
drop policy if exists sec107_flight_coordination_select on public.flight_coordination;
drop policy if exists sec107_flight_coordination_write on public.flight_coordination;

create policy sec107_flight_coordination_select on public.flight_coordination
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
    or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_flight_coordination_write on public.flight_coordination
  for all to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  )
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

-- ground_transportation_coordination
drop policy if exists ground_transportation_select on public.ground_transportation_coordination;
drop policy if exists ground_transportation_manage on public.ground_transportation_coordination;
drop policy if exists sec107_ground_transport_select on public.ground_transportation_coordination;
drop policy if exists sec107_ground_transport_write on public.ground_transportation_coordination;

create policy sec107_ground_transport_select on public.ground_transportation_coordination
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
    or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_ground_transport_write on public.ground_transportation_coordination
  for all to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  )
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

-- rental_agreements
drop policy if exists rental_agreements_select on public.rental_agreements;
drop policy if exists rental_agreements_manage on public.rental_agreements;
drop policy if exists sec107_rental_agreements_select on public.rental_agreements;
drop policy if exists sec107_rental_agreements_write on public.rental_agreements;

create policy sec107_rental_agreements_select on public.rental_agreements
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
    or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_rental_agreements_write on public.rental_agreements
  for all to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  )
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

-- travel_coordination_timeline (parent-scoped)
do $$
begin
  if to_regclass('public.travel_coordination_timeline') is null then
    return;
  end if;

  execute 'drop policy if exists travel_timeline_select on public.travel_coordination_timeline';
  execute 'drop policy if exists travel_timeline_manage on public.travel_coordination_timeline';
  execute 'drop policy if exists sec107_travel_timeline_select on public.travel_coordination_timeline';
  execute 'drop policy if exists sec107_travel_timeline_write on public.travel_coordination_timeline';

  -- Timeline rows typically have event_id/tour_id; org_id may be absent
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'travel_coordination_timeline' and column_name = 'org_id'
  ) then
    execute $pol$
      create policy sec107_travel_timeline_select on public.travel_coordination_timeline
        for select to authenticated
        using (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
        )
    $pol$;
    execute $pol$
      create policy sec107_travel_timeline_write on public.travel_coordination_timeline
        for all to authenticated
        using (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
        )
        with check (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
        )
    $pol$;
  else
    execute $pol$
      create policy sec107_travel_timeline_select on public.travel_coordination_timeline
        for select to authenticated
        using (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(null, event_id, tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(null, event_id, tour_id), 'logistics.manage')
        )
    $pol$;
    execute $pol$
      create policy sec107_travel_timeline_write on public.travel_coordination_timeline
        for all to authenticated
        using (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(null, event_id, tour_id), 'logistics.manage')
        )
        with check (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(null, event_id, tour_id), 'logistics.manage')
        )
    $pol$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Child tables: authorize only via parent.org_id (blocks child-ID bypass)
-- ---------------------------------------------------------------------------

-- lodging_guest_assignments
drop policy if exists lodging_guest_assignments_select on public.lodging_guest_assignments;
drop policy if exists lodging_guest_assignments_manage on public.lodging_guest_assignments;
drop policy if exists sec107_lodging_guests_select on public.lodging_guest_assignments;
drop policy if exists sec107_lodging_guests_write on public.lodging_guest_assignments;

create policy sec107_lodging_guests_select on public.lodging_guest_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_lodging_guests_write on public.lodging_guest_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  );

-- lodging_payments
drop policy if exists lodging_payments_select on public.lodging_payments;
drop policy if exists lodging_payments_manage on public.lodging_payments;
drop policy if exists sec107_lodging_payments_select on public.lodging_payments;
drop policy if exists sec107_lodging_payments_write on public.lodging_payments;

create policy sec107_lodging_payments_select on public.lodging_payments
  for select to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_lodging_payments_write on public.lodging_payments
  for all to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  );

-- lodging_calendar_events
drop policy if exists lodging_calendar_events_select on public.lodging_calendar_events;
drop policy if exists lodging_calendar_events_manage on public.lodging_calendar_events;
drop policy if exists sec107_lodging_calendar_select on public.lodging_calendar_events;
drop policy if exists sec107_lodging_calendar_write on public.lodging_calendar_events;

create policy sec107_lodging_calendar_select on public.lodging_calendar_events
  for select to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_lodging_calendar_write on public.lodging_calendar_events
  for all to authenticated
  using (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.lodging_bookings lb
      where lb.id = booking_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
    )
  );

-- travel_group_members
drop policy if exists travel_group_members_select on public.travel_group_members;
drop policy if exists travel_group_members_manage on public.travel_group_members;
drop policy if exists sec107_travel_group_members_select on public.travel_group_members;
drop policy if exists sec107_travel_group_members_write on public.travel_group_members;

create policy sec107_travel_group_members_select on public.travel_group_members
  for select to authenticated
  using (
    exists (
      select 1 from public.travel_groups g
      where g.id = group_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_travel_group_members_write on public.travel_group_members
  for all to authenticated
  using (
    exists (
      select 1 from public.travel_groups g
      where g.id = group_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.travel_groups g
      where g.id = group_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
    )
  );

-- flight_passenger_assignments
drop policy if exists flight_passenger_assignments_select on public.flight_passenger_assignments;
drop policy if exists flight_passenger_assignments_manage on public.flight_passenger_assignments;
drop policy if exists sec107_flight_passengers_select on public.flight_passenger_assignments;
drop policy if exists sec107_flight_passengers_write on public.flight_passenger_assignments;

create policy sec107_flight_passengers_select on public.flight_passenger_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(f.org_id, f.event_id, f.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(f.org_id, f.event_id, f.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_flight_passengers_write on public.flight_passenger_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(f.org_id, f.event_id, f.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(f.org_id, f.event_id, f.tour_id), 'logistics.manage')
    )
  );

-- transportation_passenger_assignments
drop policy if exists transport_passenger_select on public.transportation_passenger_assignments;
drop policy if exists transport_passenger_manage on public.transportation_passenger_assignments;
drop policy if exists sec107_transport_passengers_select on public.transportation_passenger_assignments;
drop policy if exists sec107_transport_passengers_write on public.transportation_passenger_assignments;

create policy sec107_transport_passengers_select on public.transportation_passenger_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_transport_passengers_write on public.transportation_passenger_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(g.org_id, g.event_id, g.tour_id), 'logistics.manage')
    )
  );

-- hotel_room_assignments (child of lodging)
do $$
begin
  if to_regclass('public.hotel_room_assignments') is null then
    return;
  end if;

  execute 'drop policy if exists hotel_room_assignments_select on public.hotel_room_assignments';
  execute 'drop policy if exists hotel_room_assignments_manage on public.hotel_room_assignments';
  execute 'drop policy if exists sec107_hotel_rooms_select on public.hotel_room_assignments';
  execute 'drop policy if exists sec107_hotel_rooms_write on public.hotel_room_assignments';

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hotel_room_assignments' and column_name = 'lodging_booking_id'
  ) then
    execute $pol$
      create policy sec107_hotel_rooms_select on public.hotel_room_assignments
        for select to authenticated
        using (
          exists (
            select 1 from public.lodging_bookings lb
            where lb.id = lodging_booking_id
              and (
                public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.view')
                or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
              )
          )
        )
    $pol$;
    execute $pol$
      create policy sec107_hotel_rooms_write on public.hotel_room_assignments
        for all to authenticated
        using (
          exists (
            select 1 from public.lodging_bookings lb
            where lb.id = lodging_booking_id
              and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
          )
        )
        with check (
          exists (
            select 1 from public.lodging_bookings lb
            where lb.id = lodging_booking_id
              and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(lb.org_id, lb.event_id, lb.tour_id), 'logistics.manage')
          )
        )
    $pol$;
  end if;
end $$;

-- rental_agreement_items / rental_payments
drop policy if exists rental_agreement_items_select on public.rental_agreement_items;
drop policy if exists rental_agreement_items_manage on public.rental_agreement_items;
drop policy if exists sec107_rental_items_select on public.rental_agreement_items;
drop policy if exists sec107_rental_items_write on public.rental_agreement_items;

create policy sec107_rental_items_select on public.rental_agreement_items
  for select to authenticated
  using (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_rental_items_write on public.rental_agreement_items
  for all to authenticated
  using (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
    )
  );

drop policy if exists rental_payments_select on public.rental_payments;
drop policy if exists rental_payments_manage on public.rental_payments;
drop policy if exists sec107_rental_payments_select on public.rental_payments;
drop policy if exists sec107_rental_payments_write on public.rental_payments;

create policy sec107_rental_payments_select on public.rental_payments
  for select to authenticated
  using (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_rental_payments_write on public.rental_payments
  for all to authenticated
  using (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.rental_agreements ra
      where ra.id = rental_agreement_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(ra.org_id, ra.event_id, ra.tour_id), 'logistics.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- logistics_tasks + children: prefer org_id; require both scopes when dual-set
-- ---------------------------------------------------------------------------
drop policy if exists logistics_tasks_select_account_scope on public.logistics_tasks;
drop policy if exists logistics_tasks_insert_account_scope on public.logistics_tasks;
drop policy if exists logistics_tasks_update_account_scope on public.logistics_tasks;
drop policy if exists logistics_tasks_delete_account_scope on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_select on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_insert on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_update on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_delete on public.logistics_tasks;
drop policy if exists sec107_logistics_tasks_select on public.logistics_tasks;
drop policy if exists sec107_logistics_tasks_insert on public.logistics_tasks;
drop policy if exists sec107_logistics_tasks_update on public.logistics_tasks;
drop policy if exists sec107_logistics_tasks_delete on public.logistics_tasks;

create policy sec107_logistics_tasks_select on public.logistics_tasks
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.view')
    or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_logistics_tasks_insert on public.logistics_tasks
  for insert to authenticated
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_logistics_tasks_update on public.logistics_tasks
  for update to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  )
  with check (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

create policy sec107_logistics_tasks_delete on public.logistics_tasks
  for delete to authenticated
  using (
    public.can_logistics(auth.uid(), public.resolve_logistics_org_id(org_id, event_id, tour_id), 'logistics.manage')
  );

-- logistics_task_equipment / logistics_activity via parent task.org_id
drop policy if exists admin_logistics_equipment_select on public.logistics_task_equipment;
drop policy if exists admin_logistics_equipment_mutate on public.logistics_task_equipment;
drop policy if exists sec107_logistics_equipment_select on public.logistics_task_equipment;
drop policy if exists sec107_logistics_equipment_write on public.logistics_task_equipment;

create policy sec107_logistics_equipment_select on public.logistics_task_equipment
  for select to authenticated
  using (
    exists (
      select 1 from public.logistics_tasks task
      where task.id = task_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_logistics_equipment_write on public.logistics_task_equipment
  for all to authenticated
  using (
    exists (
      select 1 from public.logistics_tasks task
      where task.id = task_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.manage')
    )
  )
  with check (
    exists (
      select 1 from public.logistics_tasks task
      where task.id = task_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.manage')
    )
  );

drop policy if exists admin_logistics_activity_select on public.logistics_activity;
drop policy if exists admin_logistics_activity_insert on public.logistics_activity;
drop policy if exists sec107_logistics_activity_select on public.logistics_activity;
drop policy if exists sec107_logistics_activity_insert on public.logistics_activity;

create policy sec107_logistics_activity_select on public.logistics_activity
  for select to authenticated
  using (
    exists (
      select 1 from public.logistics_tasks task
      where task.id = task_id
        and (
          public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.view')
          or public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.manage')
        )
    )
  );

create policy sec107_logistics_activity_insert on public.logistics_activity
  for insert to authenticated
  with check (
    exists (
      select 1 from public.logistics_tasks task
      where task.id = task_id
        and public.can_logistics(auth.uid(), public.resolve_logistics_org_id(task.org_id, task.event_id, task.tour_id), 'logistics.manage')
    )
  );
