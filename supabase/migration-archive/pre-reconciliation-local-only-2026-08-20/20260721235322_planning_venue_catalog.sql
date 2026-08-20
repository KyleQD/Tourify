-- Planning-only venue catalog. Catalog records are copied into event/tour drafts;
-- they never become venue accounts or event-to-venue relationships.

set client_min_messages = warning;

create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;
set search_path = private, public, extensions;

revoke all on schema private from public, anon, authenticated;

create table if not exists venue_catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_release text not null,
  status text not null default 'loading'
    check (status in ('loading', 'completed', 'failed')),
  staged_count bigint not null default 0,
  active_count bigint not null default 0,
  retired_count bigint not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table venue_catalog_import_runs enable row level security;
alter table venue_catalog_import_runs force row level security;

create table if not exists venue_catalog_places (
  overture_id text primary key,
  name text not null,
  primary_category text,
  categories text[] not null default '{}',
  address text,
  city text,
  state text,
  postal_code text,
  country text not null default 'US',
  latitude double precision,
  longitude double precision,
  website text,
  email text,
  phone text,
  capacity integer check (capacity is null or capacity > 0),
  technical_specs jsonb not null default '{}'::jsonb,
  operating_status text,
  confidence numeric(6,5),
  source_release text not null,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  retired_at timestamptz,
  name_normalized text generated always as (
    lower(regexp_replace(name, '[^[:alnum:]]+', ' ', 'g'))
  ) stored,
  location_normalized text generated always as (
    lower(regexp_replace(
      coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(postal_code, ''),
      '[^[:alnum:]]+', ' ', 'g'
    ))
  ) stored,
  constraint venue_catalog_country_us check (country in ('US', 'USA'))
);
alter table venue_catalog_places enable row level security;
alter table venue_catalog_places force row level security;

create index if not exists venue_catalog_places_name_exact_idx
  on private.venue_catalog_places (name_normalized)
  where retired_at is null;
create index if not exists venue_catalog_places_name_trgm_idx
  on private.venue_catalog_places using gin (name_normalized extensions.gin_trgm_ops)
  where retired_at is null;
create index if not exists venue_catalog_places_location_trgm_idx
  on private.venue_catalog_places using gin (location_normalized extensions.gin_trgm_ops)
  where retired_at is null;
create index if not exists venue_catalog_places_city_state_idx
  on private.venue_catalog_places (lower(city), lower(state), name_normalized)
  where retired_at is null;
create index if not exists venue_catalog_places_release_idx
  on private.venue_catalog_places (source_release, overture_id);

-- The loader truncates and fills this table before calling the atomic apply function.
create unlogged table if not exists venue_catalog_places_staging (
  overture_id text,
  name text,
  primary_category text,
  categories jsonb,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision,
  website text,
  email text,
  phone text,
  operating_status text,
  confidence numeric(6,5),
  source_updated_at timestamptz
);
alter table venue_catalog_places_staging enable row level security;
alter table venue_catalog_places_staging force row level security;
create index if not exists venue_catalog_places_staging_id_idx
  on private.venue_catalog_places_staging (overture_id);

