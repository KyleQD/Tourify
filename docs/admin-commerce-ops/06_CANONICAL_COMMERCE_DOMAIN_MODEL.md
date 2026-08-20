# Canonical Commerce Domain Model

## Objective

Create a consistent domain model over existing marketplace, ticketing, subscription, promotion, service, and merchandise records without requiring an immediate destructive consolidation.

## Entity Graph

```text
Commerce Party
  ├── Customer Snapshot
  └── Seller Snapshot

Product
  └── Listing
        ├── Variant
        ├── Inventory
        └── External Destination

Checkout Attempt
  └── Payment Attempt
        └── Order
              ├── Order Item
              │     └── Fulfillment Obligation
              ├── Fee Snapshot
              ├── Refund
              ├── Seller Payable
              ├── Payout
              ├── Dispute / Case
              └── Settlement Entry
```

## Money Contract

```ts
interface Money {
  amountMinor: number
  currency: string
}
```

Rules:

- Use integer minor units.
- Preserve provider values.
- Validate currency across related records.
- Never aggregate mixed currencies without explicit conversion.
- Use currency-specific decimal rules.
- Store fee and refund snapshots.
- Avoid floating-point settlement calculations.

## Party Snapshot

Orders must preserve immutable buyer and seller snapshots because live profiles can change.

Suggested fields:

- display name,
- email where permitted,
- account ID,
- account type,
- seller legal or payout identifier reference,
- billing country,
- source identity version.

## Transaction Source Types

- marketplace,
- ticketing,
- subscription,
- promotion,
- merchandise,
- service booking,
- external import,
- administrative adjustment.

## Status Dimensions

### Checkout

- created,
- pending,
- abandoned,
- completed,
- expired.

### Payment

- created,
- requires_action,
- authorized,
- captured,
- failed,
- cancelled,
- partially_refunded,
- refunded,
- disputed,
- chargeback,
- unknown.

### Order

- pending_payment,
- paid,
- processing,
- partially_fulfilled,
- fulfilled,
- cancelled,
- refunded,
- disputed,
- closed.

### Fulfillment

- not_required,
- pending,
- processing,
- partially_fulfilled,
- fulfilled,
- delivery_failed,
- returned,
- cancelled.

### Payout

- not_eligible,
- pending,
- scheduled,
- processing,
- paid,
- failed,
- on_hold,
- reversed,
- cancelled,
- unknown_provider_state.

### Risk

- clear,
- review,
- restricted,
- disputed,
- fraud_suspected,
- blocked.

## Invariants

- Captured money must have a provider or approved internal source reference.
- Refund totals cannot exceed captured amount.
- Seller payable must reconcile to gross, fees, refunds, and adjustments.
- A payout cannot exceed available payable balance.
- An unknown provider state cannot be treated as failed.
- A ticket order marked fulfilled must have issued ticket evidence.
- A physical order marked fulfilled must have fulfillment evidence.
- A service order marked complete must have booking or completion evidence.
- Fee rule changes do not mutate completed transactions.
- Financial history is append-only or fully audited.
