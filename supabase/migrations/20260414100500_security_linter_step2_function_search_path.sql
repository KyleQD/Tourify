set client_min_messages = warning;

-- Step 2 (security linter 0011_function_search_path_mutable):
-- Pin search_path on public schema functions so object resolution does not
-- follow the caller's mutable search_path. Include extensions for unqualified
-- extension objects used by some SQL functions.

do $body$
declare
  stmt text;
begin
  for stmt in
    select format(
      'alter function %I.%I(%s) set search_path to public, extensions',
      n.nspname,
      p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid)
    )
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as cfg(line)
        where line like 'search_path=%'
      )
      -- Skip extension-owned funcs (e.g. pg_trgm's set_limit in public); not ALTER-able by migration role.
      and not exists (
        select 1
        from pg_catalog.pg_depend d
        where d.objid = p.oid
          and d.classid = 'pg_proc'::regclass
          and d.refclassid = 'pg_extension'::regclass
          and d.deptype = 'e'
      )
  loop
    execute stmt;
  end loop;
end;
$body$;