create or replace function private.apply_venue_catalog_import(
  p_source_release text,
  p_minimum_rows bigint default 1000
)
returns table (active_count bigint, retired_count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_staged bigint;
  v_invalid bigint;
  v_active bigint;
  v_retired bigint;
begin
  select count(*) into v_staged from private.venue_catalog_places_staging;
  select count(*) into v_invalid
  from private.venue_catalog_places_staging
  where overture_id is null
     or nullif(btrim(name), '') is null
     or country is null
     or country not in ('US', 'USA')
     or latitude not between -90 and 90
     or longitude not between -180 and 180;

  if nullif(btrim(p_source_release), '') is null then
    raise exception 'source release is required';
  end if;
  if v_staged < p_minimum_rows then
    raise exception 'catalog validation failed: % rows is below minimum %', v_staged, p_minimum_rows;
  end if;
  if v_invalid > 0 then
    raise exception 'catalog validation failed: % invalid rows', v_invalid;
  end if;
  if exists (
    select 1 from private.venue_catalog_places_staging
    group by overture_id having count(*) > 1
  ) then
    raise exception 'catalog validation failed: duplicate Overture ids';
  end if;

  insert into private.venue_catalog_import_runs (source_release, staged_count)
  values (p_source_release, v_staged)
  returning id into v_run_id;

  -- migration-validation: scoped-insert-select source-release-staging-only
  insert into private.venue_catalog_places as catalog (
    overture_id, name, primary_category, categories, address, city, state,
    postal_code, country, latitude, longitude, website, email, phone,
    operating_status, confidence, source_release, source_updated_at,
    imported_at, retired_at
  )
  select
    overture_id, btrim(name), primary_category,
    array(select jsonb_array_elements_text(coalesce(categories, '[]'::jsonb))), address,
    city, state, postal_code, country, latitude, longitude, website, email, phone,
    operating_status, confidence, p_source_release, source_updated_at, now(),
    case when lower(coalesce(operating_status, 'open')) in ('closed', 'permanently_closed')
      then now() else null end
  from private.venue_catalog_places_staging
  on conflict (overture_id) do update set
    name = excluded.name,
    primary_category = excluded.primary_category,
    categories = excluded.categories,
    address = excluded.address,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    country = excluded.country,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    website = excluded.website,
    email = excluded.email,
    phone = excluded.phone,
    operating_status = excluded.operating_status,
    confidence = excluded.confidence,
    source_release = excluded.source_release,
    source_updated_at = excluded.source_updated_at,
    imported_at = now(),
    retired_at = excluded.retired_at;

  update private.venue_catalog_places
  set retired_at = coalesce(retired_at, now())
  where retired_at is null
    and not exists (
      select 1
      from private.venue_catalog_places_staging staged
      where staged.overture_id = private.venue_catalog_places.overture_id
    );

  select count(*) into v_active
  from private.venue_catalog_places where retired_at is null;
  select count(*) into v_retired
  from private.venue_catalog_places where retired_at is not null;

  update private.venue_catalog_import_runs as runs
  set status = 'completed', active_count = v_active,
      retired_count = v_retired, completed_at = now()
  where runs.id = v_run_id;

  active_count := v_active;
  retired_count := v_retired;
  return next;
end;
$$;

-- PostgREST can see this function, but only service_role may execute it. It is
-- security-invoker, so the caller also needs the explicit private-table grant.
create or replace function public.search_planning_venue_catalog(
  query_text text,
  max_results integer default 8,
  cursor_offset integer default 0
)
returns table (
  source_id text,
  name text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  website text,
  email text,
  phone text,
  capacity integer,
  technical_specs jsonb,
  rank_score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select lower(regexp_replace(btrim(query_text), '[^[:alnum:]]+', ' ', 'g')) as q
  ), ranked as (
    select
      p.overture_id as source_id, p.name, p.address, p.city, p.state,
      p.postal_code, p.country, p.website, p.email, p.phone, p.capacity,
      p.technical_specs,
      (
        case when p.name_normalized = input.q then 100
             when p.name_normalized like input.q || '%' then 70 else 0 end
        + extensions.similarity(p.name_normalized, input.q) * 40
        + extensions.similarity(p.location_normalized, input.q) * 20
        + coalesce(p.confidence::real, 0) * 5
      )::real as rank_score
    from private.venue_catalog_places p
    cross join input
    where p.retired_at is null
      and lower(coalesce(p.operating_status, 'open')) not in ('closed', 'permanently_closed')
      and (
        p.name_normalized OPERATOR(extensions.%) input.q
        or p.name_normalized like input.q || '%'
        or p.location_normalized OPERATOR(extensions.%) input.q
        or p.location_normalized like '%' || input.q || '%'
      )
  )
  select * from ranked
  order by ranked.rank_score desc, ranked.name, ranked.source_id
  limit least(greatest(max_results, 1), 20)
  offset least(greatest(cursor_offset, 0), 200);
$$;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke execute on function public.search_planning_venue_catalog(text, integer, integer)
  from public, anon, authenticated;

grant usage on schema private to service_role;
grant select on private.venue_catalog_places to service_role;
grant select, insert, update, delete on private.venue_catalog_places_staging to service_role;
grant select, insert, update on private.venue_catalog_import_runs to service_role;
grant execute on function private.apply_venue_catalog_import(text, bigint) to service_role;
grant execute on function public.search_planning_venue_catalog(text, integer, integer) to service_role;

comment on table private.venue_catalog_places is
  'Licensed planning-only venue records. Never reference venue_profiles, venues_v2, events, or tours.';
comment on function public.search_planning_venue_catalog(text, integer, integer) is
  'Service-role-only ranked autocomplete for detached event/tour venue prefills.';
