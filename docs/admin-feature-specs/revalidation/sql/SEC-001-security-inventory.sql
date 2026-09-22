-- SEC-001 read-only database security inventory.
--
-- Run this unchanged against:
--   1. an isolated database created from the repository migration set; and
--   2. the hosted Tourify Demo database.
--
-- The single result cell is normalized JSON. Save the two cells to separate JSON
-- files in access-controlled storage, then compare them with:
--
--   node scripts/security/compare-sec001-inventories.mjs \
--     repository.json hosted.json --output sec001-drift.md
--
-- This script contains SELECT statements only. It does not change schema, data,
-- policies, grants, migration history, or database configuration.

with
relation_inventory as (
  select jsonb_build_object(
    'schema', n.nspname,
    'name', c.relname,
    'kind', case c.relkind
      when 'r' then 'table'
      when 'p' then 'partitioned_table'
      when 'v' then 'view'
      when 'm' then 'materialized_view'
      when 'f' then 'foreign_table'
      when 'S' then 'sequence'
      else c.relkind::text
    end,
    'owner', pg_get_userbyid(c.relowner),
    'rls_enabled', c.relrowsecurity,
    'rls_forced', c.relforcerowsecurity,
    'view_security_invoker', case
      when c.relkind = 'v' then coalesce(array_to_string(c.reloptions, ','), '') like '%security_invoker=true%'
      else null
    end
  ) as item
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
),
policy_inventory as (
  select jsonb_build_object(
    'schema', n.nspname,
    'relation', c.relname,
    'name', p.polname,
    'permissive', p.polpermissive,
    'roles', coalesce((
      select jsonb_agg(
        case when role_oid = 0 then 'public' else coalesce(r.rolname, role_oid::regrole::text) end
        order by case when role_oid = 0 then 'public' else coalesce(r.rolname, role_oid::regrole::text) end
      )
      from unnest(p.polroles) role_oid
      left join pg_roles r on r.oid = role_oid
    ), '[]'::jsonb),
    'command', case p.polcmd
      when 'r' then 'select'
      when 'a' then 'insert'
      when 'w' then 'update'
      when 'd' then 'delete'
      when '*' then 'all'
      else p.polcmd::text
    end,
    'using', pg_get_expr(p.polqual, p.polrelid),
    'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
  ) as item
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
routine_inventory as (
  select jsonb_build_object(
    'schema', n.nspname,
    'name', p.proname,
    'identity_arguments', pg_get_function_identity_arguments(p.oid),
    'kind', case p.prokind
      when 'f' then 'function'
      when 'p' then 'procedure'
      when 'a' then 'aggregate'
      when 'w' then 'window'
      else p.prokind::text
    end,
    'owner', pg_get_userbyid(p.proowner),
    'language', l.lanname,
    'security_definer', p.prosecdef,
    'volatility', case p.provolatile
      when 'i' then 'immutable'
      when 's' then 'stable'
      when 'v' then 'volatile'
      else p.provolatile::text
    end,
    'leakproof', p.proleakproof,
    'parallel', case p.proparallel
      when 's' then 'safe'
      when 'r' then 'restricted'
      when 'u' then 'unsafe'
      else p.proparallel::text
    end,
    'configuration', coalesce(to_jsonb(p.proconfig), '[]'::jsonb)
  ) as item
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
),
trigger_inventory as (
  select jsonb_build_object(
    'schema', n.nspname,
    'relation', c.relname,
    'name', t.tgname,
    'enabled', t.tgenabled,
    'definition', pg_get_triggerdef(t.oid, true)
  ) as item
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
),
relation_grant_inventory as (
  select jsonb_build_object(
    'object_kind', case when c.relkind = 'S' then 'sequence' else 'relation' end,
    'schema', n.nspname,
    'object', c.relname,
    'grantee', case acl.grantee when 0 then 'public' else grantee_role.rolname end,
    'grantor', grantor_role.rolname,
    'privilege', acl.privilege_type,
    'grantable', acl.is_grantable
  ) as item
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(
    c.relacl,
    acldefault(case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end, c.relowner)
  )) acl
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
),
routine_grant_inventory as (
  select jsonb_build_object(
    'object_kind', 'routine',
    'schema', n.nspname,
    'object', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    'grantee', case acl.grantee when 0 then 'public' else grantee_role.rolname end,
    'grantor', grantor_role.rolname,
    'privilege', acl.privilege_type,
    'grantable', acl.is_grantable
  ) as item
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  where n.nspname = 'public'
),
schema_grant_inventory as (
  select jsonb_build_object(
    'object_kind', 'schema',
    'schema', n.nspname,
    'object', n.nspname,
    'grantee', case acl.grantee when 0 then 'public' else grantee_role.rolname end,
    'grantor', grantor_role.rolname,
    'privilege', acl.privilege_type,
    'grantable', acl.is_grantable
  ) as item
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) acl
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  left join pg_roles grantor_role on grantor_role.oid = acl.grantor
  where n.nspname = 'public'
),
migration_inventory as (
  select jsonb_build_object(
    'version', to_jsonb(m)->>'version',
    'name', to_jsonb(m)->>'name'
  ) as item
  from supabase_migrations.schema_migrations m
),
inventory as (
  select jsonb_build_object(
    'format_version', 1,
    'generated_at', to_char(statement_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'database_name', current_database(),
    'relations', coalesce((select jsonb_agg(item order by item::text) from relation_inventory), '[]'::jsonb),
    'policies', coalesce((select jsonb_agg(item order by item::text) from policy_inventory), '[]'::jsonb),
    'routines', coalesce((select jsonb_agg(item order by item::text) from routine_inventory), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(item order by item::text) from trigger_inventory), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(item order by item::text)
      from (
        select item from relation_grant_inventory
        union all
        select item from routine_grant_inventory
        union all
        select item from schema_grant_inventory
      ) all_grants
    ), '[]'::jsonb),
    'migration_versions', coalesce((select jsonb_agg(item order by item::text) from migration_inventory), '[]'::jsonb)
  ) as document
)
select jsonb_pretty(document) as sec001_security_inventory
from inventory;
