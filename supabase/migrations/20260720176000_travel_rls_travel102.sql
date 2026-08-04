-- TRAVEL-102: Replace remaining permissive travel/lodging/transport RLS.
-- Children authorize via denormalized org_id + parent org match.
-- Catalog tables get org_id + can_logistics (drop auth.uid() IS NOT NULL blankets).

-- ---------------------------------------------------------------------------
-- Catalog org keys (never invent; backfill from related bookings/agreements)
-- ---------------------------------------------------------------------------
alter table if exists public.lodging_providers
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.lodging_room_types
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.lodging_availability
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.rental_clients
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

do $$
begin
  -- Providers: only when all related bookings share one org
  if to_regclass('public.lodging_providers') is not null
     and to_regclass('public.lodging_bookings') is not null then
    update public.lodging_providers p
    set org_id = s.org_id
    from (
      select provider_id, min(org_id) as org_id
      from public.lodging_bookings
      where org_id is not null
      group by provider_id
      having count(distinct org_id) = 1
    ) s
    where p.org_id is null
      and p.id = s.provider_id;
  end if;

  if to_regclass('public.lodging_room_types') is not null
     and to_regclass('public.lodging_providers') is not null then
    update public.lodging_room_types rt
    set org_id = p.org_id
    from public.lodging_providers p
    where rt.org_id is null
      and rt.provider_id = p.id
      and p.org_id is not null;
  end if;

  if to_regclass('public.lodging_availability') is not null
     and to_regclass('public.lodging_providers') is not null then
    update public.lodging_availability a
    set org_id = p.org_id
    from public.lodging_providers p
    where a.org_id is null
      and a.provider_id = p.id
      and p.org_id is not null;
  end if;

  if to_regclass('public.rental_clients') is not null
     and to_regclass('public.rental_agreements') is not null then
    update public.rental_clients c
    set org_id = s.org_id
    from (
      select client_id, min(org_id) as org_id
      from public.rental_agreements
      where org_id is not null
      group by client_id
      having count(distinct org_id) = 1
    ) s
    where c.org_id is null
      and c.id = s.client_id;
  end if;
end $$;

do $$
declare
  t text;
  tables text[] := array[
    'lodging_providers',
    'lodging_room_types',
    'lodging_availability',
    'rental_clients'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format(
      $sql$
        insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
        select %L, id, 'unresolvable_org_id_after_parent_backfill'
        from public.%I
        where org_id is null
        on conflict (table_name, record_id) do nothing
      $sql$,
      t, t
    );
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists travel102_require_org_id on public.%I', t);
    execute format(
      'create policy travel102_require_org_id on public.%I as restrictive for all to authenticated using (org_id is not null) with check (org_id is not null)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Drop catalog blankets; require logistics capability on org_id
-- ---------------------------------------------------------------------------
drop policy if exists lodging_providers_select on public.lodging_providers;
drop policy if exists lodging_providers_manage on public.lodging_providers;
drop policy if exists travel102_lodging_providers_select on public.lodging_providers;
drop policy if exists travel102_lodging_providers_write on public.lodging_providers;

create policy travel102_lodging_providers_select on public.lodging_providers
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), org_id, 'logistics.view')
    or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  );

create policy travel102_lodging_providers_write on public.lodging_providers
  for all to authenticated
  using (public.can_logistics(auth.uid(), org_id, 'logistics.manage'))
  with check (public.can_logistics(auth.uid(), org_id, 'logistics.manage'));

drop policy if exists lodging_room_types_select on public.lodging_room_types;
drop policy if exists lodging_room_types_manage on public.lodging_room_types;
drop policy if exists travel102_lodging_room_types_select on public.lodging_room_types;
drop policy if exists travel102_lodging_room_types_write on public.lodging_room_types;

create policy travel102_lodging_room_types_select on public.lodging_room_types
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), org_id, 'logistics.view')
    or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  );

create policy travel102_lodging_room_types_write on public.lodging_room_types
  for all to authenticated
  using (public.can_logistics(auth.uid(), org_id, 'logistics.manage'))
  with check (public.can_logistics(auth.uid(), org_id, 'logistics.manage'));

