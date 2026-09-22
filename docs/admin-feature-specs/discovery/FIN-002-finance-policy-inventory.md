# FIN-002 — Finance data, policy, and consumer inventory

**Status:** In progress — repository evidence complete; hosted counts/advisors pending  
**Date:** 2026-07-21  
**Parent:** ADR-008 / FIN-001

Repository migrations describe engineering intent, not proof of the hosted `Tourify Demo` schema. The read-only hosted queries below must be run on an isolated branch and then production before this task is complete. Missing/error results remain unavailable and are never converted to zero.

The executable read-only evidence pack is [`../revalidation/sql/FIN-002-hosted-audit.sql`](../revalidation/sql/FIN-002-hosted-audit.sql). Preserve its output with the branch/project identifier and capture time; do not edit the script into a migration.

## Deployed-chain relations

| Relation | Authority / format | Org and parent coverage | Current policy/grant risk | Destination |
|---|---|---|---|---|
| `financial_transactions` | legacy operational actual/payment; positive `numeric amount` plus income/expense type | non-null `org_id`; nullable event/tour IDs are not composite-org constrained in the base schema | blanket `fin_tx_all` was replaced by capability policies, but direct delete/update and paid-state mutation remain until FIN-105/103 | append-only minor-unit posting/reversal records |
| `budgets` | mutable category allocation/spent aggregate | `org_id` was added/backfilled from tour/event; unresolved ownership can remain nullable; event/tour cross-org match is not proven | capability RLS exists; direct delete/update remains | versioned budget headers/lines, approvals, commitments |
| `settlements` | mutable gross/expense/generated-net and payouts, `numeric` | non-null `org_id`; nullable tour/event not composite-org constrained | capability RLS exists; direct delete and finalized/paid update policy is weaker than immutable versioning | versioned deal calculation, adjustment and signoff |
| `financial_audit_log` | legacy diff log | nullable `org_id`; transaction FK/parent authority not enforced | select-only authenticated policy plus service writes must be verified; action names include delete | append-only org-scoped audit with immutable source/version IDs |
| optional hosted `event_expenses` | archive-era child referenced by FIN-101 if present; no active migration creates it | hosted schema and parent/org coverage are unknown | effective policies depend on hosted history; no runtime consumer was found | quarantine/retain if deployed; do not infer absence from repository |
| Ticket revenue/fee/refund categories in `financial_transactions` | ticketing bridge | inherits transaction scope | source reconciliation is incomplete | TIX-513 versioned settlement handoff |

Other similarly named music-marketplace/licensing/rights/institutional relations are separate product domains and are not Admin tour finance authority unless a later mapping ADR explicitly includes them.

## Currency and integrity findings

- Core tables store unconstrained decimal `numeric` amounts and generally lack a per-row currency code, minor-unit integer, currency exponent, FX source/rate/as-of, and rounding evidence required by ADR-010.
- Generated settlement net is deterministic only within one assumed currency; mixed-currency inputs cannot be safely aggregated.
- `budgets` permits both event and tour IDs and only requires at least one; duplicate category/scope rows have no canonical version key.
- Parent IDs are raw UUIDs at the schema/API boundary; org-parent composite keys are not consistently enforced.
- Existing backfills derive budget org from tour then event, but do not quarantine unresolved or conflicting parents in the same migration.
- FIN-105 adds reversal/adjustment links and `posted_at`; settlement has a database lifecycle trigger, but equivalent database immutability for posted/refunded `financial_transactions` is not present.
- Optional idempotency on compatibility mutations, absent budget natural-key uniqueness, and absent settlement version uniqueness leave duplicate risks requiring hosted evidence.

## Consumers

- UI: `app/admin/dashboard/finances/page.tsx`; tour planner ticketing financial step.
- UI components: `components/admin/event-finance-manager.tsx`, `tour-finance-manager.tsx`, and `finance-scope-picker.tsx`.
- APIs: `app/api/admin/finances/route.ts`, `commands/route.ts`, `scope-search/route.ts`, `settlements/route.ts`.
- Domain/services: `lib/admin/finance-command.service.ts`, command schemas/compatibility, finance domain/expense/projection/reversal, scope search, tenant keys, settlement domain.
- Cross-domain consumers: Admin dashboard/reporting, event finance/export, ticket settlement handoff, tour profitability/readiness, vendor/invoice/expense workflows.
- Additional lifecycle consumers: tour transition, delete eligibility, archive side effects, duplication preview/job, and `lib/ticketing/ledger.ts`.
- Retirement owner: Finance domain owner for amounts/lifecycle; Security for RLS/grants; Reporting for aggregates; Release for legacy route telemetry.

## Required read-only hosted evidence

```sql
select c.table_name, c.column_name, c.data_type, c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('financial_transactions','budgets','settlements','financial_audit_log')
order by c.table_name, c.ordinal_position;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('financial_transactions','budgets','settlements','financial_audit_log')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('financial_transactions','budgets','settlements','financial_audit_log')
order by table_name, grantee, privilege_type;

select 'financial_transactions' as relation, count(*) as rows,
       count(*) filter (where org_id is null) as null_org,
       count(*) filter (where event_id is null and tour_id is null) as orphan_scope
from public.financial_transactions
union all
select 'budgets', count(*), count(*) filter (where org_id is null),
       count(*) filter (where event_id is null and tour_id is null) from public.budgets
union all
select 'settlements', count(*), count(*) filter (where org_id is null),
       count(*) filter (where event_id is null and tour_id is null) from public.settlements
union all
select 'financial_audit_log', count(*), count(*) filter (where org_id is null),
       count(*) filter (where transaction_id is null) from public.financial_audit_log;

select org_id, event_id, tour_id, category, count(*) as duplicate_rows
from public.budgets
group by org_id, event_id, tour_id, category
having count(*) > 1;
```

## Completion gate

Do not mark FIN-002 complete until hosted migration history, row counts, null/conflicting parent report, duplicate report, currency-format distribution, policies, grants, RLS owner/viewer tests, and Security/Performance advisors are captured. Unresolved rows are quarantined by a forward migration; no reset, truncate, delete, or applied-history rewrite is permitted.

Repository-effective intent includes SEC-106 forced RLS/capability policies, FIN-101 restrictive org/quarantine policies, FIN-102 blanket-policy verification, and FIN-105 reversal verification. Whether those migrations and no unexpected overlays are deployed is part of the hosted gate.
