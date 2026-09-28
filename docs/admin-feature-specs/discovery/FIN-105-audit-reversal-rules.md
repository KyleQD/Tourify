# FIN-105 — Establish financial audit/reversal rules

**Date:** 2026-07-20  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Acceptance criteria

Approved/posted/settled records cannot be deleted/overwritten; reversal/adjustment links and before/after evidence are tested.

## What shipped

### Schema (additive)

Migration `20260720184000_fin105_reversal_adjustment_rules.sql`

- `financial_transactions.posted_at`, `reverses_transaction_id`, `adjusts_transaction_id` (+ single-link check)
- `settlements.adjusts_settlement_id`, `reverses_settlement_id`
- Backfill `posted_at` for existing paid/refunded rows
- `admin_verify_finance_reversal_rules()` contract RPC

### Rules + commands

`lib/admin/finance-reversal-rules.ts` — posted/settled predicates, mutate guards, reversal line builder

Commands (FIN-103 service):

| Action | Behavior |
|--------|----------|
| `create_reversal` | Opposite posted line linked via `reverses_transaction_id`; original immutable |
| `create_adjustment` | New posted line linked via `adjusts_transaction_id` |
| `create_settlement_adjustment` | New **draft** settlement linked via `adjusts_settlement_id` from finalized/paid |

Audit: `logAuditEvent` stores before (original amounts/status) and after (link + reason).

Existing update/delete paths continue to reject posted transactions and paid/finalized settlement overwrites.

### Tests

`__tests__/admin/finance-reversal-rules.test.ts` — immutability, single reversal, line builder, schema reason/version.

## Follow-ups

- UI affordances for reverse/adjust on Finances dashboard
- `VEND-101` next in Phase 1 inventory
