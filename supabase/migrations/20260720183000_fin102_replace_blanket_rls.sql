-- FIN-102: Confirm blanket finance policies are gone; verify RPC for CI.
-- Capability policies remain from SEC-106 (sec106_*). Additive DROP IF EXISTS only.
-- migration-validation: policies-preplaced-by 20260720075248_admin_finance_rls_sec106.sql

do $$
declare
  t text;
  p text;
  blankets text[] := array[
    'fin_tx_all',
    'budgets_all',
    'settlements_write',
    'settlements_org_isolation',
    'settlements_select',
    'settlements_insert',
    'settlements_update',
    'settlements_delete',
    'audit_log_select',
    'financial_transactions_select',
    'financial_transactions_insert',
    'financial_transactions_update',
    'financial_transactions_delete',
    'budgets_select',
    'budgets_insert',
    'budgets_update',
    'budgets_delete',
    'financial_audit_log_select',
    'financial_audit_log_insert',
    'financial_audit_log_update',
    'financial_audit_log_delete'
  ];
  tables text[] := array[
    'financial_transactions',
    'budgets',
    'settlements',
    'financial_audit_log'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    foreach p in array blankets loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
  end loop;
end $$;

create or replace function public.admin_verify_fin102_no_blanket_policies()
returns table (
  table_name text,
  policy_name text,
  cmd text,
  roles text
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
    coalesce(p.roles::text, '')
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (
      'financial_transactions',
      'budgets',
      'settlements',
      'financial_audit_log'
    )
    and (
      p.policyname in (
        'fin_tx_all',
        'budgets_all',
        'settlements_write',
        'settlements_org_isolation',
        'audit_log_select'
      )
      or (
        coalesce(p.qual, '') = 'true'
        or coalesce(p.with_check, '') = 'true'
        or coalesce(p.qual, '') like '%auth.role() = ''authenticated''%'
      )
    );
$$;

revoke all on function public.admin_verify_fin102_no_blanket_policies() from public;
grant execute on function public.admin_verify_fin102_no_blanket_policies() to service_role;

comment on function public.admin_verify_fin102_no_blanket_policies() is
  'FIN-102: remaining blanket finance policies (must be empty after apply).';
