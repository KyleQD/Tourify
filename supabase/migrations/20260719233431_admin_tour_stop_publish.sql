-- Canonical tour-stop reconciliation and transactional publish command.

begin;

-- Align columns already used by the Admin tour command center across legacy
-- environments.
alter table public.tours
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists artist_id uuid references public.profiles(id) on delete set null,
  add column if not exists cover_image_url text,
  add column if not exists crew_size integer,
  add column if not exists transportation text,
  add column if not exists accommodation text,
  add column if not exists equipment_requirements text;

-- Tour mutation policies use canonical Admin capabilities. Legacy ownership is
-- retained for pre-organization rows.
drop policy if exists tours_insert_owner_or_org on public.tours;
drop policy if exists tours_update_owner_or_org on public.tours;
drop policy if exists tours_delete_owner_or_org on public.tours;

create policy tours_insert_owner_or_org on public.tours
  for insert to authenticated
  with check (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and (created_by = auth.uid() or user_id = auth.uid()))
  );

create policy tours_update_owner_or_org on public.tours
  for update to authenticated
  using (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and public.is_tour_owner(id))
  )
  with check (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and public.is_tour_owner(id))
  );

create policy tours_delete_owner_or_org on public.tours
  for delete to authenticated
  using (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.delete'))
    or (org_id is null and public.is_tour_owner(id))
  );

drop policy if exists tour_events_insert on public.tour_events;
drop policy if exists tour_events_update on public.tour_events;
drop policy if exists tour_events_delete on public.tour_events;

create policy tour_events_insert on public.tour_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = tour_events.event_id
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );

create policy tour_events_update on public.tour_events
  for update to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  )
  with check (
    exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = tour_events.event_id
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );

create policy tour_events_delete on public.tour_events
  for delete to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );

-- Replace one tour's link set atomically. events_v2 remains the show record;
-- this function only owns membership, route order, and advancing metadata.
create or replace function public.reconcile_admin_tour_events(
  p_org_id uuid,
  p_tour_id uuid,
  p_links jsonb
)
returns setof public.tour_events
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
declare
  v_link_count integer;
  v_distinct_event_count integer;
  v_distinct_ordinal_count integer;
begin
  if jsonb_typeof(coalesce(p_links, '[]'::jsonb)) <> 'array' then
    raise exception 'Tour links must be a JSON array';
  end if;

  v_link_count := jsonb_array_length(coalesce(p_links, '[]'::jsonb));
  if v_link_count > 500 then
    raise exception 'A tour cannot contain more than 500 stops';
  end if;

  if not exists (
    select 1 from public.tours t
    where t.id = p_tour_id and t.org_id = p_org_id
  ) then
    raise exception 'Tour is not available to the acting organization';
  end if;
  if not (
    public.has_perm(auth.uid(), p_org_id, 'routing.manage')
    or public.has_perm(auth.uid(), p_org_id, 'tour.manage')
  ) then
    raise exception 'Tour routing capability is required' using errcode = '42501';
  end if;

  select count(distinct link.event_id), count(distinct link.ordinal)
  into v_distinct_event_count, v_distinct_ordinal_count
  from (
    select
      (item->>'event_id')::uuid as event_id,
      coalesce((item->>'ordinal')::integer, ordinality::integer - 1) as ordinal
    from jsonb_array_elements(coalesce(p_links, '[]'::jsonb))
      with ordinality as entries(item, ordinality)
  ) link;

  if v_distinct_event_count <> v_link_count then
    raise exception 'Tour stops contain duplicate event IDs';
  end if;
  if v_distinct_ordinal_count <> v_link_count then
    raise exception 'Tour stops contain duplicate route positions';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) item
    left join public.events_v2 e on e.id = (item->>'event_id')::uuid
    where e.id is null or e.org_id <> p_org_id
  ) then
    raise exception 'Every tour stop must belong to the acting organization';
  end if;

  update public.tour_events existing_link
  set is_primary = false
  where existing_link.tour_id <> p_tour_id
    and existing_link.event_id in (
      select (item->>'event_id')::uuid
      from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) item
      where coalesce((item->>'is_primary')::boolean, false)
    );

  delete from public.tour_events existing_link
  where existing_link.tour_id = p_tour_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) item
      where (item->>'event_id')::uuid = existing_link.event_id
    );

  insert into public.tour_events (
    tour_id,
    event_id,
    ordinal,
    is_primary,
    leg_name,
    market,
    advance_status,
    routing_notes
  )
  select
    p_tour_id,
    (item->>'event_id')::uuid,
    coalesce((item->>'ordinal')::integer, ordinality::integer - 1),
    coalesce((item->>'is_primary')::boolean, false),
    nullif(btrim(item->>'leg_name'), ''),
    nullif(btrim(item->>'market'), ''),
    coalesce(nullif(item->>'advance_status', ''), 'not_started'),
    nullif(btrim(item->>'routing_notes'), '')
  from jsonb_array_elements(coalesce(p_links, '[]'::jsonb))
    with ordinality as entries(item, ordinality)
  on conflict (tour_id, event_id) do update
  set ordinal = excluded.ordinal,
      is_primary = excluded.is_primary,
      leg_name = excluded.leg_name,
      market = excluded.market,
      advance_status = excluded.advance_status,
      routing_notes = excluded.routing_notes,
      updated_at = now();

  return query
  select te.*
  from public.tour_events te
  where te.tour_id = p_tour_id
  order by te.ordinal, te.created_at;
