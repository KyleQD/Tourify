-- FIN-002 hosted evidence pack (READ ONLY).
-- Run as one manual query on an isolated Supabase branch, then Tourify Demo.
-- This script performs no INSERT, UPDATE, DELETE, DDL, function call, or reset.

-- 1. Applied migration history relevant to Admin finance.
select version, name
from supabase_migrations.schema_migrations
where name ilike '%financ%'
   or name ilike '%budget%'
   or name ilike '%settlement%'
order by version;

-- Existing read-only verification RPCs. Missing-function errors are evidence that
-- the expected migration is not deployed; do not replace an error with a pass.
select * from public.admin_verify_finance_org_keys();
select * from public.admin_verify_fin102_no_blanket_policies();
select * from public.admin_verify_finance_reversal_rules();

-- 2. Deployed columns, nullability, defaults, and types.
select c.table_name, c.ordinal_position, c.column_name, c.data_type,
       c.udt_name, c.is_nullable, c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'financial_transactions', 'budgets', 'settlements', 'financial_audit_log',
    'event_expenses', 'admin_tenant_key_quarantine'
  )
order by c.table_name, c.ordinal_position;

-- 3. RLS enable/force status and every deployed policy.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'financial_transactions', 'budgets', 'settlements', 'financial_audit_log',
    'event_expenses', 'admin_tenant_key_quarantine'
  )
order by c.relname;

select tablename, policyname, roles, cmd, permissive, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'financial_transactions', 'budgets', 'settlements', 'financial_audit_log',
    'event_expenses', 'admin_tenant_key_quarantine'
  )
order by tablename, policyname;

-- 4. Direct table grants. Any unexpected anon/authenticated write is a blocker.
select grantee, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'financial_transactions', 'budgets', 'settlements', 'financial_audit_log',
    'event_expenses', 'admin_tenant_key_quarantine'
  )
order by table_name, grantee, privilege_type;

-- 5. Row counts and missing direct scope.
select 'financial_transactions' as relation, count(*) as row_count,
       count(*) filter (where org_id is null) as null_org,
       count(*) filter (where event_id is null and tour_id is null) as no_parent
from public.financial_transactions
union all
select 'budgets', count(*), count(*) filter (where org_id is null),
       count(*) filter (where event_id is null and tour_id is null)
from public.budgets
union all
select 'settlements', count(*), count(*) filter (where org_id is null),
       count(*) filter (where event_id is null and tour_id is null)
from public.settlements
union all
select 'financial_audit_log', count(*), count(*) filter (where org_id is null),
       count(*) filter (where transaction_id is null)
from public.financial_audit_log;

-- 6. Parent ownership mismatches. Every returned row is a quarantine blocker.
select 'financial_transactions' as relation, f.id, f.org_id,
       f.event_id, e.org_id as event_org_id, f.tour_id, t.org_id as tour_org_id
from public.financial_transactions f
left join public.events_v2 e on e.id = f.event_id
left join public.tours t on t.id = f.tour_id
where (f.event_id is not null and (e.id is null or e.org_id is distinct from f.org_id))
   or (f.tour_id is not null and (t.id is null or t.org_id is distinct from f.org_id))
union all
select 'budgets', b.id, b.org_id, b.event_id, e.org_id, b.tour_id, t.org_id
from public.budgets b
left join public.events_v2 e on e.id = b.event_id
left join public.tours t on t.id = b.tour_id
where (b.event_id is not null and (e.id is null or e.org_id is distinct from b.org_id))
   or (b.tour_id is not null and (t.id is null or t.org_id is distinct from b.org_id))
union all
select 'settlements', s.id, s.org_id, s.event_id, e.org_id, s.tour_id, t.org_id
from public.settlements s
left join public.events_v2 e on e.id = s.event_id
left join public.tours t on t.id = s.tour_id
where (s.event_id is not null and (e.id is null or e.org_id is distinct from s.org_id))
   or (s.tour_id is not null and (t.id is null or t.org_id is distinct from s.org_id));

-- 7. Duplicate natural scopes that require versioning/reconciliation.
select org_id, event_id, tour_id, category, count(*) as duplicate_rows,
       array_agg(id order by created_at) as record_ids
from public.budgets
group by org_id, event_id, tour_id, category
having count(*) > 1
order by duplicate_rows desc;

select org_id, event_id, tour_id, category, amount, payment_status,
       count(*) as duplicate_rows, array_agg(id order by created_at) as record_ids
from public.financial_transactions
group by org_id, event_id, tour_id, category, amount, payment_status
having count(*) > 1
order by duplicate_rows desc;

select org_id, event_id, tour_id, count(*) filter (where status = 'draft') as drafts,
       count(*) filter (where status = 'finalized') as finalized,
       count(*) filter (where status = 'paid') as paid
from public.settlements
group by org_id, event_id, tour_id
having count(*) > 1;

-- 8. Existing numeric/status formats. Absence of currency/FX columns is reported
-- by section 2; these distributions must not be interpreted as one currency.
select type, category, payment_status, count(*) as rows,
       min(amount) as min_amount, max(amount) as max_amount,
       count(*) filter (where amount <> round(amount, 2)) as over_two_decimal_rows
from public.financial_transactions
group by type, category, payment_status
order by type, category, payment_status;

select status, deal_type, count(*) as rows,
       count(*) filter (
         where total_gross_revenue <> round(total_gross_revenue, 2)
            or total_expenses <> round(total_expenses, 2)
       ) as over_two_decimal_rows
from public.settlements
group by status, deal_type
order by status, deal_type;

-- 9. Constraint and index coverage for tenant/parent keys.
select conrelid::regclass as relation, conname, contype,
       convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.financial_transactions'::regclass,
  'public.budgets'::regclass,
  'public.settlements'::regclass,
  'public.financial_audit_log'::regclass
)
order by relation::text, conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'financial_transactions', 'budgets', 'settlements', 'financial_audit_log'
  )
order by tablename, indexname;

-- 10. Open finance quarantine evidence (relation is created by FIN-101).
select source_table, issue_code, count(*) as rows
from public.admin_tenant_key_quarantine
where source_table in (
  'financial_transactions', 'budgets', 'settlements',
  'financial_audit_log', 'event_expenses'
)
  and resolved_at is null
group by source_table, issue_code
order by source_table, issue_code;
