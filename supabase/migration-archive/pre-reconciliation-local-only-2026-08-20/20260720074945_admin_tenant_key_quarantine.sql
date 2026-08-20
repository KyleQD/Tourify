-- SEC-105 — Additive tenant keys + quarantine for unresolved org scope.
-- Expand-only: never guess org_id. Unresolvable rows stay null, are listed in
-- admin_tenant_key_quarantine, and are denied to authenticated users via
-- RESTRICTIVE policies (org_id IS NOT NULL).

-- ---------------------------------------------------------------------------
-- Quarantine registry (append-only operational review table)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_tenant_key_quarantine (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  reason text not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_org_id uuid,
  notes text,
  unique (table_name, record_id)
);

comment on table public.admin_tenant_key_quarantine is
  'SEC-105 unresolved tenant-key rows. Authenticated clients have no access.';

alter table public.admin_tenant_key_quarantine enable row level security;

drop policy if exists admin_tenant_key_quarantine_deny_all on public.admin_tenant_key_quarantine;
create policy admin_tenant_key_quarantine_deny_all
  on public.admin_tenant_key_quarantine
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on public.admin_tenant_key_quarantine from anon, authenticated;
-- service_role retains access for operator SQL / internal jobs

create or replace view public.admin_tenant_key_quarantine_v
  with (security_invoker = true)
as
select
  q.id,
  q.table_name,
  q.record_id,
  q.reason,
  q.detected_at,
  q.resolved_at,
  q.resolved_org_id,
  q.notes
from public.admin_tenant_key_quarantine q
where q.resolved_at is null;

comment on view public.admin_tenant_key_quarantine_v is
  'SEC-105 open quarantine queue (security_invoker; still denied to authenticated).';

revoke all on public.admin_tenant_key_quarantine_v from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Additive nullable org_id on high-risk domain tables (if missing)
-- ---------------------------------------------------------------------------
alter table if exists public.logistics_tasks
  add column if not exists org_id uuid;

alter table if exists public.flight_coordination
  add column if not exists org_id uuid;

alter table if exists public.lodging_bookings
  add column if not exists org_id uuid;

alter table if exists public.ground_transportation_coordination
  add column if not exists org_id uuid;

alter table if exists public.travel_groups
  add column if not exists org_id uuid;

alter table if exists public.logistics_acknowledgements
  add column if not exists org_id uuid;

alter table if exists public.staff_members
  add column if not exists org_id uuid;

alter table if exists public.staff_shifts
  add column if not exists org_id uuid;

alter table if exists public.staff_zones
  add column if not exists org_id uuid;

alter table if exists public.site_maps
  add column if not exists org_id uuid;

alter table if exists public.site_map_zones
  add column if not exists org_id uuid;

alter table if exists public.ticket_types
  add column if not exists org_id uuid;

alter table if exists public.ticket_sales
  add column if not exists org_id uuid;

alter table if exists public.tickets
  add column if not exists org_id uuid;

alter table if exists public.event_ticketing_config
  add column if not exists org_id uuid;

alter table if exists public.ticket_campaigns
  add column if not exists org_id uuid;

