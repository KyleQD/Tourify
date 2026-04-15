-- Shared helpers for idempotent migrations without NOTICE spam from DROP POLICY IF EXISTS.
do $body$
begin
  if not exists (select 1 from pg_namespace where nspname = 'migration_helpers') then
    create schema migration_helpers;
  end if;
end;
$body$;

comment on schema migration_helpers is 'Internal helpers for SQL migrations (not exposed to PostgREST).';

create or replace function migration_helpers.drop_policy_if_exists(
  p_schema text,
  p_table text,
  p_policy text
)
returns void
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if exists (
    select 1
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid = p.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = p_schema
      and c.relname = p_table
      and p.polname = p_policy
  ) then
    execute format('drop policy %I on %I.%I', p_policy, p_schema, p_table);
  end if;
end;
$fn$;

revoke all on schema migration_helpers from public;
revoke all on function migration_helpers.drop_policy_if_exists(text, text, text) from public;
grant usage on schema migration_helpers to postgres;
