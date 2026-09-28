set client_min_messages = warning;

-- SEC-104 / MAP-101: establish a canonical, organization-bound zone identity.
-- Legacy site_maps.event_id remains a read-only reconciliation key. All new
-- Admin event scope uses site_maps.event_v2_id and public.events_v2.

-- ---------------------------------------------------------------------------
-- Review queue. Never guess a tenant or silently discard an invalid bridge.
-- ---------------------------------------------------------------------------
create table if not exists private.site_map_zone_migration_issues (
  source_table text not null,
  source_id uuid not null,
  issue_code text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  primary key (source_table, source_id, issue_code),
  constraint site_map_zone_migration_issues_status_check
    check (status in ('open', 'resolved', 'ignored')),
  constraint site_map_zone_migration_issues_resolution_check
    check ((status = 'resolved') = (resolved_at is not null))
);

alter table private.site_map_zone_migration_issues
  add column if not exists status text not null default 'open',
  add column if not exists resolved_at timestamptz;

revoke all on table private.site_map_zone_migration_issues
  from public, anon, authenticated;
grant select, update on table private.site_map_zone_migration_issues
  to service_role;

-- ---------------------------------------------------------------------------
-- Canonical site-map event scope and deterministic legacy reconciliation.
-- The meaning of site_maps.event_id is derived from its actual FK target. A
-- coincidental UUID match is never treated as proof of event identity.
-- ---------------------------------------------------------------------------
alter table public.site_maps
  add column if not exists event_v2_id uuid,
  add column if not exists legacy_event_id uuid;

do $reconcile$
declare
  v_fk_count integer;
  v_fk_target oid;
begin
  select
    count(distinct constraint_row.confrelid),
    (array_agg(distinct constraint_row.confrelid))[1]
    into v_fk_count, v_fk_target
  from (
    select constraint_def.confrelid
    from pg_constraint constraint_def
    join pg_attribute column_def
      on column_def.attrelid = constraint_def.conrelid
     and column_def.attnum = any(constraint_def.conkey)
    where constraint_def.conrelid = 'public.site_maps'::regclass
      and constraint_def.contype = 'f'
      and cardinality(constraint_def.conkey) = 1
      and column_def.attname = 'event_id'
  ) constraint_row;

  if v_fk_count = 1 and v_fk_target = 'public.events'::regclass::oid then
    update public.site_maps
    set legacy_event_id = event_id
    where legacy_event_id is null
      and event_id is not null;

    with candidates as (
      select sm.id as site_map_id, legacy.promoted_event_v2_id as event_v2_id
      from public.site_maps sm
      join public.events legacy on legacy.id = sm.legacy_event_id
      join public.events_v2 canonical on canonical.id = legacy.promoted_event_v2_id
      where sm.event_v2_id is null
        and legacy.promoted_event_v2_id is not null
    ), resolved as (
      select site_map_id, min(event_v2_id::text)::uuid as event_v2_id
      from candidates
      group by site_map_id
      having count(distinct event_v2_id) = 1
    )
    update public.site_maps sm
    set event_v2_id = resolved.event_v2_id
    from resolved
    where sm.id = resolved.site_map_id
      and sm.event_v2_id is null;
  elsif v_fk_count = 1 and v_fk_target = 'public.events_v2'::regclass::oid then
    update public.site_maps
    set event_v2_id = event_id
    where event_v2_id is null
      and event_id is not null;

    with reverse_candidates as (
      select
        sm.id as site_map_id,
        min(legacy.id::text)::uuid as legacy_event_id,
        count(distinct legacy.id) as candidate_count
      from public.site_maps sm
      join public.events legacy on legacy.promoted_event_v2_id = sm.event_id
      where sm.legacy_event_id is null
        and sm.event_id is not null
      group by sm.id
    )
    update public.site_maps sm
    set legacy_event_id = reverse_candidates.legacy_event_id
    from reverse_candidates
    where sm.id = reverse_candidates.site_map_id
      and reverse_candidates.candidate_count = 1
      and sm.legacy_event_id is null;
  else
    insert into private.site_map_zone_migration_issues(
      source_table, source_id, issue_code, details, status, resolved_at
    )
    select
      'site_maps',
      sm.id,
      'untrusted_event_id_fk',
      jsonb_build_object(
        'event_id', sm.event_id,
        'fk_target_count', v_fk_count,
        'fk_target', case
          when v_fk_target is null then null
          else v_fk_target::regclass::text
        end
      ),
      'open',
      null
    from public.site_maps sm
    where sm.event_id is not null
    on conflict (source_table, source_id, issue_code) do update
    set details = excluded.details,
        status = 'open',
        resolved_at = null,
        reported_at = now();
  end if;
end;
$reconcile$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.site_maps'::regclass
      and conname = 'site_maps_event_v2_id_fkey'
  ) then
    alter table public.site_maps
      add constraint site_maps_event_v2_id_fkey
      foreign key (event_v2_id) references public.events_v2(id)
      on delete restrict not valid;
  end if;
end;
$$;

create index if not exists idx_site_maps_event_v2_id
  on public.site_maps(event_v2_id)
  where event_v2_id is not null;

-- Reconcile only through the explicit promotion edge. UUID equality across the
-- legacy and canonical event tables is intentionally ignored.
insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_maps',
  sm.id,
  'unresolved_event_v2',
  jsonb_build_object('legacy_event_id', sm.legacy_event_id),
  'open',
  null
