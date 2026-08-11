begin;

do $$
declare
  result record;
  active_before_failure bigint;
  validation_failed boolean := false;
begin
  if to_regclass('private.venue_catalog_places') is null then
    raise exception 'private venue catalog table is missing';
  end if;

  if has_table_privilege('anon', 'private.venue_catalog_places', 'select')
    or has_table_privilege('authenticated', 'private.venue_catalog_places', 'select') then
    raise exception 'browser roles can read the private venue catalog';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.search_planning_venue_catalog(text,integer,integer)',
    'execute'
  ) then
    raise exception 'authenticated browser clients can execute catalog search directly';
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'private.venue_catalog_places'::regclass
      and contype = 'f'
  ) then
    raise exception 'venue catalog must not have foreign keys to application venue tables';
  end if;

  delete from private.venue_catalog_places_staging;
  insert into private.venue_catalog_places_staging (
    overture_id, name, categories, country, latitude, longitude, operating_status
  ) values (
    'catalog-test-a', 'Catalog Test A', '["music_venue"]', 'US', 30, -97, 'open'
  );
  select * into result from private.apply_venue_catalog_import('catalog-test-release-1', 1);

  -- Applying the same release twice is idempotent.
  select * into result from private.apply_venue_catalog_import('catalog-test-release-1', 1);
  if (select count(*) from private.venue_catalog_places where overture_id = 'catalog-test-a') <> 1 then
    raise exception 'catalog import is not idempotent';
  end if;

  -- A later valid release retires places that are no longer present.
  delete from private.venue_catalog_places_staging;
  insert into private.venue_catalog_places_staging (
    overture_id, name, categories, country, latitude, longitude, operating_status
  ) values (
    'catalog-test-b', 'Catalog Test B', '["theater"]', 'US', 34, -118, 'open'
  );
  select * into result from private.apply_venue_catalog_import('catalog-test-release-2', 1);
  if not exists (
    select 1 from private.venue_catalog_places
    where overture_id = 'catalog-test-a' and retired_at is not null
  ) then
    raise exception 'missing places were not retired';
  end if;

  select count(*) into active_before_failure
  from private.venue_catalog_places where retired_at is null;

  -- Validation errors run in a PL/pgSQL subtransaction and leave the catalog unchanged.
  begin
    perform * from private.apply_venue_catalog_import('catalog-test-invalid', 2);
  exception when others then
    validation_failed := true;
  end;
  if not validation_failed then
    raise exception 'invalid import unexpectedly succeeded';
  end if;

  if active_before_failure <> (
    select count(*) from private.venue_catalog_places where retired_at is null
  ) then
    raise exception 'failed import changed the active catalog';
  end if;
end;
$$;

rollback;
