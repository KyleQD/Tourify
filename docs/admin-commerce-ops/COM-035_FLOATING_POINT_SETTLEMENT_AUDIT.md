# COM-035 Floating-Point Settlement Calculation Audit

Date: 2026-08-12

Source task: COM-035 - Audit and replace floating-point settlement calculations.

## Scope

This task starts the replacement of settlement arithmetic that previously used
major-unit JavaScript numbers and `Math.round(value * 100) / 100`.

The Commerce Operations canonical rule is:

- perform settlement arithmetic in integer minor units,
- preserve currency on every money value,
- reject precision that cannot be represented in the currency,
- convert back to legacy decimal columns only at explicit adapter boundaries.

No schema, provider-side money movement, payout scheduling behavior, or legacy
route removal occurred for this task.

## Findings

The highest-risk direct settlement helper was:

- `lib/ticketing/settlements.ts`

It previously computed percentage and remainder settlement shares with decimal
major-unit numbers:

- percentage share: rounded with `Math.round(... * 100) / 100`
- remaining share: rounded with `Math.round((remaining - amount) * 100) / 100`

Inventory tasks COM-014, COM-015, and COM-016 also found legacy decimal
major-unit settlement-adjacent writes in marketplace checkout and payout ledger
rows. Those flows already compute core fees in cents, then write decimal values
because the current tables are legacy `numeric(10,2)` columns.

## Replacement

Added canonical adapter and settlement calculation modules:

- `lib/admin/commerce/money-adapters.ts`
- `lib/admin/commerce/settlement-calculations.ts`

The adapter converts legacy major-unit values to canonical `Money`:

```ts
{ amountMinor, currency }
```

The settlement calculator now allocates revenue shares in integer minor units.
`lib/ticketing/settlements.ts` delegates to the canonical calculator and only
converts back to the legacy decimal `amount` field at the API compatibility
boundary. It also exposes `amount_minor` and `currency` on returned share rows
for new callers.

## Deferred Legacy Boundaries

Marketplace checkout and payout ledger writes remain live and unchanged except
for the documented migration path. They already derive cents from the fee
calculator, but still persist decimal columns until canonical read models and
nullable support columns are introduced in later COM tasks.

Further replacements should continue from these audited paths:

- `app/api/marketplace/checkout/route.ts`
- `lib/marketplace/seller-analytics.ts`
- `app/api/ticketing/reports/route.ts`
- `app/api/admin/ticketing/refund/route.ts`
- `lib/ticketing/fees.ts`
- `lib/ticketing/orders.ts`

## Verification

Focused tests:

- `npx vitest run __tests__/admin/commerce-money-adapters.test.ts __tests__/admin/commerce-settlement-calculations.test.ts __tests__/ticketing/settlements.test.ts __tests__/admin/commerce-money.test.ts __tests__/admin/commerce-currency.test.ts`

Focused lint:

- `npx eslint lib/admin/commerce/money-adapters.ts lib/admin/commerce/settlement-calculations.ts lib/ticketing/settlements.ts __tests__/admin/commerce-money-adapters.test.ts __tests__/admin/commerce-settlement-calculations.test.ts __tests__/ticketing/settlements.test.ts`
