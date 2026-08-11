# FIN-102 — Replace blanket RLS

**Date:** 2026-07-20  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Acceptance criteria

Select/insert/update/delete require organization and finance capability; protected payment/person fields use narrower projection; direct-client tests pass.

## What shipped

### Migration

`20260720183000_fin102_replace_blanket_rls.sql`

- Idempotent DROP of residual blanket / pre-SEC-106 policy names
- `admin_verify_fin102_no_blanket_policies()` — must return zero rows
- Destination policies remain `sec106_*` + `can_finance` (SEC-106)

### Protected projection

`lib/admin/finance-field-projection.ts`

- Redacts `payment_reference`, `payment_method`, `vendor_name`, `receipt_url` for `finance.view`-only
- Full fields for `finance.manage` / `finance.pay` / `finance.approve`
- Wired on `GET /api/admin/finances` (overview + transactions)

### Direct-client contract

`buildFin102DirectClientCases()` — Org A allow, Org B/anon/no-cap deny for each finance table (audit insert denied).

## Follow-ups

- `FIN-103` canonical finance command service
- Live persona matrix against `ADMIN_RLS_TEST_DATABASE_URL` when available
