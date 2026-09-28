-- DB-005 zero-drift contract checks.
-- Run after the additive migration in a target database. Every query should
-- return zero rows; the final query should return one row.

-- Canonical foundation and admin compatibility read models must exist.
select required_object
from (values
  ('event_ticketing_config'::text),
  ('ticket_types'::text),
  ('ticket_sales'::text),
  ('ticket_campaigns'::text),
  ('promo_codes'::text),
  ('ticket_shares'::text),
  ('ticket_referrals'::text),
  ('ticket_analytics'::text),
  ('social_media_performance'::text),
  ('tickets'::text),
  ('ticket_checkins'::text)
) as expected(required_object)
where not exists (
  select 1
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = expected.required_object
    and c.relkind in ('r', 'p', 'v', 'm')
);

-- The admin overview signature is the stable route contract.
select 'get_admin_ticketing_overview signature missing' as violation
where to_regprocedure('public.get_admin_ticketing_overview(uuid,uuid)') is null;

select 'get_admin_ticketing_social_performance signature missing' as violation
where to_regprocedure('public.get_admin_ticketing_social_performance(uuid,uuid)') is null;

-- All compatibility read models must be protected by RLS.
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'ticket_shares',
    'ticket_referrals',
    'ticket_analytics',
    'social_media_performance'
  )
  and not c.relrowsecurity;

-- No compatibility read-model policy may grant blanket authenticated access.
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ticket_shares',
    'ticket_referrals',
    'ticket_analytics',
    'social_media_performance'
  )
  and (
    coalesce(qual, '') ilike '%auth.role()%'
    or coalesce(with_check, '') ilike '%auth.role()%'
  );

-- The RPC must not be executable by public or anon callers.
select grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in (
    'get_admin_ticketing_overview',
    'get_admin_ticketing_social_performance'
  )
  and grantee in ('PUBLIC', 'anon');

select 'DB-005 ticketing schema contract' as contract,
       to_regprocedure('public.get_admin_ticketing_overview(uuid,uuid)') is not null as overview_rpc_ready,
       to_regprocedure('public.get_admin_ticketing_social_performance(uuid,uuid)') is not null as social_performance_rpc_ready;
