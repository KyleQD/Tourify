# FIN-101 — Add/backfill validated organization scope

**Date:** 2026-07-20  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Acceptance criteria

Every finance/budget/settlement child has resolvable org and parent consistency; unresolved rows are quarantined and inaccessible.

## What shipped

### Migration `20260720182000_finance_org_keys_fin101.sql`

| Table | Action |
|---|---|
| `budgets` | Backfill org from event → tour; null → quarantine |
| `financial_audit_log` | Backfill from `financial_transactions`; null → quarantine |
| `financial_transactions` / `settlements` | Quarantine orphan org + event/tour parent mismatch |
| `event_expenses` | Optional legacy: add org_id, backfill/quarantine if present |

RESTRICTIVE policies:

- `fin101_require_org_id` — authenticated cannot see/write null org
- `fin101_deny_quarantined` — open quarantine rows inaccessible

Reasons: `unresolvable_org_id_after_parent_backfill`, `org_id_missing_organization_row`, `parent_org_mismatch`.

### Verification

- RPC `admin_verify_finance_org_keys()`
- TS: `lib/admin/finance-tenant-keys.ts` + `assertFinanceOrgKeyVerification`

### App writes

`stampFinanceOrgId` on finances + settlements creates (acting org only; client `org_id` stripped). Parent event/tour still validated via `assertOrgEntityReferences`.

## Follow-ups

- `FIN-102` — replace any remaining blanket RLS / tighten projections
- Phase 5 budget_lines / PO children when tables land (same quarantine pattern)
