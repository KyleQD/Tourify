set client_min_messages = warning;

-- Step 5 (security linter 0014_extension_in_public):
-- Install/move extensions in the dedicated "extensions" schema instead of public.
-- supabase/config.toml already sets extra_search_path = ["public", "extensions"] for the API.

do $body$
begin
  if not exists (select 1 from pg_namespace where nspname = 'extensions') then
    create schema extensions;
  end if;
end;
$body$;

comment on schema extensions is 'PostgreSQL extensions (Supabase advisor: keep out of public).';

grant usage on schema extensions to postgres, anon, authenticated, service_role;

-- pg_trgm (forum / text search)
do $body$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    begin
      execute 'alter extension pg_trgm set schema extensions';
    exception
      when others then
        raise notice 'security_linter_step5: could not move pg_trgm to extensions: %', sqlerrm;
    end;
  end if;
end $body$;

-- moddatetime (often enabled on hosted projects for updated_at triggers)
do $body$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'moddatetime'
      and n.nspname = 'public'
  ) then
    begin
      execute 'alter extension moddatetime set schema extensions';
    exception
      when others then
        raise notice 'security_linter_step5: could not move moddatetime to extensions: %', sqlerrm;
    end;
  end if;
end $body$;

-- pg_net (scheduled jobs / HTTP from database)
do $body$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net'
      and n.nspname = 'public'
  ) then
    begin
      execute 'alter extension pg_net set schema extensions';
    exception
      when others then
        raise notice 'security_linter_step5: could not move pg_net to extensions: %', sqlerrm;
    end;
  end if;
end $body$;
