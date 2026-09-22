# FIN-103 — Harden finance commands

**Date:** 2026-07-20  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Acceptance criteria

Allowed-field schemas, org/parent predicates, state transitions, idempotency, money validation, expected version, reason, and immutable audit are required.

## What shipped

### Schemas

`lib/admin/finance-command-schemas.ts`

- Transactions: create / update / `transition_payment_status` / delete
- Budgets: create / update
- Settlements: create / update / `transition_settlement_status`
- `.strict()` rejects unknown fields; money is finite non-negative; category↔type refine
- Reason required for payment/settlement transitions and delete
- `expected_updated_at` / `expected_status` for CAS
- Payment graph: pending→paid|overdue|cancelled; overdue→paid|cancelled; paid→refunded
- Settlement graph: draft→finalized→paid

### Service

`lib/admin/finance-command.service.ts` — `executeFinanceCommand`

- Gateway capability `finance.manage`; `finance.pay` / `finance.approve` for money/finalize moves
- Parent event/tour via `assertOrgEntityReferences`
- Paid/refunded transactions and paid/finalized settlements immutable for overwrite
- `stampFinanceOrgId` on creates; `logAuditEvent` on all mutations
- Typed `FinanceCommandError` / transition errors

### HTTP

- Canonical: `POST /api/admin/finances/commands` (`withOrgCommand`, Idempotency-Key required)
- Compat: `/api/admin/finances` POST/PATCH/DELETE and settlements POST/PATCH → command chain
- Legacy PATCH with `payment_status` maps to update + transition (CAS refreshed between steps)

### Registry

`/api/admin/finances/commands` registered under `commerce-finance`.

## Follow-ups

- `FIN-104` remove raw UUID entry UX (scoped search)
- `FIN-105` reversal/adjustment rules for posted records
