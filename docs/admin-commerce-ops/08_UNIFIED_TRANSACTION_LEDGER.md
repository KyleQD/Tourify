# Unified Transaction Ledger

## Objective

Create one secure administrative ledger that normalizes commercial activity while preserving source-specific records.

## Ledger Sources

- Marketplace orders.
- Ticket sales.
- Merchandise transactions.
- Service bookings.
- Subscriptions.
- Promotions.
- External provider imports.
- Manual adjustments where approved.

## Ledger Row

```ts
interface CommerceTransactionSummary {
  id: string
  source: CommerceSource
  sourceRecordId: string
  createdAt: string
  customer: PartySummary | null
  seller: PartySummary | null
  event: EventSummary | null
  productSummary: string
  gross: Money
  discount: Money
  tax: Money
  platformFee: Money
  processingFee: Money
  refunded: Money
  sellerNet: Money
  paymentState: PaymentState
  fulfillmentState: FulfillmentState
  payoutState: PayoutState
  riskState: RiskState
  issueCount: number
}
```

## Filters

- Date range.
- Source.
- Scope.
- Seller.
- Customer.
- Event.
- Currency.
- Payment state.
- Fulfillment state.
- Refund state.
- Payout state.
- Risk state.
- Amount range.
- Issue presence.

## Search

Search by:

- transaction ID,
- order number,
- provider reference,
- payout reference,
- customer,
- seller,
- listing,
- Event,
- ticket ID.

## Saved Views

Examples:

- Failed payments today.
- Paid orders awaiting fulfillment.
- Ticket transactions with issuance mismatch.
- Seller payouts on hold.
- Refunds over threshold.
- Subscription renewals failed this week.
- Transactions with reconciliation issues.

## Data Architecture

Initially implement as:

- a service adapter layer,
- a secure read model,
- or security-invoker database view where safe.

Do not force all source systems into one physical table without a separate migration decision.

## Historical Snapshots

Ledger rows should rely on immutable transaction snapshots for:

- buyer,
- seller,
- product title,
- price,
- currency,
- fee rule,
- Event name where appropriate.

## Exports

Exports must:

- use current filters,
- include all matching records,
- format currencies safely,
- identify source,
- omit restricted PII,
- include timezone,
- record an audit event.
