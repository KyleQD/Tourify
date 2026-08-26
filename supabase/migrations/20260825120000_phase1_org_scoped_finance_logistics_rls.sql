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
do $$
declare
  t text;
begin
  foreach t in array array[
    'equipment_catalog', 'equipment_locations',
    'equipment_setup_workflows', 'workflow_templates'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('drop policy if exists %I on %I', t || '_owner_all', t);
    execute format(
      'create policy %I on %I for all using (vendor_id = auth.uid()) with check (vendor_id = auth.uid())',
      t || '_owner_all', t
    );
  end loop;
end $$;

-- equipment_instances inherit access through their catalog's vendor.
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
drop policy if exists equipment_setup_tasks_all on equipment_setup_tasks;
drop policy if exists equipment_setup_tasks_owner_all on equipment_setup_tasks;
create policy equipment_setup_tasks_owner_all on equipment_setup_tasks
  for all
  using (exists (
    select 1 from equipment_setup_workflows w
    where w.id = equipment_setup_tasks.workflow_id
      and w.vendor_id = auth.uid()
  ))
  with check (exists (
    select 1 from equipment_setup_workflows w
    where w.id = equipment_setup_tasks.workflow_id
      and w.vendor_id = auth.uid()
  ));

-- Workflow executions reference templates owned by vendors.
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
do $$
declare
  tables text[] := array[
    'travel_groups', 'travel_group_members',
    'flight_coordination', 'ground_transportation_coordination',
    'hotel_room_assignments', 'travel_coordination_timeline',
    'lodging_bookings', 'lodging_room_types', 'lodging_guest_assignments',
    'lodging_payments', 'lodging_calendar_events', 'lodging_availability'
  ];
  t text;
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

    execute format($p$
      create policy %I on %I for all
        using (public.can_access_org_scope(event_id, tour_id, created_by))
        with check (public.can_access_org_scope(event_id, tour_id, created_by))
    $p$, t || '_org_scope_all', t);
  end loop;
end $$;

-- lodging_providers is a shared directory (no owner column): reads stay open
-- to authenticated users, writes move to service-role only by having NO
-- insert/update/delete policies (implicit deny under RLS).
drop policy if exists lodging_providers_all on lodging_providers;
drop policy if exists lodging_providers_authenticated_all on lodging_providers;
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