drop policy if exists lodging_availability_select on public.lodging_availability;
drop policy if exists lodging_availability_manage on public.lodging_availability;
drop policy if exists travel102_lodging_availability_select on public.lodging_availability;
drop policy if exists travel102_lodging_availability_write on public.lodging_availability;

create policy travel102_lodging_availability_select on public.lodging_availability
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), org_id, 'logistics.view')
    or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  );

create policy travel102_lodging_availability_write on public.lodging_availability
  for all to authenticated
  using (public.can_logistics(auth.uid(), org_id, 'logistics.manage'))
  with check (public.can_logistics(auth.uid(), org_id, 'logistics.manage'));

drop policy if exists rental_clients_select on public.rental_clients;
drop policy if exists rental_clients_manage on public.rental_clients;
drop policy if exists travel102_rental_clients_select on public.rental_clients;
drop policy if exists travel102_rental_clients_write on public.rental_clients;

create policy travel102_rental_clients_select on public.rental_clients
  for select to authenticated
  using (
    public.can_logistics(auth.uid(), org_id, 'logistics.view')
    or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  );

create policy travel102_rental_clients_write on public.rental_clients
  for all to authenticated
  using (public.can_logistics(auth.uid(), org_id, 'logistics.manage'))
  with check (public.can_logistics(auth.uid(), org_id, 'logistics.manage'));

-- ---------------------------------------------------------------------------
-- Harden children: denormalized org capability + parent org match
-- ---------------------------------------------------------------------------

-- travel_group_members
drop policy if exists sec107_travel_group_members_select on public.travel_group_members;
drop policy if exists sec107_travel_group_members_write on public.travel_group_members;
drop policy if exists travel102_travel_group_members_select on public.travel_group_members;
drop policy if exists travel102_travel_group_members_write on public.travel_group_members;

create policy travel102_travel_group_members_select on public.travel_group_members
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.travel_groups g
      where g.id = group_id
        and g.org_id is not distinct from org_id
    )
  );

create policy travel102_travel_group_members_write on public.travel_group_members
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.travel_groups g
      where g.id = group_id and g.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.travel_groups g
      where g.id = group_id and g.org_id is not distinct from org_id
    )
  );

-- flight_passenger_assignments
drop policy if exists sec107_flight_passengers_select on public.flight_passenger_assignments;
drop policy if exists sec107_flight_passengers_write on public.flight_passenger_assignments;
drop policy if exists travel102_flight_passengers_select on public.flight_passenger_assignments;
drop policy if exists travel102_flight_passengers_write on public.flight_passenger_assignments;

create policy travel102_flight_passengers_select on public.flight_passenger_assignments
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id and f.org_id is not distinct from org_id
    )
  );

create policy travel102_flight_passengers_write on public.flight_passenger_assignments
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id and f.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.flight_coordination f
      where f.id = flight_id and f.org_id is not distinct from org_id
    )
  );

-- transportation_passenger_assignments
drop policy if exists sec107_transport_passengers_select on public.transportation_passenger_assignments;
drop policy if exists sec107_transport_passengers_write on public.transportation_passenger_assignments;
drop policy if exists travel102_transport_passengers_select on public.transportation_passenger_assignments;
drop policy if exists travel102_transport_passengers_write on public.transportation_passenger_assignments;

create policy travel102_transport_passengers_select on public.transportation_passenger_assignments
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id and g.org_id is not distinct from org_id
    )
  );

create policy travel102_transport_passengers_write on public.transportation_passenger_assignments
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id and g.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.ground_transportation_coordination g
      where g.id = transportation_id and g.org_id is not distinct from org_id
    )
  );

-- hotel_room_assignments
drop policy if exists sec107_hotel_rooms_select on public.hotel_room_assignments;
drop policy if exists sec107_hotel_rooms_write on public.hotel_room_assignments;
drop policy if exists travel102_hotel_rooms_select on public.hotel_room_assignments;
drop policy if exists travel102_hotel_rooms_write on public.hotel_room_assignments;