from public.site_maps sm
where sm.legacy_event_id is not null
  and sm.event_v2_id is null
  and not exists (
    select 1
    from public.events legacy
    join public.events_v2 canonical on canonical.id = legacy.promoted_event_v2_id
    where legacy.id = sm.legacy_event_id
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_maps',
  sm.id,
  'stored_event_v2_mismatch',
  jsonb_build_object(
    'stored_event_v2_id', sm.event_v2_id,
    'legacy_event_id', sm.legacy_event_id,
    'promoted_event_v2_id', legacy.promoted_event_v2_id
  ),
  'open',
  null
from public.site_maps sm
join public.events legacy on legacy.id = sm.legacy_event_id
where sm.event_v2_id is not null
  and legacy.promoted_event_v2_id is not null
  and sm.event_v2_id <> legacy.promoted_event_v2_id
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_maps',
  sm.id,
  'event_tour_org_conflict',
  jsonb_build_object(
    'event_v2_id', sm.event_v2_id,
    'event_org_id', event.org_id,
    'tour_id', sm.tour_id,
    'tour_org_id', tour.org_id
  ),
  'open',
  null
from public.site_maps sm
join public.events_v2 event on event.id = sm.event_v2_id
join public.tours tour on tour.id = sm.tour_id
where event.org_id is distinct from tour.org_id
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_maps',
  sm.id,
  'orphan_event_v2',
  jsonb_build_object('event_v2_id', sm.event_v2_id),
  'open',
  null
from public.site_maps sm
where sm.event_v2_id is not null
  and not exists (
    select 1 from public.events_v2 event where event.id = sm.event_v2_id
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

do $$
begin
  if not exists (
    select 1
    from public.site_maps sm
    where sm.event_v2_id is not null
      and not exists (
        select 1 from public.events_v2 event where event.id = sm.event_v2_id
      )
  ) then
    alter table public.site_maps validate constraint site_maps_event_v2_id_fkey;
  end if;
end;
$$;

create or replace function private.site_map_org_id(p_site_map_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with candidates(oid) as (
    select event.org_id
    from public.site_maps sm
    join public.events_v2 event on event.id = sm.event_v2_id
    where sm.id = p_site_map_id and event.org_id is not null
    union all
    select tour.org_id
    from public.site_maps sm
    join public.tours tour on tour.id = sm.tour_id
    where sm.id = p_site_map_id and tour.org_id is not null
  )
  select case
    when count(distinct oid) = 1 then min(oid::text)::uuid
    else null
  end
  from candidates;
$$;

create or replace function private.user_can_manage_site_map_scope(
  p_event_v2_id uuid,
  p_tour_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
    and (p_event_v2_id is not null or p_tour_id is not null)
    and public.resolve_logistics_org_id(null, p_event_v2_id, p_tour_id) is not null
    and public.can_logistics(
      (select auth.uid()),
      public.resolve_logistics_org_id(null, p_event_v2_id, p_tour_id),
      'logistics.manage'
    );
$$;

create or replace function private.user_can_read_site_map(p_site_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    (
      private.site_map_org_id(p_site_map_id) is null
      and (
        private.user_owns_site_map(p_site_map_id)
        or private.user_is_site_map_collaborator(p_site_map_id)
      )
    )
    or public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(p_site_map_id),
      'logistics.view'
    )
    or public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(p_site_map_id),
      'logistics.manage'
    )
  );
$$;

create or replace function private.enforce_site_map_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_new_org_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.event_id is not null or new.legacy_event_id is not null then
      raise exception using
        errcode = '42501',
        message = 'New site maps must use canonical event_v2_id';
    end if;
    if new.event_v2_id is null and new.tour_id is null then
      raise exception using
        errcode = '23514',
        message = 'New site maps require canonical event or tour scope';
    end if;
  else
    if new.created_by is distinct from old.created_by
      and not (
        old.created_by is not null
        and new.created_by is null
        and pg_trigger_depth() > 1
      ) then
      raise exception using errcode = '42501', message = 'Site-map creator is immutable';
    end if;
    if new.event_id is distinct from old.event_id
      or new.legacy_event_id is distinct from old.legacy_event_id then
      raise exception using errcode = '42501', message = 'Legacy event identity is immutable';
    end if;
    if new.event_v2_id is distinct from old.event_v2_id
      or new.tour_id is distinct from old.tour_id then
      raise exception using
        errcode = '42501',
        message = 'Canonical site-map scope is immutable';
    end if;
  end if;

  v_new_org_id := public.resolve_logistics_org_id(null, new.event_v2_id, new.tour_id);
  if (new.event_v2_id is not null or new.tour_id is not null)
    and v_new_org_id is null then
    raise exception using
      errcode = '23514',
      message = 'Site-map event and tour must resolve to one organization';
  end if;

  if v_actor_id is not null
    and v_new_org_id is not null
    and not public.can_logistics(v_actor_id, v_new_org_id, 'logistics.manage') then
    raise exception using errcode = '42501', message = 'Target site-map scope access denied';
  end if;

  return new;
end;
$$;

revoke all on function private.site_map_org_id(uuid) from public, anon;
revoke all on function private.user_can_manage_site_map_scope(uuid, uuid)
  from public, anon;
revoke all on function private.user_can_read_site_map(uuid) from public, anon;
revoke all on function private.enforce_site_map_scope()
  from public, anon, authenticated;
grant execute on function private.site_map_org_id(uuid)
  to authenticated, service_role;
grant execute on function private.user_can_manage_site_map_scope(uuid, uuid)
  to authenticated, service_role;
grant execute on function private.user_can_read_site_map(uuid)
  to authenticated, service_role;

drop trigger if exists sec104_enforce_site_map_scope on public.site_maps;
create trigger sec104_enforce_site_map_scope
  before insert or update on public.site_maps
  for each row execute function private.enforce_site_map_scope();

alter table public.site_maps enable row level security;

drop policy if exists "Users can view public site maps" on public.site_maps;
drop policy if exists "Users can manage their own site maps" on public.site_maps;
drop policy if exists "Collaborators can view site maps" on public.site_maps;
drop policy if exists sec104_site_maps_logistics_select on public.site_maps;
drop policy if exists sec104_site_maps_public_select on public.site_maps;
drop policy if exists sec104_site_maps_owner_select on public.site_maps;
drop policy if exists sec104_site_maps_collaborator_select on public.site_maps;
drop policy if exists sec104_site_maps_insert on public.site_maps;
drop policy if exists sec104_site_maps_update on public.site_maps;
drop policy if exists sec104_site_maps_delete on public.site_maps;

create policy sec104_site_maps_public_select
  on public.site_maps for select
  using (is_public = true);

create policy sec104_site_maps_owner_select
  on public.site_maps for select to authenticated
  using (
    created_by = (select auth.uid())
    and event_v2_id is null
    and tour_id is null
  );

create policy sec104_site_maps_collaborator_select
  on public.site_maps for select to authenticated
  using (
    private.user_is_site_map_collaborator(id)
    and event_v2_id is null
    and tour_id is null
  );

create policy sec104_site_maps_logistics_select
  on public.site_maps for select to authenticated
  using (
    public.can_logistics(
      (select auth.uid()), private.site_map_org_id(id), 'logistics.view'
    )
    or public.can_logistics(
      (select auth.uid()), private.site_map_org_id(id), 'logistics.manage'
    )
  );

create policy sec104_site_maps_insert
  on public.site_maps for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.user_can_manage_site_map_scope(event_v2_id, tour_id)
  );

create policy sec104_site_maps_update
  on public.site_maps for update to authenticated
  using (private.user_can_manage_site_map_scope(event_v2_id, tour_id))
  with check (private.user_can_manage_site_map_scope(event_v2_id, tour_id));

create policy sec104_site_maps_delete
  on public.site_maps for delete to authenticated
  using (private.user_can_manage_site_map_scope(event_v2_id, tour_id));

-- ---------------------------------------------------------------------------
-- Canonical zones. Organization is derived from event/tour scope. A venue
-- permission never authorizes a row that also belongs to an event or tour.
-- ---------------------------------------------------------------------------
create table if not exists public.event_zones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  event_id uuid references public.events_v2(id) on delete cascade,
  tour_id uuid references public.tours(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  adhoc_venue_id uuid references public.venues_v2(id) on delete set null,
  name text not null,
  description text,
  category text not null default 'operations',
  zone_type text,
  capacity integer,
  required_staff_count integer not null default 0,
  assigned_staff_count integer not null default 0,
  supervisor_id uuid references auth.users(id) on delete set null,
  is_restricted boolean not null default false,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_zones
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists tour_id uuid references public.tours(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Operational zones must be retired or reassigned explicitly before their
-- canonical scope can be removed. This avoids FK cascades bypassing lifecycle
-- and audit behavior.
alter table public.event_zones
  drop constraint if exists event_zones_event_id_fkey,
  drop constraint if exists event_zones_tour_id_fkey,
  drop constraint if exists event_zones_venue_id_fkey,
  drop constraint if exists event_zones_adhoc_venue_id_fkey;

alter table public.event_zones
  add constraint event_zones_event_id_fkey
    foreign key (event_id) references public.events_v2(id) on delete restrict not valid,
  add constraint event_zones_tour_id_fkey
    foreign key (tour_id) references public.tours(id) on delete restrict not valid,
  add constraint event_zones_venue_id_fkey
    foreign key (venue_id) references public.venues(id) on delete restrict not valid,
  add constraint event_zones_adhoc_venue_id_fkey
    foreign key (adhoc_venue_id) references public.venues_v2(id) on delete restrict not valid;

alter table public.event_zones
  drop constraint if exists event_zones_scope_check,
  drop constraint if exists event_zones_category_check,
  drop constraint if exists event_zones_status_check,
  drop constraint if exists event_zones_counts_check,
  drop constraint if exists event_zones_metadata_check;

alter table public.event_zones
  add constraint event_zones_scope_check
    check (
      (
        (event_id is not null or tour_id is not null)
        and venue_id is null
        and adhoc_venue_id is null
      )
      or (
        event_id is null
        and tour_id is null
        and venue_id is not null
        and adhoc_venue_id is null
      )
    ) not valid,
  add constraint event_zones_category_check
    check (category in ('operations', 'physical', 'access', 'hybrid')) not valid,
  add constraint event_zones_status_check
    check (status in ('active', 'inactive', 'reserved', 'maintenance', 'closed')) not valid,
  add constraint event_zones_counts_check
    check (
      (capacity is null or capacity >= 0)
      and required_staff_count >= 0
      and assigned_staff_count >= 0
    ) not valid,
  add constraint event_zones_metadata_check
    check (
      metadata is not null
      and jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 256000
    ) not valid;

create index if not exists idx_event_zones_org_event
  on public.event_zones(org_id, event_id);
create index if not exists idx_event_zones_org_tour
  on public.event_zones(org_id, tour_id);
create index if not exists idx_event_zones_event
  on public.event_zones(event_id);
create index if not exists idx_event_zones_tour
  on public.event_zones(tour_id);
create index if not exists idx_event_zones_venue
  on public.event_zones(venue_id);
create index if not exists idx_event_zones_adhoc_venue
  on public.event_zones(adhoc_venue_id);
create index if not exists idx_event_zones_supervisor
  on public.event_zones(supervisor_id)
  where supervisor_id is not null;

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'event_zones',
  canonical.id,
  'event_org_corrected',
  jsonb_build_object(
    'stored_org_id', canonical.org_id,
    'event_id', canonical.event_id,
    'tour_id', canonical.tour_id,
    'resolved_org_id', public.resolve_logistics_org_id(
      null, canonical.event_id, canonical.tour_id
    )
  ),
  'resolved',
  now()
from public.event_zones canonical
where (canonical.event_id is not null or canonical.tour_id is not null)
  and public.resolve_logistics_org_id(null, canonical.event_id, canonical.tour_id) is not null
  and canonical.org_id is distinct from public.resolve_logistics_org_id(
    null, canonical.event_id, canonical.tour_id
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'resolved',
    resolved_at = now(),
    reported_at = now();

update public.event_zones canonical
set org_id = public.resolve_logistics_org_id(
  null, canonical.event_id, canonical.tour_id
)
where (canonical.event_id is not null or canonical.tour_id is not null)
  and public.resolve_logistics_org_id(null, canonical.event_id, canonical.tour_id) is not null
  and canonical.org_id is distinct from public.resolve_logistics_org_id(
    null, canonical.event_id, canonical.tour_id
  );

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'event_zones',
  canonical.id,
  'unsupported_or_conflicting_scope',
  jsonb_build_object(
    'org_id', canonical.org_id,
    'event_id', canonical.event_id,
    'tour_id', canonical.tour_id,
    'venue_id', canonical.venue_id,
    'adhoc_venue_id', canonical.adhoc_venue_id
  ),
  'open',
  null
from public.event_zones canonical
where (
    (canonical.event_id is not null or canonical.tour_id is not null)
    and public.resolve_logistics_org_id(null, canonical.event_id, canonical.tour_id) is null
  )
  or (
    canonical.event_id is null
    and canonical.tour_id is null
    and canonical.venue_id is null
  )
  or canonical.adhoc_venue_id is not null
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

-- Event/tour ownership is canonical. Preserve any historical venue values in
-- metadata, then detach them so they cannot become an independent auth path.
update public.event_zones canonical
set metadata = canonical.metadata || jsonb_strip_nulls(jsonb_build_object(
      'reconciled_legacy_venue_id', canonical.venue_id,
      'reconciled_legacy_adhoc_venue_id', canonical.adhoc_venue_id
    )),
    venue_id = null,
    adhoc_venue_id = null
where (canonical.event_id is not null or canonical.tour_id is not null)
  and (canonical.venue_id is not null or canonical.adhoc_venue_id is not null);

create or replace function private.enforce_event_zone_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_actor_id uuid := (select auth.uid());
begin
  if new.event_id is not null or new.tour_id is not null then
    if new.venue_id is not null or new.adhoc_venue_id is not null then
      raise exception using
        errcode = '23514',
        message = 'Event/tour zones cannot add an independent venue scope';
    end if;
    v_org_id := public.resolve_logistics_org_id(null, new.event_id, new.tour_id);
    if v_org_id is null then
      raise exception using
        errcode = '23514',
        message = 'Event-zone event and tour must resolve to one organization';
    end if;
    if new.org_id is not null and new.org_id <> v_org_id then
      raise exception using
        errcode = '23514',
        message = 'Event-zone organization conflicts with its event or tour';
    end if;
    new.org_id := v_org_id;
  else
    -- Venue-only compatibility cannot accept a caller-selected organization
    -- until a reviewed venue-to-organization relationship is canonical.
    new.org_id := null;
    if new.venue_id is null or new.adhoc_venue_id is not null then
      raise exception using
        errcode = '23514',
        message = 'Only canonical venue scope is supported without an event or tour';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if v_actor_id is not null then
      new.created_by := v_actor_id;
    end if;
  else
    if new.created_by is distinct from old.created_by
      and not (
        old.created_by is not null
        and new.created_by is null
        and pg_trigger_depth() > 1
      ) then
      raise exception using errcode = '42501', message = 'Event-zone creator is immutable';
    end if;

    if old.metadata ->> 'source' in ('site_map_zone', 'staff_zone') then
      if new.event_id is distinct from old.event_id
        or new.tour_id is distinct from old.tour_id
        or new.venue_id is distinct from old.venue_id
        or new.adhoc_venue_id is distinct from old.adhoc_venue_id
        or new.org_id is distinct from old.org_id
        or new.metadata ->> 'source' is distinct from old.metadata ->> 'source'
        or new.metadata ->> 'source_site_map_zone_id'
          is distinct from old.metadata ->> 'source_site_map_zone_id'
        or new.metadata ->> 'source_site_map_id'
          is distinct from old.metadata ->> 'source_site_map_id'
        or new.metadata ->> 'source_staff_zone_id'
          is distinct from old.metadata ->> 'source_staff_zone_id' then
        raise exception using
          errcode = '42501',
          message = 'Bridged event-zone identity and scope are immutable';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_event_zone_scope()
  from public, anon, authenticated;

drop trigger if exists sec104_enforce_event_zone_scope on public.event_zones;
create trigger sec104_enforce_event_zone_scope
  before insert or update on public.event_zones
  for each row execute function private.enforce_event_zone_scope();

create or replace function private.user_can_read_event_zone(
  p_org_id uuid,
  p_event_id uuid,
  p_tour_id uuid,
  p_venue_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    (
      (p_event_id is not null or p_tour_id is not null)
      and p_org_id = public.resolve_logistics_org_id(null, p_event_id, p_tour_id)
      and (
        public.can_logistics((select auth.uid()), p_org_id, 'logistics.view')
        or public.can_logistics((select auth.uid()), p_org_id, 'logistics.manage')
        or (
          public.is_org_member((select auth.uid()), p_org_id)
          and (
            public.has_perm((select auth.uid()), p_org_id, 'workforce.view')
            or public.has_perm((select auth.uid()), p_org_id, 'workforce.manage')
          )
        )
      )
    )
    or (
      p_event_id is null
      and p_tour_id is null
      and p_venue_id is not null
      and public.has_entity_permission(
        (select auth.uid()), 'Venue', p_venue_id, 'EDIT_EVENT_LOGISTICS'
      )
    )
  );
$$;

create or replace function private.user_can_edit_event_zone(
  p_org_id uuid,
  p_event_id uuid,
  p_tour_id uuid,
  p_venue_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    (
      (p_event_id is not null or p_tour_id is not null)
      and p_org_id = public.resolve_logistics_org_id(null, p_event_id, p_tour_id)
      and (
        public.can_logistics((select auth.uid()), p_org_id, 'logistics.manage')
        or (
          public.is_org_member((select auth.uid()), p_org_id)
          and public.has_perm((select auth.uid()), p_org_id, 'workforce.manage')
        )
      )
    )
    or (
      p_event_id is null
      and p_tour_id is null
      and p_venue_id is not null
      and public.has_entity_permission(
        (select auth.uid()), 'Venue', p_venue_id, 'ASSIGN_EVENT_ROLES'
      )
    )
  );
$$;

revoke all on function private.user_can_read_event_zone(uuid, uuid, uuid, uuid)
  from public, anon;
revoke all on function private.user_can_edit_event_zone(uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function private.user_can_read_event_zone(uuid, uuid, uuid, uuid)
  to authenticated, service_role;
grant execute on function private.user_can_edit_event_zone(uuid, uuid, uuid, uuid)
  to authenticated, service_role;

alter table public.event_zones enable row level security;

drop policy if exists event_zones_read on public.event_zones;
drop policy if exists event_zones_write on public.event_zones;
drop policy if exists sec104_event_zones_select on public.event_zones;
drop policy if exists sec104_event_zones_insert on public.event_zones;
drop policy if exists sec104_event_zones_update on public.event_zones;
drop policy if exists sec104_event_zones_delete on public.event_zones;

create policy sec104_event_zones_select
  on public.event_zones for select to authenticated
  using (private.user_can_read_event_zone(org_id, event_id, tour_id, venue_id));

create policy sec104_event_zones_insert
  on public.event_zones for insert to authenticated
  with check (private.user_can_edit_event_zone(org_id, event_id, tour_id, venue_id));

create policy sec104_event_zones_update
  on public.event_zones for update to authenticated
  using (private.user_can_edit_event_zone(org_id, event_id, tour_id, venue_id))
  with check (private.user_can_edit_event_zone(org_id, event_id, tour_id, venue_id));

create policy sec104_event_zones_delete
  on public.event_zones for delete to authenticated
  using (private.user_can_edit_event_zone(org_id, event_id, tour_id, venue_id));

revoke all on table public.event_zones from anon;
grant select, insert, update, delete on table public.event_zones to authenticated;
grant all on table public.event_zones to service_role;

-- ---------------------------------------------------------------------------
-- Spatial zones: bounded payload, active lead, and 1:1 canonical bridge.
-- ---------------------------------------------------------------------------
alter table public.site_map_zones
  add column if not exists event_zone_id uuid,
  add column if not exists lead_user_id uuid,
  add column if not exists assigned_department text;

create or replace function private.site_map_zone_tags_valid(p_tags text[])
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select p_tags is null or (
    cardinality(p_tags) <= 50
    and not exists (
      select 1
      from unnest(p_tags) tag
      where tag is null
        or tag <> btrim(tag)
        or char_length(tag) not between 1 and 100
    )
  );
$$;

revoke all on function private.site_map_zone_tags_valid(text[]) from public, anon;
grant execute on function private.site_map_zone_tags_valid(text[])
  to authenticated, service_role;

alter table public.site_map_zones
  drop constraint if exists site_map_zones_event_zone_id_fkey,
  drop constraint if exists site_map_zones_lead_user_id_fkey;

alter table public.site_map_zones
  add constraint site_map_zones_event_zone_id_fkey
    foreign key (event_zone_id) references public.event_zones(id)
    on delete restrict not valid,
  add constraint site_map_zones_lead_user_id_fkey
    foreign key (lead_user_id) references public.profiles(id)
    on delete set null not valid;

alter table public.site_map_zones
  drop constraint if exists site_map_zones_sec104_bounds_check,
  drop constraint if exists site_map_zones_sec104_payload_check;

alter table public.site_map_zones
  add constraint site_map_zones_sec104_bounds_check
    check (
      x is not null
      and y is not null
      and width is not null
      and height is not null
      and rotation is not null
      and border_width is not null
      and opacity is not null
      and x between 0 and 1000000
      and y between 0 and 1000000
      and width between 1 and 1000000
      and height between 1 and 1000000
      and rotation between -999.99 and 999.99
      and border_width between 0 and 100
      and opacity between 0 and 1
    ) not valid,
  add constraint site_map_zones_sec104_payload_check
    check (
      color is not null
      and border_color is not null
      and color ~* '^#[0-9a-f]{6}$'
      and border_color ~* '^#[0-9a-f]{6}$'
      and char_length(name) between 1 and 255
      and (description is null or octet_length(description) <= 10000)
      and (notes is null or octet_length(notes) <= 25000)
      and private.site_map_zone_tags_valid(tags)
      and (
        assigned_department is null
        or (
          assigned_department = btrim(assigned_department)
          and char_length(assigned_department) between 1 and 100
        )
      )
    ) not valid;

create index if not exists idx_site_map_zones_lead_user_id
  on public.site_map_zones(lead_user_id)
  where lead_user_id is not null;
create index if not exists idx_site_map_zones_assigned_department
  on public.site_map_zones(assigned_department)
  where assigned_department is not null;

-- Existing leads that are not active members of the exact resolved organization
-- are detached and queued. The zone itself is preserved.
insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_map_zones',
  zone.id,
  'invalid_zone_lead',
  jsonb_build_object(
    'site_map_id', zone.site_map_id,
    'lead_user_id', zone.lead_user_id,
    'resolved_org_id', private.site_map_org_id(zone.site_map_id)
  ),
  'open',
  null
from public.site_map_zones zone
where zone.lead_user_id is not null
  and (
    private.site_map_org_id(zone.site_map_id) is null
    or not exists (
      select 1
      from public.org_members member
      where member.org_id = private.site_map_org_id(zone.site_map_id)
        and member.user_id = zone.lead_user_id
        and member.status = 'active'
        and member.revoked_at is null
    )
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.site_map_zones zone
set lead_user_id = null
where zone.lead_user_id is not null
  and (
    private.site_map_org_id(zone.site_map_id) is null
    or not exists (
      select 1
      from public.org_members member
      where member.org_id = private.site_map_org_id(zone.site_map_id)
        and member.user_id = zone.lead_user_id
        and member.status = 'active'
        and member.revoked_at is null
    )
  );

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_map_zones',
  zone.id,
  'duplicate_event_zone_bridge',
  jsonb_build_object('event_zone_id', zone.event_zone_id),
  'open',
  null
from public.site_map_zones zone
join (
  select event_zone_id
  from public.site_map_zones
  where event_zone_id is not null
  group by event_zone_id
  having count(*) > 1
) duplicate on duplicate.event_zone_id = zone.event_zone_id
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.site_map_zones zone
set event_zone_id = null
where zone.event_zone_id in (
  select duplicate.event_zone_id
  from (
    select event_zone_id
    from public.site_map_zones
    where event_zone_id is not null
    group by event_zone_id
    having count(*) > 1
  ) duplicate
);

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_map_zones',
  zone.id,
  'invalid_event_zone_bridge',
  jsonb_build_object(
    'event_zone_id', zone.event_zone_id,
    'site_map_id', zone.site_map_id,
    'event_v2_id', sm.event_v2_id,
    'tour_id', sm.tour_id
  ),
  'open',
  null
from public.site_map_zones zone
join public.site_maps sm on sm.id = zone.site_map_id
where zone.event_zone_id is not null
  and not exists (
    select 1
    from public.event_zones canonical
    where canonical.id = zone.event_zone_id
      and canonical.event_id is not distinct from sm.event_v2_id
      and canonical.tour_id is not distinct from sm.tour_id
      and canonical.org_id is not distinct from private.site_map_org_id(sm.id)
      and canonical.metadata ->> 'source' = 'site_map_zone'
      and canonical.metadata ->> 'source_site_map_zone_id' = zone.id::text
      and canonical.metadata ->> 'source_site_map_id' = zone.site_map_id::text
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.site_map_zones zone
set event_zone_id = null
from public.site_maps sm
where sm.id = zone.site_map_id
  and zone.event_zone_id is not null
  and not exists (
    select 1
    from public.event_zones canonical
    where canonical.id = zone.event_zone_id
      and canonical.event_id is not distinct from sm.event_v2_id
      and canonical.tour_id is not distinct from sm.tour_id
      and canonical.org_id is not distinct from private.site_map_org_id(sm.id)
      and canonical.metadata ->> 'source' = 'site_map_zone'
      and canonical.metadata ->> 'source_site_map_zone_id' = zone.id::text
      and canonical.metadata ->> 'source_site_map_id' = zone.site_map_id::text
  );

-- Deterministic ID reuse makes replay idempotent. A UUID collision with an
-- unrelated canonical row is left unlinked and reported below.
insert into public.event_zones (
  id, org_id, event_id, tour_id, name, description, category, zone_type,
  capacity, supervisor_id, status, metadata, created_by
)
select
  zone.id,
  private.site_map_org_id(zone.site_map_id),
  sm.event_v2_id,
  sm.tour_id,
  zone.name,
  zone.description,
  'physical',
  zone.zone_type,
  zone.capacity,
  zone.lead_user_id,
  case zone.status
    when 'reserved' then 'reserved'
    when 'maintenance' then 'maintenance'
    when 'closed' then 'closed'
    else 'active'
  end,
  jsonb_build_object(
    'source', 'site_map_zone',
    'source_site_map_zone_id', zone.id,
    'source_site_map_id', zone.site_map_id
  ),
  sm.created_by
from public.site_map_zones zone
join public.site_maps sm on sm.id = zone.site_map_id
where zone.event_zone_id is null
  and (sm.event_v2_id is not null or sm.tour_id is not null)
  and private.site_map_org_id(sm.id) is not null
on conflict (id) do nothing;

update public.site_map_zones zone
set event_zone_id = canonical.id
from public.site_maps sm, public.event_zones canonical
where sm.id = zone.site_map_id
  and zone.event_zone_id is null
  and canonical.id = zone.id
  and canonical.event_id is not distinct from sm.event_v2_id
  and canonical.tour_id is not distinct from sm.tour_id
  and canonical.org_id = private.site_map_org_id(sm.id)
  and canonical.metadata ->> 'source' = 'site_map_zone'
  and canonical.metadata ->> 'source_site_map_zone_id' = zone.id::text
  and canonical.metadata ->> 'source_site_map_id' = zone.site_map_id::text;

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'site_map_zones',
  zone.id,
  'missing_event_zone_bridge',
  jsonb_build_object(
    'site_map_id', zone.site_map_id,
    'event_v2_id', sm.event_v2_id,
    'tour_id', sm.tour_id,
    'candidate_event_zone_id', zone.id
  ),
  'open',
  null
from public.site_map_zones zone
join public.site_maps sm on sm.id = zone.site_map_id
where (sm.event_v2_id is not null or sm.tour_id is not null)
  and zone.event_zone_id is null
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

create unique index if not exists site_map_zones_event_zone_unique
  on public.site_map_zones(event_zone_id)
  where event_zone_id is not null;
create index if not exists idx_site_map_zones_event_zone_id
  on public.site_map_zones(event_zone_id)
  where event_zone_id is not null;

alter table public.site_map_zones
  validate constraint site_map_zones_event_zone_id_fkey;
alter table public.site_map_zones
  validate constraint site_map_zones_lead_user_id_fkey;

create or replace function private.user_can_manage_site_map_zones(p_site_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
    and private.user_can_edit_site_map(p_site_map_id)
    and private.site_map_org_id(p_site_map_id) is not null
    and public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(p_site_map_id),
      'logistics.manage'
    );
$$;

revoke all on function private.user_can_manage_site_map_zones(uuid)
  from public, anon;
grant execute on function private.user_can_manage_site_map_zones(uuid)
  to authenticated, service_role;

alter table public.site_map_zones enable row level security;

drop policy if exists "Users can view zones for accessible site maps" on public.site_map_zones;
drop policy if exists "Collaborators can manage zones" on public.site_map_zones;
drop policy if exists "Users can manage zones for accessible site maps" on public.site_map_zones;
drop policy if exists "Owners can manage zones" on public.site_map_zones;
drop policy if exists sec104_site_map_zones_select on public.site_map_zones;
drop policy if exists sec104_site_map_zones_insert on public.site_map_zones;
drop policy if exists sec104_site_map_zones_update on public.site_map_zones;
drop policy if exists sec104_site_map_zones_delete on public.site_map_zones;

create policy sec104_site_map_zones_select
  on public.site_map_zones for select to authenticated
  using (private.user_can_read_site_map(site_map_id));

create policy sec104_site_map_zones_insert
  on public.site_map_zones for insert to authenticated
  with check (private.user_can_manage_site_map_zones(site_map_id));

create policy sec104_site_map_zones_update
  on public.site_map_zones for update to authenticated
  using (private.user_can_manage_site_map_zones(site_map_id))
  with check (private.user_can_manage_site_map_zones(site_map_id));

create policy sec104_site_map_zones_delete
  on public.site_map_zones for delete to authenticated
  using (private.user_can_manage_site_map_zones(site_map_id));

create or replace function private.sync_site_map_zone_event_zone()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_site_map_id uuid := coalesce(new.site_map_id, old.site_map_id);
  v_event_id uuid;
  v_tour_id uuid;
  v_org_id uuid;
  v_event_zone_id uuid;
  v_rows integer;
begin
  -- Do not read the parent on DELETE: an ON DELETE CASCADE has already made it
  -- invisible to the child trigger. The stored bridge identity is sufficient.
  if tg_op = 'DELETE' then
    if old.event_zone_id is not null then
      update public.event_zones canonical
      set status = 'inactive',
          metadata = canonical.metadata || jsonb_build_object('retired_at', now())
      where canonical.id = old.event_zone_id
        and canonical.metadata ->> 'source' = 'site_map_zone'
        and canonical.metadata ->> 'source_site_map_zone_id' = old.id::text
        and canonical.metadata ->> 'source_site_map_id' = old.site_map_id::text;
      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception using
          errcode = '23503',
          message = 'Canonical site-map zone bridge is missing';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.site_map_id is distinct from old.site_map_id then
    raise exception using errcode = '42501', message = 'A zone cannot move to another site map';
  end if;
  if tg_op = 'INSERT' and new.event_zone_id is not null then
    raise exception using errcode = '42501', message = 'Canonical zone identity is server controlled';
  end if;
  if tg_op = 'UPDATE' and new.event_zone_id is distinct from old.event_zone_id then
    raise exception using errcode = '42501', message = 'Canonical zone identity is server controlled';
  end if;

  select sm.event_v2_id, sm.tour_id, private.site_map_org_id(sm.id)
    into v_event_id, v_tour_id, v_org_id
  from public.site_maps sm
  where sm.id = v_site_map_id;

  if not found then
    raise exception using errcode = '23503', message = 'Site map was not found';
  end if;
  if v_event_id is null and v_tour_id is null then
    raise exception using errcode = '23514', message = 'Site-map zones require canonical organization scope';
  end if;
  if v_org_id is null then
    raise exception using errcode = '23514', message = 'Site map has no unambiguous organization scope';
  end if;

  if new.lead_user_id is not null and not exists (
    select 1
    from public.org_members member
    where member.org_id = v_org_id
      and member.user_id = new.lead_user_id
      and member.status = 'active'
      and member.revoked_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Zone lead must be an active member of the site-map organization';
  end if;

  v_event_zone_id := coalesce(new.event_zone_id, new.id);
  if new.event_zone_id is null then
    insert into public.event_zones (
      id, org_id, event_id, tour_id, name, description, category, zone_type,
      capacity, supervisor_id, status, metadata, created_by
    ) values (
      v_event_zone_id,
      v_org_id,
      v_event_id,
      v_tour_id,
      new.name,
      new.description,
      'physical',
      new.zone_type,
      new.capacity,
      new.lead_user_id,
      case new.status
        when 'reserved' then 'reserved'
        when 'maintenance' then 'maintenance'
        when 'closed' then 'closed'
        else 'active'
      end,
      jsonb_build_object(
        'source', 'site_map_zone',
        'source_site_map_zone_id', new.id,
        'source_site_map_id', new.site_map_id
      ),
      (select auth.uid())
    )
    on conflict (id) do nothing;

    select count(*) into v_rows
    from public.event_zones canonical
    where canonical.id = v_event_zone_id
      and canonical.event_id is not distinct from v_event_id
      and canonical.tour_id is not distinct from v_tour_id
      and canonical.org_id = v_org_id
      and canonical.metadata ->> 'source' = 'site_map_zone'
      and canonical.metadata ->> 'source_site_map_zone_id' = new.id::text
      and canonical.metadata ->> 'source_site_map_id' = new.site_map_id::text;
    if v_rows <> 1 then
      raise exception using
        errcode = '23505',
        message = 'Canonical zone identity conflicts with another record';
    end if;
    new.event_zone_id := v_event_zone_id;
  end if;

  update public.event_zones canonical
  set name = new.name,
      description = new.description,
      zone_type = new.zone_type,
      capacity = new.capacity,
      supervisor_id = new.lead_user_id,
      status = case new.status
        when 'reserved' then 'reserved'
        when 'maintenance' then 'maintenance'
        when 'closed' then 'closed'
        else 'active'
      end
  where canonical.id = new.event_zone_id
    and canonical.event_id is not distinct from v_event_id
    and canonical.tour_id is not distinct from v_tour_id
    and canonical.org_id = v_org_id
    and canonical.metadata ->> 'source' = 'site_map_zone'
    and canonical.metadata ->> 'source_site_map_zone_id' = new.id::text
    and canonical.metadata ->> 'source_site_map_id' = new.site_map_id::text;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception using
      errcode = '23505',
      message = 'Canonical zone bridge is missing or cross-scoped';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_site_map_zone_event_zone()
  from public, anon, authenticated;

drop trigger if exists sec104_sync_site_map_zone_event_zone on public.site_map_zones;
create trigger sec104_sync_site_map_zone_event_zone
  before insert or update or delete on public.site_map_zones
  for each row execute function private.sync_site_map_zone_event_zone();

-- ---------------------------------------------------------------------------
-- Operational staff zones: tenant key, strict RLS, and the same 1:1 identity.
-- ---------------------------------------------------------------------------
alter table public.staff_zones
  add column if not exists org_id uuid,
  add column if not exists event_zone_id uuid;

alter table public.staff_zones
  drop constraint if exists staff_zones_org_id_fkey,
  drop constraint if exists staff_zones_event_zone_id_fkey,
  drop constraint if exists staff_zones_sec104_scope_check,
  drop constraint if exists staff_zones_sec104_counts_check;

alter table public.staff_zones
  add constraint staff_zones_org_id_fkey
    foreign key (org_id) references public.organizations(id)
    on delete restrict not valid,
  add constraint staff_zones_event_zone_id_fkey
    foreign key (event_zone_id) references public.event_zones(id)
    on delete restrict not valid,
  add constraint staff_zones_sec104_scope_check
    check (
      (
        event_id is not null
        and num_nonnulls(venue_id, adhoc_venue_id) <= 1
      )
      or (
        event_id is null
        and venue_id is not null
        and adhoc_venue_id is null
      )
    ) not valid,
  add constraint staff_zones_sec104_counts_check
    check (
      (capacity is null or capacity >= 0)
      and required_staff_count >= 0
      and assigned_staff_count >= 0
    ) not valid;

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'invalid_counts',
  jsonb_build_object(
    'capacity', staff_zone.capacity,
    'required_staff_count', staff_zone.required_staff_count,
    'assigned_staff_count', staff_zone.assigned_staff_count
  ),
  'open',
  null
from public.staff_zones staff_zone
where staff_zone.capacity < 0
  or staff_zone.required_staff_count < 0
  or staff_zone.assigned_staff_count < 0
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'unsupported_scope',
  jsonb_build_object(
    'event_id', staff_zone.event_id,
    'venue_id', staff_zone.venue_id,
    'adhoc_venue_id', staff_zone.adhoc_venue_id
  ),
  'open',
  null
from public.staff_zones staff_zone
where (
    staff_zone.event_id is null
    and (staff_zone.venue_id is null or staff_zone.adhoc_venue_id is not null)
  )
  or (
    staff_zone.event_id is not null
    and staff_zone.venue_id is not null
    and staff_zone.adhoc_venue_id is not null
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'event_org_corrected',
  jsonb_build_object(
    'stored_org_id', staff_zone.org_id,
    'event_id', staff_zone.event_id,
    'event_org_id', event.org_id
  ),
  'resolved',
  now()
from public.staff_zones staff_zone
join public.events_v2 event on event.id = staff_zone.event_id
where staff_zone.org_id is distinct from event.org_id
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'resolved',
    resolved_at = now(),
    reported_at = now();

update public.staff_zones staff_zone
set org_id = event.org_id
from public.events_v2 event
where event.id = staff_zone.event_id
  and staff_zone.org_id is distinct from event.org_id;

update public.staff_zones
set org_id = null
where event_id is null
  and org_id is not null;

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'unresolved_org_scope',
  jsonb_build_object(
    'event_id', staff_zone.event_id,
    'venue_id', staff_zone.venue_id,
    'adhoc_venue_id', staff_zone.adhoc_venue_id
  ),
  'open',
  null
from public.staff_zones staff_zone
where staff_zone.event_id is not null
  and staff_zone.org_id is null
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'invalid_supervisor',
  jsonb_build_object(
    'org_id', staff_zone.org_id,
    'supervisor_id', staff_zone.supervisor_id
  ),
  'open',
  null
from public.staff_zones staff_zone
where staff_zone.org_id is not null
  and staff_zone.supervisor_id is not null
  and not exists (
    select 1
    from public.org_members member
    where member.org_id = staff_zone.org_id
      and member.user_id = staff_zone.supervisor_id
      and member.status = 'active'
      and member.revoked_at is null
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.staff_zones staff_zone
set supervisor_id = null
where staff_zone.org_id is not null
  and staff_zone.supervisor_id is not null
  and not exists (
    select 1
    from public.org_members member
    where member.org_id = staff_zone.org_id
      and member.user_id = staff_zone.supervisor_id
      and member.status = 'active'
      and member.revoked_at is null
  );

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'duplicate_event_zone_bridge',
  jsonb_build_object('event_zone_id', staff_zone.event_zone_id),
  'open',
  null
from public.staff_zones staff_zone
join (
  select event_zone_id
  from public.staff_zones
  where event_zone_id is not null
  group by event_zone_id
  having count(*) > 1
) duplicate on duplicate.event_zone_id = staff_zone.event_zone_id
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.staff_zones staff_zone
set event_zone_id = null
where staff_zone.event_zone_id in (
  select duplicate.event_zone_id
  from (
    select event_zone_id
    from public.staff_zones
    where event_zone_id is not null
    group by event_zone_id
    having count(*) > 1
  ) duplicate
);

-- For event rows the event organization is the sole canonical scope; legacy
-- venue fields remain on staff_zones but are not copied into event_zones.
insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'invalid_event_zone_bridge',
  jsonb_build_object(
    'event_zone_id', staff_zone.event_zone_id,
    'event_id', staff_zone.event_id,
    'org_id', staff_zone.org_id,
    'venue_id', staff_zone.venue_id
  ),
  'open',
  null
from public.staff_zones staff_zone
where staff_zone.event_zone_id is not null
  and not exists (
    select 1
    from public.event_zones canonical
    where canonical.id = staff_zone.event_zone_id
      and canonical.event_id is not distinct from staff_zone.event_id
      and canonical.org_id is not distinct from staff_zone.org_id
      and canonical.tour_id is null
      and canonical.venue_id is not distinct from (
        case when staff_zone.event_id is null then staff_zone.venue_id else null end
      )
      and canonical.adhoc_venue_id is null
      and canonical.metadata ->> 'source' = 'staff_zone'
      and canonical.metadata ->> 'source_staff_zone_id' = staff_zone.id::text
  )
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

update public.staff_zones staff_zone
set event_zone_id = null
where staff_zone.event_zone_id is not null
  and not exists (
    select 1
    from public.event_zones canonical
    where canonical.id = staff_zone.event_zone_id
      and canonical.event_id is not distinct from staff_zone.event_id
      and canonical.org_id is not distinct from staff_zone.org_id
      and canonical.tour_id is null
      and canonical.venue_id is not distinct from (
        case when staff_zone.event_id is null then staff_zone.venue_id else null end
      )
      and canonical.adhoc_venue_id is null
      and canonical.metadata ->> 'source' = 'staff_zone'
      and canonical.metadata ->> 'source_staff_zone_id' = staff_zone.id::text
  );

insert into public.event_zones (
  id, org_id, event_id, venue_id, name, description, category, zone_type,
  capacity, required_staff_count, assigned_staff_count, supervisor_id,
  status, metadata
)
select
  staff_zone.id,
  staff_zone.org_id,
  staff_zone.event_id,
  case when staff_zone.event_id is null then staff_zone.venue_id else null end,
  staff_zone.zone_name,
  staff_zone.zone_description,
  'operations',
  staff_zone.zone_type,
  staff_zone.capacity,
  coalesce(staff_zone.required_staff_count, 0),
  coalesce(staff_zone.assigned_staff_count, 0),
  staff_zone.supervisor_id,
  case when staff_zone.status = 'inactive' then 'inactive' else 'active' end,
  jsonb_strip_nulls(jsonb_build_object(
    'source', 'staff_zone',
    'source_staff_zone_id', staff_zone.id,
    'legacy_venue_id', case when staff_zone.event_id is not null then staff_zone.venue_id end,
    'legacy_adhoc_venue_id', staff_zone.adhoc_venue_id
  ))
from public.staff_zones staff_zone
where staff_zone.event_zone_id is null
  and staff_zone.adhoc_venue_id is null
  and (
    (staff_zone.event_id is not null and staff_zone.org_id is not null)
    or (staff_zone.event_id is null and staff_zone.venue_id is not null)
  )
  and not (
    staff_zone.capacity < 0
    or staff_zone.required_staff_count < 0
    or staff_zone.assigned_staff_count < 0
  )
on conflict (id) do nothing;

update public.staff_zones staff_zone
set event_zone_id = canonical.id
from public.event_zones canonical
where staff_zone.event_zone_id is null
  and canonical.id = staff_zone.id
  and canonical.event_id is not distinct from staff_zone.event_id
  and canonical.org_id is not distinct from staff_zone.org_id
  and canonical.tour_id is null
  and canonical.venue_id is not distinct from (
    case when staff_zone.event_id is null then staff_zone.venue_id else null end
  )
  and canonical.adhoc_venue_id is null
  and canonical.metadata ->> 'source' = 'staff_zone'
  and canonical.metadata ->> 'source_staff_zone_id' = staff_zone.id::text;

insert into private.site_map_zone_migration_issues(
  source_table, source_id, issue_code, details, status, resolved_at
)
select
  'staff_zones',
  staff_zone.id,
  'missing_event_zone_bridge',
  jsonb_build_object(
    'event_id', staff_zone.event_id,
    'org_id', staff_zone.org_id,
    'venue_id', staff_zone.venue_id,
    'adhoc_venue_id', staff_zone.adhoc_venue_id,
    'candidate_event_zone_id', staff_zone.id
  ),
  'open',
  null
from public.staff_zones staff_zone
where staff_zone.event_zone_id is null
on conflict (source_table, source_id, issue_code) do update
set details = excluded.details,
    status = 'open',
    resolved_at = null,
    reported_at = now();

create unique index if not exists staff_zones_event_zone_unique
  on public.staff_zones(event_zone_id)
  where event_zone_id is not null;
create index if not exists idx_staff_zones_org_event
  on public.staff_zones(org_id, event_id);
create index if not exists idx_staff_zones_event_zone_id
  on public.staff_zones(event_zone_id)
  where event_zone_id is not null;

alter table public.staff_zones validate constraint staff_zones_org_id_fkey;
alter table public.staff_zones validate constraint staff_zones_event_zone_id_fkey;

create or replace function private.user_can_read_staff_zone(
  p_org_id uuid,
  p_event_id uuid,
  p_venue_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    (
      p_event_id is not null
      and p_org_id = public.resolve_logistics_org_id(null, p_event_id, null)
      and public.is_org_member((select auth.uid()), p_org_id)
      and (
        public.has_perm((select auth.uid()), p_org_id, 'workforce.view')
        or public.has_perm((select auth.uid()), p_org_id, 'workforce.manage')
        or public.has_perm((select auth.uid()), p_org_id, 'logistics.view')
        or public.has_perm((select auth.uid()), p_org_id, 'logistics.manage')
      )
    )
    or (
      p_event_id is null
      and p_venue_id is not null
      and public.has_entity_permission(
        (select auth.uid()), 'Venue', p_venue_id, 'EDIT_EVENT_LOGISTICS'
      )
    )
  );
$$;

create or replace function private.user_can_edit_staff_zone(
  p_org_id uuid,
  p_event_id uuid,
  p_venue_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    (
      p_event_id is not null
      and p_org_id = public.resolve_logistics_org_id(null, p_event_id, null)
      and public.is_org_member((select auth.uid()), p_org_id)
      and (
        public.has_perm((select auth.uid()), p_org_id, 'workforce.manage')
        or public.has_perm((select auth.uid()), p_org_id, 'logistics.manage')
      )
    )
    or (
      p_event_id is null
      and p_venue_id is not null
      and public.has_entity_permission(
        (select auth.uid()), 'Venue', p_venue_id, 'ASSIGN_EVENT_ROLES'
      )
    )
  );
$$;

revoke all on function private.user_can_read_staff_zone(uuid, uuid, uuid)
  from public, anon;
revoke all on function private.user_can_edit_staff_zone(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.user_can_read_staff_zone(uuid, uuid, uuid)
  to authenticated, service_role;
grant execute on function private.user_can_edit_staff_zone(uuid, uuid, uuid)
  to authenticated, service_role;

alter table public.staff_zones enable row level security;

drop policy if exists read_all_zones on public.staff_zones;
drop policy if exists insert_zones on public.staff_zones;
drop policy if exists update_zones on public.staff_zones;
drop policy if exists staff_zones_select on public.staff_zones;
drop policy if exists staff_zones_write on public.staff_zones;
drop policy if exists sec104_staff_zones_select on public.staff_zones;
drop policy if exists sec104_staff_zones_insert on public.staff_zones;
drop policy if exists sec104_staff_zones_update on public.staff_zones;
drop policy if exists sec104_staff_zones_delete on public.staff_zones;

create policy sec104_staff_zones_select
  on public.staff_zones for select to authenticated
  using (private.user_can_read_staff_zone(org_id, event_id, venue_id));

create policy sec104_staff_zones_insert
  on public.staff_zones for insert to authenticated
  with check (private.user_can_edit_staff_zone(org_id, event_id, venue_id));

create policy sec104_staff_zones_update
  on public.staff_zones for update to authenticated
  using (private.user_can_edit_staff_zone(org_id, event_id, venue_id))
  with check (private.user_can_edit_staff_zone(org_id, event_id, venue_id));

create policy sec104_staff_zones_delete
  on public.staff_zones for delete to authenticated
  using (private.user_can_edit_staff_zone(org_id, event_id, venue_id));