-- Partial indexes for tenant-scoped lookups
do $$
declare
  t text;
  tables text[] := array[
    'logistics_tasks',
    'flight_coordination',
    'lodging_bookings',
    'ground_transportation_coordination',
    'travel_groups',
    'staff_zones',
    'site_maps',
    'site_map_zones',
    'ticket_types',
    'ticket_sales',
    'tickets',
    'event_ticketing_config'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format(
      'create index if not exists %I on public.%I (org_id) where org_id is not null',
      'idx_' || t || '_org_id',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Deterministic backfill helpers (parent tour/event org only — never guess)
-- ---------------------------------------------------------------------------
do $$
begin
  -- logistics_tasks
  if to_regclass('public.logistics_tasks') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'logistics_tasks' and column_name = 'tour_id'
    ) and to_regclass('public.tours') is not null then
      update public.logistics_tasks lt
      set org_id = t.org_id
      from public.tours t
      where lt.org_id is null and lt.tour_id = t.id and t.org_id is not null;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'logistics_tasks' and column_name = 'event_id'
    ) and to_regclass('public.events_v2') is not null then
      update public.logistics_tasks lt
      set org_id = e.org_id
      from public.events_v2 e
      where lt.org_id is null and lt.event_id = e.id and e.org_id is not null;
    end if;
  end if;

  -- ground / flight / lodging / travel_groups
  if to_regclass('public.ground_transportation_coordination') is not null then
    update public.ground_transportation_coordination g
    set org_id = t.org_id
    from public.tours t
    where g.org_id is null and g.tour_id = t.id and t.org_id is not null;
    update public.ground_transportation_coordination g
    set org_id = e.org_id
    from public.events_v2 e
    where g.org_id is null and g.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.flight_coordination') is not null then
    update public.flight_coordination f
    set org_id = t.org_id
    from public.tours t
    where f.org_id is null and f.tour_id = t.id and t.org_id is not null;
    update public.flight_coordination f
    set org_id = e.org_id
    from public.events_v2 e
    where f.org_id is null and f.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.lodging_bookings') is not null then
    update public.lodging_bookings l
    set org_id = t.org_id
    from public.tours t
    where l.org_id is null and l.tour_id = t.id and t.org_id is not null;
    update public.lodging_bookings l
    set org_id = e.org_id
    from public.events_v2 e
    where l.org_id is null and l.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.travel_groups') is not null then
    update public.travel_groups g
    set org_id = t.org_id
    from public.tours t
    where g.org_id is null and g.tour_id = t.id and t.org_id is not null;
    update public.travel_groups g
    set org_id = e.org_id
    from public.events_v2 e
    where g.org_id is null and g.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.logistics_acknowledgements') is not null then
    update public.logistics_acknowledgements a
    set org_id = t.org_id
    from public.tours t
    where a.org_id is null and a.tour_id = t.id and t.org_id is not null;
    update public.logistics_acknowledgements a
    set org_id = e.org_id
    from public.events_v2 e
    where a.org_id is null and a.event_id = e.id and e.org_id is not null;
  end if;

  -- staffing
  if to_regclass('public.staff_shifts') is not null and to_regclass('public.events_v2') is not null then
    update public.staff_shifts ss
    set org_id = e.org_id
    from public.events_v2 e
    where ss.org_id is null and ss.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.staff_zones') is not null and to_regclass('public.events_v2') is not null then
    update public.staff_zones sz
    set org_id = e.org_id
    from public.events_v2 e
    where sz.org_id is null and sz.event_id = e.id and e.org_id is not null;
  end if;

  if to_regclass('public.staff_members') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'staff_members' and column_name = 'entity_type'
    ) then
      update public.staff_members sm
      set org_id = sm.entity_id
      where sm.org_id is null
        and sm.entity_type = 'org'
        and exists (select 1 from public.organizations o where o.id = sm.entity_id);

      if to_regclass('public.events_v2') is not null then
        update public.staff_members sm
        set org_id = e.org_id
        from public.events_v2 e
        where sm.org_id is null
          and sm.entity_type = 'event'
          and sm.entity_id = e.id
          and e.org_id is not null;
      end if;
    end if;

    -- inherit from linked shifts when member still null
    if to_regclass('public.staff_shifts') is not null then
      update public.staff_members sm
      set org_id = ss.org_id
      from public.staff_shifts ss
      where sm.org_id is null
        and ss.staff_member_id = sm.id
        and ss.org_id is not null;
    end if;
  end if;

  -- site maps (tour first; event_id may point at legacy events — only use events_v2 when FK matches)
  if to_regclass('public.site_maps') is not null then
    if to_regclass('public.tours') is not null then
      update public.site_maps sm
      set org_id = t.org_id
      from public.tours t
      where sm.org_id is null and sm.tour_id = t.id and t.org_id is not null;
    end if;
    if to_regclass('public.events_v2') is not null then
      update public.site_maps sm
      set org_id = e.org_id
      from public.events_v2 e
      where sm.org_id is null and sm.event_id = e.id and e.org_id is not null;
    end if;
  end if;

  if to_regclass('public.site_map_zones') is not null and to_regclass('public.site_maps') is not null then
    update public.site_map_zones z
    set org_id = sm.org_id
    from public.site_maps sm
    where z.org_id is null and z.site_map_id = sm.id and sm.org_id is not null;
  end if;

  -- ticketing from events_v2
  if to_regclass('public.events_v2') is not null then
    if to_regclass('public.ticket_types') is not null then
      update public.ticket_types tt
      set org_id = e.org_id
      from public.events_v2 e
      where tt.org_id is null and tt.event_id = e.id and e.org_id is not null;
    end if;
    if to_regclass('public.ticket_sales') is not null then
      update public.ticket_sales ts
      set org_id = e.org_id
      from public.events_v2 e
      where ts.org_id is null and ts.event_id = e.id and e.org_id is not null;
    end if;
    if to_regclass('public.tickets') is not null then
      update public.tickets tix
      set org_id = e.org_id
      from public.events_v2 e
      where tix.org_id is null and tix.event_id = e.id and e.org_id is not null;
    end if;
    if to_regclass('public.event_ticketing_config') is not null then
      update public.event_ticketing_config c
      set org_id = e.org_id
      from public.events_v2 e
      where c.org_id is null and c.event_id = e.id and e.org_id is not null;
    end if;
    if to_regclass('public.ticket_campaigns') is not null then
      update public.ticket_campaigns c
      set org_id = e.org_id
      from public.events_v2 e
      where c.org_id is null and c.event_id = e.id and e.org_id is not null;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Quarantine remaining null org_id rows (still inaccessible to normal users)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'logistics_tasks',
    'ground_transportation_coordination',
    'flight_coordination',
    'lodging_bookings',
    'travel_groups',
    'logistics_acknowledgements',
    'staff_members',
    'staff_shifts',
    'staff_zones',
    'site_maps',
    'site_map_zones',
    'ticket_types',
    'ticket_sales',
    'tickets',
    'event_ticketing_config',
    'ticket_campaigns'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
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

  -- Finance already has NOT NULL org_id; quarantine only orphan org references
  if to_regclass('public.financial_transactions') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'financial_transactions', ft.id, 'org_id_missing_organization_row'
    from public.financial_transactions ft
    where ft.org_id is not null
      and not exists (select 1 from public.organizations o where o.id = ft.org_id)
    on conflict (table_name, record_id) do nothing;
  end if;
  if to_regclass('public.budgets') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'budgets', b.id, 'org_id_missing_organization_row'
    from public.budgets b
    where b.org_id is not null
      and not exists (select 1 from public.organizations o where o.id = b.org_id)
    on conflict (table_name, record_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Deny authenticated access to null-org (quarantined) rows via RESTRICTIVE RLS
-- Existing permissive policies stay; SEC-106/107/108 replace them later.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'logistics_tasks',
    'ground_transportation_coordination',
    'flight_coordination',
    'lodging_bookings',
    'travel_groups',
    'logistics_acknowledgements',
    'staff_members',
    'staff_shifts',
    'staff_zones',
    'site_maps',
    'site_map_zones',
    'ticket_types',
    'ticket_sales',
    'tickets',
    'event_ticketing_config',
    'ticket_campaigns'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists sec105_require_org_id on public.%I', t);
    execute format(
      'create policy sec105_require_org_id on public.%I as restrictive for all to authenticated using (org_id is not null) with check (org_id is not null)',
      t
    );
  end loop;
end $$;
