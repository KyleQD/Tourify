set client_min_messages = warning;

-- SEC-104 / MAP-101: restore actor-bound logistics capability resolution, bind
-- site-map children to their canonical event/tour organization, and make canvas
-- replacement one transaction. The RPC is SECURITY INVOKER so RLS remains the
-- final authorization boundary.

create or replace function public.can_logistics(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select uid is not null
    and uid = (select auth.uid())
    and oid is not null
    and perm in ('logistics.view', 'logistics.manage')
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_logistics(uuid, uuid, text) from public, anon;
grant execute on function public.can_logistics(uuid, uuid, text) to authenticated, service_role;

create or replace function public.resolve_logistics_org_id(
  p_org_id uuid,
  p_event_id uuid,
  p_tour_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  with candidates(oid) as (
    select p_org_id where p_org_id is not null
    union all
    select t.org_id from public.tours t
      where t.id = p_tour_id and t.org_id is not null
    union all
    select e.org_id from public.events_v2 e
      where e.id = p_event_id and e.org_id is not null
  )
  select case
    when count(distinct oid) = 1 then min(oid::text)::uuid
    else null
  end
  from candidates;
$$;

revoke all on function public.resolve_logistics_org_id(uuid, uuid, uuid) from public, anon;
grant execute on function public.resolve_logistics_org_id(uuid, uuid, uuid) to authenticated, service_role;

create or replace function private.user_is_site_map_collaborator(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_map_collaborators smc
    where smc.site_map_id = p_id
      and smc.user_id = (select auth.uid())
      and smc.is_active = true
      and (smc.expires_at is null or smc.expires_at > now())
  );
$$;

create or replace function private.user_can_manage_site_map_collaborators(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.user_owns_site_map(p_id)
  or exists (
    select 1
    from public.site_map_collaborators smc
    where smc.site_map_id = p_id
      and smc.user_id = (select auth.uid())
      and smc.is_active = true
      and (smc.expires_at is null or smc.expires_at > now())
      and smc.can_edit = true
  );
$$;

revoke all on function private.user_is_site_map_collaborator(uuid) from public, anon;
revoke all on function private.user_can_manage_site_map_collaborators(uuid) from public, anon;
grant execute on function private.user_is_site_map_collaborator(uuid) to authenticated, service_role;
grant execute on function private.user_can_manage_site_map_collaborators(uuid) to authenticated, service_role;

create or replace function private.site_map_org_id(p_site_map_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.resolve_logistics_org_id(null, sm.event_id, sm.tour_id)
  from public.site_maps sm
  where sm.id = p_site_map_id;
$$;

create or replace function private.user_can_read_site_map(p_site_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    private.user_owns_site_map(p_site_map_id)
    or private.user_is_site_map_collaborator(p_site_map_id)
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

create or replace function private.user_can_edit_site_map(p_site_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and (
    private.user_can_manage_site_map_collaborators(p_site_map_id)
    or public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(p_site_map_id),
      'logistics.manage'
    )
  );
$$;

revoke all on function private.site_map_org_id(uuid) from public, anon;
revoke all on function private.user_can_read_site_map(uuid) from public, anon;
revoke all on function private.user_can_edit_site_map(uuid) from public, anon;
grant execute on function private.site_map_org_id(uuid) to authenticated, service_role;
grant execute on function private.user_can_read_site_map(uuid) to authenticated, service_role;
grant execute on function private.user_can_edit_site_map(uuid) to authenticated, service_role;

alter table public.site_maps enable row level security;
alter table public.site_map_elements enable row level security;
alter table public.site_map_activity_log enable row level security;

-- Existing rows are inventoried separately in staging. NOT VALID keeps this
-- migration from taking an unbounded validation lock while still enforcing the
-- command contract for every new or changed row immediately.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.site_map_elements'::regclass
      and conname = 'site_map_elements_sec104_geometry_check'
  ) then
    alter table public.site_map_elements
      add constraint site_map_elements_sec104_geometry_check
      check (
        x is not null
        and y is not null
        and width is not null
        and height is not null
        and rotation is not null
        and stroke_width is not null
        and opacity is not null
        and x between 0 and 1000000
        and y between 0 and 1000000
        and width between 0 and 1000000
        and height between 0 and 1000000
        and rotation between -999.99 and 999.99
        and stroke_width between 0 and 100
        and opacity between 0 and 1
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.site_map_elements'::regclass
      and conname = 'site_map_elements_sec104_color_check'
  ) then
    alter table public.site_map_elements
      add constraint site_map_elements_sec104_color_check
      check (
        color is null or color ~* '^#[0-9a-f]{6}$'
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.site_map_elements'::regclass
      and conname = 'site_map_elements_sec104_stroke_color_check'
  ) then
    alter table public.site_map_elements
      add constraint site_map_elements_sec104_stroke_color_check
      check (
        stroke_color is null or stroke_color ~* '^#[0-9a-f]{6}$'
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.site_map_elements'::regclass
      and conname = 'site_map_elements_sec104_payload_check'
  ) then
    alter table public.site_map_elements
      add constraint site_map_elements_sec104_payload_check
      check (
        properties is not null
        and jsonb_typeof(properties) = 'object'
        and octet_length(properties::text) <= 256000
        and (
          shape_data is null
          or (
            jsonb_typeof(shape_data) = 'object'
            and octet_length(shape_data::text) <= 256000
          )
        )
        and (path_data is null or octet_length(path_data) <= 256000)
      ) not valid;
  end if;
end;
$$;

drop policy if exists sec104_site_maps_logistics_select on public.site_maps;
create policy sec104_site_maps_logistics_select
  on public.site_maps for select to authenticated
  using (
    public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(id),
      'logistics.view'
    )
    or public.can_logistics(
      (select auth.uid()),
      private.site_map_org_id(id),
      'logistics.manage'
    )
  );

drop policy if exists "Users can view elements for accessible site maps" on public.site_map_elements;
drop policy if exists "Collaborators can manage elements" on public.site_map_elements;
drop policy if exists sec104_site_map_elements_select on public.site_map_elements;
drop policy if exists sec104_site_map_elements_insert on public.site_map_elements;
drop policy if exists sec104_site_map_elements_update on public.site_map_elements;
drop policy if exists sec104_site_map_elements_delete on public.site_map_elements;

create policy sec104_site_map_elements_select
  on public.site_map_elements for select to authenticated
  using (private.user_can_read_site_map(site_map_id));

create policy sec104_site_map_elements_insert
  on public.site_map_elements for insert to authenticated
  with check (private.user_can_edit_site_map(site_map_id));

create policy sec104_site_map_elements_update
  on public.site_map_elements for update to authenticated
  using (private.user_can_edit_site_map(site_map_id))
  with check (private.user_can_edit_site_map(site_map_id));

create policy sec104_site_map_elements_delete
  on public.site_map_elements for delete to authenticated
  using (private.user_can_edit_site_map(site_map_id));

drop policy if exists sec104_site_map_activity_select on public.site_map_activity_log;
drop policy if exists sec104_site_map_activity_insert on public.site_map_activity_log;

create policy sec104_site_map_activity_select
  on public.site_map_activity_log for select to authenticated
  using (private.user_can_read_site_map(site_map_id));

create policy sec104_site_map_activity_insert
  on public.site_map_activity_log for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.user_can_edit_site_map(site_map_id)
  );

create or replace function public.sync_site_map_elements(
  p_site_map_id uuid,
  p_elements jsonb,
  p_delete_missing boolean default false
)
returns setof public.site_map_elements
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_persisted integer;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not private.user_can_edit_site_map(p_site_map_id) then
    raise exception using errcode = '42501', message = 'Site-map edit access denied';
  end if;
  if p_elements is null or jsonb_typeof(p_elements) <> 'array' then
    raise exception using errcode = '22023', message = 'Elements must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_elements);
  if v_count > 1000 then
    raise exception using errcode = '22023', message = 'Element sync exceeds the 1000-row limit';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_elements) payload
    where jsonb_typeof(payload) <> 'object'
      or coalesce(payload ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception using errcode = '22023', message = 'Every element requires a valid UUID';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_elements) payload
    where payload ?| array[
      'site_map_id', 'organization_id', 'org_id', 'user_id', 'created_by',
      'created_at', 'updated_at'
    ]
  ) then
    raise exception using errcode = '22023', message = 'Element tenant, actor, and lifecycle fields are server controlled';
  end if;
  if (
    select count(*) <> count(distinct payload ->> 'id')
    from jsonb_array_elements(p_elements) payload
  ) then
    raise exception using errcode = '22023', message = 'Element ids must be unique';
  end if;
  if exists (
    select 1
    from public.site_map_elements current_element
    join jsonb_array_elements(p_elements) payload
      on current_element.id = (payload ->> 'id')::uuid
    where current_element.site_map_id <> p_site_map_id
  ) then
    raise exception using errcode = '23505', message = 'Element id belongs to another site map';
  end if;

  insert into public.site_map_elements (
    id, site_map_id, name, element_type, x, y, width, height, rotation,
    color, stroke_color, stroke_width, opacity, properties, path_data, shape_data
  )
  select
    payload.id,
    p_site_map_id,
    payload.name,
    payload.element_type,
    payload.x,
    payload.y,
    payload.width,
    payload.height,
    payload.rotation,
    payload.color,
    payload.stroke_color,
    payload.stroke_width,
    payload.opacity,
    coalesce(payload.properties, '{}'::jsonb),
    payload.path_data,
    payload.shape_data
  from jsonb_to_recordset(p_elements) as payload(
    id uuid,
    name text,
    element_type text,
    x integer,
    y integer,
    width integer,
    height integer,
    rotation numeric,
    color text,
    stroke_color text,
    stroke_width integer,
    opacity numeric,
    properties jsonb,
    path_data text,
    shape_data jsonb
  )
  on conflict (id) do update set
    name = excluded.name,
    element_type = excluded.element_type,
    x = excluded.x,
    y = excluded.y,
    width = excluded.width,
    height = excluded.height,
    rotation = excluded.rotation,
    color = excluded.color,
    stroke_color = excluded.stroke_color,
    stroke_width = excluded.stroke_width,
    opacity = excluded.opacity,
    properties = excluded.properties,
    path_data = excluded.path_data,
    shape_data = excluded.shape_data
  where site_map_elements.site_map_id = p_site_map_id;

  select count(*) into v_persisted
  from public.site_map_elements existing_element
  where existing_element.site_map_id = p_site_map_id
    and existing_element.id in (
      select (payload ->> 'id')::uuid
      from jsonb_array_elements(p_elements) payload
    );
  if v_persisted <> v_count then
    raise exception using errcode = '23505', message = 'Element id collision';
  end if;

  if p_delete_missing then
    delete from public.site_map_elements existing_element
    where existing_element.site_map_id = p_site_map_id
      and not exists (
        select 1
        from jsonb_array_elements(p_elements) payload
        where (payload ->> 'id')::uuid = existing_element.id
      );
  end if;

  return query
  select *
  from public.site_map_elements result_element
  where result_element.site_map_id = p_site_map_id
  order by result_element.created_at asc, result_element.id asc;
end;
$$;

revoke all on function public.sync_site_map_elements(uuid, jsonb, boolean) from public, anon;
grant execute on function public.sync_site_map_elements(uuid, jsonb, boolean) to authenticated, service_role;

comment on function public.sync_site_map_elements(uuid, jsonb, boolean) is
  'SEC-104 actor-bound, RLS-enforced atomic site-map canvas synchronization.';
