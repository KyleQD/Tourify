-- ============================================================================
-- db011_marketplace_entitlement_rpc_contract.sql
--
-- Zero-drift contract postflight for
--   20260926120200_marketplace_entitlement_download_increment_rpc.sql
--
-- The security assertions are the point. DB-002's release blocker was four
-- SECURITY DEFINER functions that kept PUBLIC/anon EXECUTE; this postflight
-- fails closed on exactly that regression.
--
-- Returns ONLY violation rows plus exactly one summary row named
-- `marketplace_entitlement_download_rpc_ready`.
-- ============================================================================

with fn as (
  select p.oid, p.prosecdef, p.proconfig
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'record_marketplace_entitlement_download'
    and p.pronargs = 3
)
select
  'record_marketplace_entitlement_download'::text as relation_name,
  'function'::text as column_name,
  case
    when (select count(*) from fn) = 0 then 'function missing'
    when (select count(*) from fn) > 1 then 'more than one overload exists'
    else null
  end as violation
where (select count(*) from fn) <> 1
union all
-- SECURITY DEFINER is intentional, so the search_path must be pinned or the
-- function is a privilege-escalation primitive.
select 'record_marketplace_entitlement_download', 'search_path',
       'proconfig is ' || coalesce((select proconfig::text from fn), 'null') || '; search_path=public is required'
where exists (select 1 from fn)
  and (not (select prosecdef from fn)
       or (select proconfig from fn) is null
       or not exists (select 1 from unnest((select proconfig from fn)) cfg where cfg like 'search\_path=%public%'))
union all
-- PUBLIC and anon must not be able to execute it.
select 'record_marketplace_entitlement_download', 'execute_privilege',
       'role ' || r.rolname || ' retains EXECUTE'
from fn, pg_catalog.pg_roles r
where exists (select 1 from fn)
  and r.rolname in ('public', 'anon')
  and has_function_privilege(r.rolname, 'public.record_marketplace_entitlement_download(uuid, text, timestamptz)', 'EXECUTE')
union all
-- and the buyer must.
select 'record_marketplace_entitlement_download', 'authenticated_execute',
       'authenticated cannot EXECUTE the increment RPC'
where exists (select 1 from fn)
  and not has_function_privilege('authenticated', 'public.record_marketplace_entitlement_download(uuid, text, timestamptz)', 'EXECUTE')
union all
-- the single-statement increment must be present in the body. A read-modify-write
-- written in plpgsql would reintroduce the lost-update window this replaces.
select 'record_marketplace_entitlement_download', 'body_is_single_statement_update',
       'the body does not contain the guarded single UPDATE'
where exists (select 1 from fn)
  and (
    pg_get_functiondef((select oid from fn)) !~ 'download_count\s*=\s*e\.download_count\s*\+\s*1'
    or pg_get_functiondef((select oid from fn)) !~ 'buyer_user_id\s*=\s*v_actor'
    or pg_get_functiondef((select oid from fn)) !~ 'download_count\s*<\s*e\.max_downloads'
    or pg_get_functiondef((select oid from fn)) !~ 'status\s*=\s*.active.'
  )
union all
-- buyer scope must come from the caller identity, never from a parameter.
select 'record_marketplace_entitlement_download', 'actor_source',
       'the body does not read auth.uid()'
where exists (select 1 from fn)
  and pg_get_functiondef((select oid from fn)) !~ 'auth\.uid\(\)'
union all
select '__summary__', 'marketplace_entitlement_download_rpc_ready', 'ok'
where (
  select count(*)
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'record_marketplace_entitlement_download'
    and p.pronargs = 3
) = 1;
