# Supabase Data Model and Migration Plan

## Principles

- Additive migrations.
- No production reset.
- No destructive consolidation before parity.
- Separate schema and backfill.
- Idempotent backfills.
- RLS on exposed objects.
- Security-invoker views.
- Advisors after changes.
- Before-and-after reconciliation.

## Potential Additive Tables

Validate existing schema before adding any table.

### `commerce_transaction_index`

Optional normalized index referencing source records.

### `commerce_party_snapshots`

Immutable buyer and seller transaction snapshots.

### `commerce_fee_snapshots`

Transaction-level fee calculations and rule version.

### `commerce_refunds`

Canonical refund records if no existing canonical table exists.

### `commerce_fulfillment_obligations`

Unified fulfillment tracking across product types.

### `commerce_cases`

Typed support, moderation, dispute, and risk cases.

### `commerce_issues`

Needs Attention issues.

### `commerce_settlements`

Settlement header.

### `commerce_settlement_entries`

Transaction, fee, refund, payable, and payout entries.

### `commerce_bulk_operations`

Bulk operation state and idempotency.

### `commerce_saved_views`

Saved filters and columns.

## Potential Additive Columns

### Orders

- source type,
- source record,
- normalized order state,
- payment state,
- fulfillment state,
- refund state,
- risk state,
- buyer snapshot reference,
- seller snapshot reference,
- version.

### Payout ledger

- provider state,
- provider last checked,
- idempotency key,
- hold reason,
- retry eligibility,
- version.

### Moderation queue

- case type,
- priority,
- owner,
- SLA,
- amount at risk,
- resolution category,
- customer outcome,
- seller outcome.

## Read Models

Potential secure views:

- `commerce_overview_v`
- `commerce_transaction_ledger_v`
- `commerce_orders_v`
- `commerce_sellers_v`
- `commerce_fulfillment_queue_v`
- `commerce_payment_failures_v`
- `commerce_payout_reconciliation_v`
- `commerce_ticket_reconciliation_v`
- `commerce_subscription_health_v`

## Backfill Sequence

1. Snapshot source counts.
2. Add nullable fields or new tables.
3. Classify source types.
4. Backfill currency and minor-unit representation.
5. Create party snapshots.
6. Backfill fee snapshots.
7. Link checkout, payment, order, fulfillment, payout, and ticket records.
8. Generate reconciliation report.
9. Resolve invalid or ambiguous data.
10. Add constraints only after repair.

## Integrity Reports

- Paid order without payment evidence.
- Captured payment without order.
- Refund above captured amount.
- Fee mismatch.
- Seller payable mismatch.
- Payout above available balance.
- Ticket paid but not issued.
- Subscription entitlement mismatch.
- Cross-scope seller relationship.
- Currency mismatch.
- Duplicate provider event.
- Orphan settlement entry.

## Indexes

Index common combinations:

- source + created date,
- seller + date,
- customer + date where permitted,
- payment state + date,
- fulfillment state + date,
- payout state + date,
- Event + source,
- issue status + severity,
- provider reference,
- order number.

## Rollback

Every migration must document:

- flags to disable,
- views to stop using,
- columns safe to retain,
- backfill reversal limits,
- provider effects,
- financial audit implications.
