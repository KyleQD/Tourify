-- PHASE 1 (SEC / ADM-M-002): Replace authenticated-wide RLS on finance,
-- vendor-equipment, workflow and travel/lodging tables with tenant-scoped
-- predicates. Additive + reversible: only drops the named wide policies and
-- re-issues scoped ones. Rollback note at bottom.
--
-- Threat model: a malicious authenticated client calling PostgREST directly.
-- App-layer org filters are not trusted; every table below must enforce
-- isolation in the database.

set client_min_messages = warning;

-- ============================================================================
-- Scope helper
-- A row is accessible when the caller is an org member of the row's event org,
-- the row's tour org, or created the row. Rows with NO scope linkage and no
-- creator are invisible to non-service principals (fail closed).
-- SECURITY DEFINER avoids RLS recursion on events_v2/tours; search_path fixed.
-- ============================================================================
create or replace function public.can_access_org_scope(
  p_event_id uuid,
  p_tour_id uuid,
  p_created_by uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  if p_created_by is not null and p_created_by = v_uid then
    return true;
  end if;

  if p_event_id is not null and exists (
    select 1
    from events_v2 e
    where e.id = p_event_id
      and public.is_org_member(v_uid, e.org_id)
  ) then
    return true;
  end if;

  if p_tour_id is not null and exists (
    select 1
    from tours t
    where t.id = p_tour_id
      and public.is_org_member(v_uid, t.org_id)
  ) then
    return true;
  end if;

  -- Row with neither event, tour, nor creator linkage: deny.
  return false;
end;
$$;

-- ============================================================================
-- financial_transactions + budgets (20260328140000 shipped auth-wide FOR ALL)
-- ============================================================================
drop policy if exists fin_tx_all on financial_transactions;
drop policy if exists budgets_all on budgets;

drop policy if exists fin_tx_org_member on financial_transactions;
create policy fin_tx_org_member on financial_transactions
  for all
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists budgets_org_member on budgets;
create policy budgets_org_member on budgets
  for all
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

-- ============================================================================
-- Vendor-owned equipment/workflow estate (20260328160000 shipped auth-wide)
-- These are vendor inventory rows keyed by vendor_id, not org tenant data:
-- correct boundary is ownership.
-- ============================================================================
drop policy if exists equip_catalog_all on equipment_catalog;
drop policy if exists equipment_catalog_all on equipment_catalog;
drop policy if exists equipment_catalog_owner_all on equipment_catalog;
create policy equipment_catalog_owner_all on equipment_catalog
  for all to authenticated
  using (vendor_id = auth.uid())
  with check (vendor_id = auth.uid());

drop policy if exists equip_locations_all on equipment_locations;
drop policy if exists equipment_locations_all on equipment_locations;
drop policy if exists equipment_locations_owner_all on equipment_locations;
create policy equipment_locations_owner_all on equipment_locations
  for all to authenticated
  using (vendor_id = auth.uid())
  with check (vendor_id = auth.uid());

drop policy if exists wf_templates_all on workflow_templates;
drop policy if exists workflow_templates_all on workflow_templates;
drop policy if exists workflow_templates_owner_all on workflow_templates;
create policy workflow_templates_owner_all on workflow_templates
  for all to authenticated
  using (vendor_id = auth.uid())
  with check (vendor_id = auth.uid());

-- equipment_setup_workflows predates the vendor migration and is owned through
-- its site-map creator contract, not a vendor_id column.
drop policy if exists equipment_setup_workflows_all on equipment_setup_workflows;
drop policy if exists setup_workflows_all on equipment_setup_workflows;
drop policy if exists equipment_setup_workflows_owner_all on equipment_setup_workflows;
create policy equipment_setup_workflows_owner_all on equipment_setup_workflows
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- equipment_instances inherit access through their catalog's vendor.
drop policy if exists equip_instances_all on equipment_instances;
drop policy if exists equipment_instances_all on equipment_instances;
drop policy if exists equipment_instances_owner_all on equipment_instances;
create policy equipment_instances_owner_all on equipment_instances
  for all
  using (exists (
    select 1 from equipment_catalog c
    where c.id = equipment_instances.catalog_id
      and c.vendor_id = auth.uid()
  ))
  with check (exists (
    select 1 from equipment_catalog c
    where c.id = equipment_instances.catalog_id
      and c.vendor_id = auth.uid()
  ));

-- Setup tasks hang off setup workflows (site-map scoped); access via parent.
drop policy if exists setup_tasks_all on equipment_setup_tasks;
drop policy if exists equipment_setup_tasks_all on equipment_setup_tasks;
drop policy if exists equipment_setup_tasks_owner_all on equipment_setup_tasks;
create policy equipment_setup_tasks_owner_all on equipment_setup_tasks
  for all
  using (exists (
    select 1 from equipment_setup_workflows w
    where w.id = equipment_setup_tasks.workflow_id
      and w.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from equipment_setup_workflows w
    where w.id = equipment_setup_tasks.workflow_id
      and w.created_by = auth.uid()
  ));

-- Workflow executions reference templates owned by vendors.
drop policy if exists wf_executions_all on workflow_executions;
drop policy if exists workflow_executions_all on workflow_executions;
drop policy if exists workflow_executions_owner_all on workflow_executions;
create policy workflow_executions_owner_all on workflow_executions
  for all
  using (exists (
    select 1 from workflow_templates wt
    where wt.id = workflow_executions.template_id
      and wt.vendor_id = auth.uid()
  ))
  with check (exists (
    select 1 from workflow_templates wt
    where wt.id = workflow_executions.template_id
      and wt.vendor_id = auth.uid()
  ));

-- ============================================================================
-- Travel + lodging operational family (20260413200100 shipped
-- `auth.uid() IS NOT NULL` = any signed-in user). Scope through event/tour
-- membership with creator fallback where the column exists.
-- ============================================================================

create or replace function public.can_access_lodging_booking(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lodging_bookings b
    where b.id = p_booking_id
      and public.can_access_org_scope(b.event_id, b.tour_id, coalesce(b.assigned_by, b.managed_by))
  );
$$;

create or replace function public.can_access_travel_group(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.travel_groups g
    where g.id = p_group_id
      and public.can_access_org_scope(g.event_id, g.tour_id, g.created_by)
  );
$$;

create or replace function public.can_access_flight(p_flight_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.flight_coordination f
    where f.id = p_flight_id
      and public.can_access_org_scope(f.event_id, f.tour_id, f.assigned_by)
  );
$$;

create or replace function public.can_access_ground_transport(p_transport_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ground_transportation_coordination g
    where g.id = p_transport_id
      and public.can_access_org_scope(g.event_id, g.tour_id, g.assigned_by)
  );
$$;

do $$
declare
  tables text[] := array[
    'travel_groups', 'travel_group_members',
    'flight_coordination', 'flight_passenger_assignments',
    'hotel_room_assignments',
    'lodging_bookings', 'lodging_guest_assignments',
    'lodging_payments', 'lodging_calendar_events'
  ];
  t text;
  predicate text;
begin
  foreach t in array tables loop
    if not exists (select 1 from information_schema.tables where table_name = t) then
      continue;
    end if;

    execute format('alter table %I enable row level security', t);

    -- Drop known wide policies from any generation of this schema.
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on %I', t || '_select_authenticated', t);
    execute format('drop policy if exists %I on %I', 'auth_any_select_' || t, t);
    execute format('drop policy if exists %I on %I', 'auth_any_modify_' || t, t);
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_manage', t);

    predicate := case t
      when 'travel_groups' then 'public.can_access_org_scope(event_id, tour_id, created_by)'
      when 'travel_group_members' then 'public.can_access_travel_group(group_id)'
      when 'flight_coordination' then 'public.can_access_org_scope(event_id, tour_id, assigned_by)'
      when 'flight_passenger_assignments' then 'public.can_access_flight(flight_id)'
      when 'hotel_room_assignments' then 'public.can_access_lodging_booking(lodging_booking_id)'
      when 'lodging_bookings' then 'public.can_access_org_scope(event_id, tour_id, coalesce(assigned_by, managed_by))'
      when 'lodging_guest_assignments' then 'public.can_access_lodging_booking(booking_id)'
      when 'lodging_payments' then 'public.can_access_lodging_booking(booking_id)'
      when 'lodging_calendar_events' then 'public.can_access_lodging_booking(booking_id)'
    end;

    execute format($p$
      create policy %I on %I for all to authenticated
        using (%s)
        with check (%s)
    $p$, t || '_org_scope_all', t, predicate, predicate);
  end loop;
end $$;

-- These historical policy names do not match their table names, so keep the
-- replacements explicit for both human review and static migration validation.
drop policy if exists ground_transportation_select on ground_transportation_coordination;
drop policy if exists ground_transportation_manage on ground_transportation_coordination;
drop policy if exists ground_transportation_coordination_org_scope_all on ground_transportation_coordination;
create policy ground_transportation_coordination_org_scope_all on ground_transportation_coordination
  for all to authenticated
  using (public.can_access_org_scope(event_id, tour_id, assigned_by))
  with check (public.can_access_org_scope(event_id, tour_id, assigned_by));

drop policy if exists transport_passenger_select on transportation_passenger_assignments;
drop policy if exists transport_passenger_manage on transportation_passenger_assignments;
drop policy if exists transportation_passenger_assignments_org_scope_all on transportation_passenger_assignments;
create policy transportation_passenger_assignments_org_scope_all on transportation_passenger_assignments
  for all to authenticated
  using (public.can_access_ground_transport(transportation_id))
  with check (public.can_access_ground_transport(transportation_id));

drop policy if exists travel_timeline_select on travel_coordination_timeline;
drop policy if exists travel_timeline_manage on travel_coordination_timeline;
drop policy if exists travel_coordination_timeline_org_scope_all on travel_coordination_timeline;
create policy travel_coordination_timeline_org_scope_all on travel_coordination_timeline
  for all to authenticated
  using (public.can_access_org_scope(event_id, tour_id, created_by))
  with check (public.can_access_org_scope(event_id, tour_id, created_by));

-- Provider room types and availability are shared reference data. Authenticated
-- users may read them; mutation remains service-role-only through implicit deny.
do $$
declare
  t text;
begin
  foreach t in array array['lodging_room_types', 'lodging_availability'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_manage', t);
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_select_authenticated', t
    );
  end loop;
end $$;

-- lodging_providers is a shared directory (no owner column): reads stay open
-- to authenticated users, writes move to service-role only by having NO
-- insert/update/delete policies (implicit deny under RLS).
drop policy if exists lodging_providers_all on lodging_providers;
drop policy if exists lodging_providers_authenticated_all on lodging_providers;
drop policy if exists lodging_providers_select on lodging_providers;
drop policy if exists lodging_providers_manage on lodging_providers;
alter table lodging_providers enable row level security;
create policy lodging_providers_select_authenticated on lodging_providers
  for select to authenticated
  using (true);

-- ============================================================================
-- REL-101 extension hooks: the persona-matrix structural test now covers these
-- domains via __tests__/admin/rls-persona-matrix.test.ts additions.
-- ============================================================================

-- ROLLBACK NOTE
-- ------------
-- Re-issue the prior policies to restore pre-migration behavior (NOT
-- recommended; they were cross-tenant):
--   fin_tx_all/budgets_all/equipment_catalog_all/... as documented in
--   migrations 20260328140000, 20260328160000, 20260413200100.