end;
$$;

revoke all on function public.reconcile_admin_tour_events(uuid, uuid, jsonb) from public;
grant execute on function public.reconcile_admin_tour_events(uuid, uuid, jsonb)
  to authenticated, service_role;

-- Publication records previously rejected the event_publish/tour_publish values
-- used by the application. Expand the lifecycle and add an idempotency key.
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.work_mode_publications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%publication_type%';

  if v_constraint is not null then
    execute format(
      'alter table public.work_mode_publications drop constraint %I',
      v_constraint
    );
  end if;
end;
$$;

alter table public.work_mode_publications
  add constraint work_mode_publications_type_check
  check (publication_type in (
    'advance',
    'day_sheet',
    'command_broadcast',
    'site_map',
    'event_publish',
    'tour_publish'
  )),
  add column if not exists idempotency_key text;

create unique index if not exists idx_work_mode_publications_idempotency
  on public.work_mode_publications(idempotency_key);

-- Validate canonical readiness, activate the tour, and fan out Work Mode
-- publications in one transaction.
create or replace function public.publish_admin_tour(
  p_org_id uuid,
  p_tour_id uuid,
  p_actor_user_id uuid
)
returns table (
  tour_id uuid,
  status text,
  published_event_count integer,
  published_at timestamptz
)
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
declare
  v_tour public.tours%rowtype;
  v_event_count integer;
  v_published_at timestamptz := now();
begin
  if p_actor_user_id is distinct from auth.uid() then
    raise exception 'Publish actor does not match the authenticated user'
      using errcode = '42501';
  end if;
  if not public.has_perm(auth.uid(), p_org_id, 'tour.publish') then
    raise exception 'Tour publish capability is required' using errcode = '42501';
  end if;

  select t.* into v_tour
  from public.tours t
  where t.id = p_tour_id and t.org_id = p_org_id
  for update;
  if not found then
    raise exception 'Tour is not available to the acting organization';
  end if;

  if btrim(coalesce(v_tour.name, '')) = '' then
    raise exception 'Tour name is required before publishing';
  end if;
  if v_tour.start_date is null or v_tour.end_date is null then
    raise exception 'Tour start and end dates are required before publishing';
  end if;
  if v_tour.end_date < v_tour.start_date then
    raise exception 'Tour end date cannot be before its start date';
  end if;
  if v_tour.artist_id is null
    and btrim(coalesce(v_tour.settings->>'artist_account_id', '')) = ''
    and btrim(coalesce(v_tour.settings->>'main_artist', '')) = '' then
    raise exception 'A headliner is required before publishing';
  end if;

  select count(*) into v_event_count
  from public.tour_events te
  join public.events_v2 e on e.id = te.event_id
  where te.tour_id = p_tour_id
    and e.org_id = p_org_id;
  if v_event_count = 0 then
    raise exception 'At least one tour stop is required before publishing';
  end if;
  if exists (
    select 1
    from public.tour_events te
    join public.events_v2 e on e.id = te.event_id
    where te.tour_id = p_tour_id
      and (
        e.org_id <> p_org_id
        or btrim(coalesce(e.title, '')) = ''
        or e.start_at is null
        or (e.venue_id is null and btrim(coalesce(e.settings->>'venue_label', '')) = '')
      )
  ) then
    raise exception 'Every tour stop needs an organization event, title, date, and venue';
  end if;

  update public.tours t
  set status = 'active',
      settings = jsonb_set(
        coalesce(t.settings, '{}'::jsonb),
        '{published_at}',
        to_jsonb(v_published_at),
        true
      ),
      updated_at = v_published_at
  where t.id = p_tour_id and t.org_id = p_org_id;

  insert into public.work_mode_publications (
    event_id,
    tour_id,
    publication_type,
    title,
    payload,
    published_by,
    published_at,
    status,
    idempotency_key
  )
  select
    e.id,
    p_tour_id,
    'tour_publish',
    'Tour published: ' || v_tour.name,
    jsonb_build_object(
      'tour_id', p_tour_id,
      'event_id', e.id,
      'status', 'active'
    ),
    p_actor_user_id,
    v_published_at,
    'published',
    'tour_publish:' || p_tour_id::text || ':' || e.id::text
  from public.tour_events te
  join public.events_v2 e on e.id = te.event_id
  where te.tour_id = p_tour_id and e.org_id = p_org_id
  on conflict (idempotency_key) do update
  set title = excluded.title,
      payload = excluded.payload,
      published_by = excluded.published_by,
      published_at = excluded.published_at,
      status = 'published',
      updated_at = excluded.published_at;

  return query select p_tour_id, 'active'::text, v_event_count, v_published_at;
end;
$$;

revoke all on function public.publish_admin_tour(uuid, uuid, uuid) from public;
grant execute on function public.publish_admin_tour(uuid, uuid, uuid)
  to authenticated, service_role;