do $$
begin
  if to_regclass('public.hotel_room_assignments') is null then
    return;
  end if;

  create policy travel102_hotel_rooms_select on public.hotel_room_assignments
    for select to authenticated
    using (
      org_id is not null
      and (
        public.can_logistics(auth.uid(), org_id, 'logistics.view')
        or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
      )
      and exists (
        select 1 from public.lodging_bookings b
        where b.id = lodging_booking_id and b.org_id is not distinct from org_id
      )
    );

  create policy travel102_hotel_rooms_write on public.hotel_room_assignments
    for all to authenticated
    using (
      org_id is not null
      and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
      and exists (
        select 1 from public.lodging_bookings b
        where b.id = lodging_booking_id and b.org_id is not distinct from org_id
      )
    )
    with check (
      org_id is not null
      and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
      and exists (
        select 1 from public.lodging_bookings b
        where b.id = lodging_booking_id and b.org_id is not distinct from org_id
      )
    );
end $$;

-- lodging_guest_assignments
drop policy if exists sec107_lodging_guests_select on public.lodging_guest_assignments;
drop policy if exists sec107_lodging_guests_write on public.lodging_guest_assignments;
drop policy if exists travel102_lodging_guests_select on public.lodging_guest_assignments;
drop policy if exists travel102_lodging_guests_write on public.lodging_guest_assignments;

create policy travel102_lodging_guests_select on public.lodging_guest_assignments
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

create policy travel102_lodging_guests_write on public.lodging_guest_assignments
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

-- lodging_payments
drop policy if exists sec107_lodging_payments_select on public.lodging_payments;
drop policy if exists sec107_lodging_payments_write on public.lodging_payments;
drop policy if exists travel102_lodging_payments_select on public.lodging_payments;
drop policy if exists travel102_lodging_payments_write on public.lodging_payments;

create policy travel102_lodging_payments_select on public.lodging_payments
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

create policy travel102_lodging_payments_write on public.lodging_payments
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

-- lodging_calendar_events
drop policy if exists sec107_lodging_calendar_select on public.lodging_calendar_events;
drop policy if exists sec107_lodging_calendar_write on public.lodging_calendar_events;
drop policy if exists travel102_lodging_calendar_select on public.lodging_calendar_events;
drop policy if exists travel102_lodging_calendar_write on public.lodging_calendar_events;

create policy travel102_lodging_calendar_select on public.lodging_calendar_events
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

create policy travel102_lodging_calendar_write on public.lodging_calendar_events
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.lodging_bookings b
      where b.id = booking_id and b.org_id is not distinct from org_id
    )
  );

-- travel_coordination_timeline — prefer denormalized org_id
drop policy if exists sec107_travel_timeline_select on public.travel_coordination_timeline;
drop policy if exists sec107_travel_timeline_write on public.travel_coordination_timeline;
drop policy if exists travel102_travel_timeline_select on public.travel_coordination_timeline;
drop policy if exists travel102_travel_timeline_write on public.travel_coordination_timeline;

create policy travel102_travel_timeline_select on public.travel_coordination_timeline
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
  );

create policy travel102_travel_timeline_write on public.travel_coordination_timeline
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
  );

-- rental children
drop policy if exists sec107_rental_items_select on public.rental_agreement_items;
drop policy if exists sec107_rental_items_write on public.rental_agreement_items;
drop policy if exists travel102_rental_items_select on public.rental_agreement_items;
drop policy if exists travel102_rental_items_write on public.rental_agreement_items;

create policy travel102_rental_items_select on public.rental_agreement_items
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  );

create policy travel102_rental_items_write on public.rental_agreement_items
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  );

drop policy if exists sec107_rental_payments_select on public.rental_payments;
drop policy if exists sec107_rental_payments_write on public.rental_payments;
drop policy if exists travel102_rental_payments_select on public.rental_payments;
drop policy if exists travel102_rental_payments_write on public.rental_payments;

create policy travel102_rental_payments_select on public.rental_payments
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_logistics(auth.uid(), org_id, 'logistics.view')
      or public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    )
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  );

create policy travel102_rental_payments_write on public.rental_payments
  for all to authenticated
  using (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  )
  with check (
    org_id is not null
    and public.can_logistics(auth.uid(), org_id, 'logistics.manage')
    and exists (
      select 1 from public.rental_agreements r
      where r.id = rental_agreement_id and r.org_id is not distinct from org_id
    )
  );
