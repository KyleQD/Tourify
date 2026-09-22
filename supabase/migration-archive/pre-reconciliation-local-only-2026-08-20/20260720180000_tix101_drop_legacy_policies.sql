-- TIX-101: Explicit re-drop of blanket ticketing policies + isolation verify helper.
-- Idempotent with SEC-108. Proves Org A/Org B isolation prerequisites before UI rollout.
-- migration-validation: policies-preplaced-by 20260720075500_admin_legacy_ticketing_rls_sec108.sql

-- ---------------------------------------------------------------------------
-- 1) Explicit DROP of known blanket policies (must DROP, not shadow)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.ticket_types') is not null then
    drop policy if exists ticket_types_all on public.ticket_types;
  end if;
  if to_regclass('public.ticket_sales') is not null then
    drop policy if exists ticket_sales_all on public.ticket_sales;
  end if;
  if to_regclass('public.ticket_campaigns') is not null then
    drop policy if exists ticket_campaigns_all on public.ticket_campaigns;
    drop policy if exists ticket_campaigns_write on public.ticket_campaigns;
    drop policy if exists "ticket_campaigns_write" on public.ticket_campaigns;
  end if;
  if to_regclass('public.promo_codes') is not null then
    drop policy if exists promo_codes_all on public.promo_codes;
    drop policy if exists promo_codes_write on public.promo_codes;
    drop policy if exists "promo_codes_write" on public.promo_codes;
  end if;
  if to_regclass('public.ticket_shares') is not null then
    drop policy if exists ticket_shares_all on public.ticket_shares;
    drop policy if exists "ticket_shares_all" on public.ticket_shares;
  end if;
  if to_regclass('public.ticket_referrals') is not null then
    drop policy if exists ticket_referrals_all on public.ticket_referrals;
    drop policy if exists "ticket_referrals_all" on public.ticket_referrals;
  end if;
  if to_regclass('public.ticket_analytics_events') is not null then
    drop policy if exists ticket_analytics_events_insert on public.ticket_analytics_events;
    drop policy if exists "ticket_analytics_events_insert" on public.ticket_analytics_events;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Verify helper — zero remaining blanket quals on ticketing tables
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_tix101_no_blanket_policies()
returns table (
  table_name text,
  policy_name text,
  cmd text,
  qual text,
  with_check text
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $$
  select
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    coalesce(p.qual, '')::text,
    coalesce(p.with_check, '')::text
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (
      'ticket_types',
      'ticket_sales',
      'tickets',
      'ticket_campaigns',
      'promo_codes',
      'ticket_shares',
      'ticket_referrals',
      'event_ticketing_config',
      'ticket_analytics_events',
      'event_ticket_types',
      'ticket_purchases'
    )
    and (
      coalesce(p.qual, '') in ('true', '(true)')
      or coalesce(p.with_check, '') in ('true', '(true)')
      or coalesce(p.qual, '') ilike '%auth.role() = ''authenticated''%'
      or coalesce(p.with_check, '') ilike '%auth.role() = ''authenticated''%'
      or p.policyname in (
        'ticket_types_all',
        'ticket_sales_all',
        'ticket_campaigns_all',
        'promo_codes_all',
        'ticket_campaigns_write',
        'promo_codes_write',
        'ticket_shares_all',
        'ticket_referrals_all',
        'ticket_analytics_events_insert'
      )
    );
$$;

revoke all on function public.admin_verify_tix101_no_blanket_policies() from public;
grant execute on function public.admin_verify_tix101_no_blanket_policies() to service_role;

comment on function public.admin_verify_tix101_no_blanket_policies() is
  'TIX-101: returns remaining blanket ticketing policies (must be empty after apply).';
