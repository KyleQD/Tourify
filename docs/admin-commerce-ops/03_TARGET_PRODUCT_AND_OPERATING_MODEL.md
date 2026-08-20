# Target Product and Operating Model

## Product Position

Commerce Operations is the administrative system responsible for observing and controlling Tourify's commercial lifecycle without replacing every seller-facing or Event-facing workflow.

It must answer:

1. What was sold?
2. Who bought it?
3. Who is owed money?
4. Was payment successful?
5. Was the promise fulfilled?
6. Were fees, refunds, and payouts calculated correctly?
7. What requires action now?

## Administrative Personas

### Platform commerce administrator

- Platform-wide oversight.
- Seller operations.
- Order support.
- Product and listing policy.
- Commerce configuration.

### Finance administrator

- Payments.
- Refunds.
- Seller balances.
- Payouts.
- Settlements.
- Reconciliation.
- Financial exports.

### Marketplace moderator

- Listing reports.
- Seller policy cases.
- Buyer-seller disputes.
- Prohibited products.
- Copyright and content issues.

### Customer support agent

- Order lookup.
- Customer communication.
- Seller communication.
- Internal notes.
- Escalation.
- Limited refund initiation depending on permission.

### Ticketing finance manager

- Cross-Event ticket sales.
- Refunds.
- ticket issuance mismatches.
- Event settlement.
- Ticket fee reporting.

### Subscription administrator

- Plans.
- Subscription state.
- Failed renewal.
- Entitlement reconciliation.
- Cancellation operations.

### Seller operations manager

- Seller readiness.
- Storefronts.
- Listings.
- Fulfillment performance.
- Payout setup.
- Holds and restrictions.

### Read-only auditor

- Transaction evidence.
- Financial audit.
- Case history.
- Configuration versions.
- No mutation permissions.

## Core Commerce Objects

### Commerce party

A buyer, customer, seller, organizer, artist, venue, organization, or external payee represented by immutable transaction snapshots and linked live identities.

### Product

The canonical sellable concept.

### Listing

A seller-specific offer for a product, service, ticket, digital good, or external checkout destination.

### Checkout attempt

A customer's attempt to purchase one or more items.

### Payment attempt

A provider-backed attempt to authorize or capture money.

### Order

The commercial agreement and requested delivery.

### Fulfillment obligation

The delivery requirement created by an order item.

### Refund

A reversal of captured funds in whole or part.

### Fee snapshot

The immutable platform and processing fee calculation attached to a transaction.

### Seller payable

The amount owed to a seller after fees, refunds, holds, and adjustments.

### Payout

The transfer of seller payable funds to a destination.

### Settlement

The reconciliation boundary that groups transactions, fees, refunds, and payouts.

### Moderation or risk case

A typed operational case involving listings, orders, customers, sellers, payments, disputes, or policy.

## Target Lifecycle

```text
Product or Service Defined
    ↓
Listing Created
    ↓
Checkout Attempt
    ↓
Payment Attempt
    ↓
Order Created
    ↓
Inventory / Ticket / Service Reserved
    ↓
Fulfillment Obligation Created
    ↓
Fee Snapshot and Seller Payable Created
    ↓
Delivery / Ticket Issuance / Service Completion
    ↓
Refund or Dispute if Needed
    ↓
Payout Eligibility
    ↓
Payout
    ↓
Settlement and Reconciliation
```

## Product Boundaries

Commerce Operations owns:

- cross-platform financial oversight,
- operational exceptions,
- payments,
- refunds,
- payouts,
- settlement,
- seller balances,
- risk,
- audit,
- commerce reporting.

Event workspaces retain:

- Event ticket configuration,
- ticket types,
- inventory,
- promo codes,
- guest lists,
- check-in.

Seller workspaces retain:

- storefront design,
- listing creation,
- fulfillment tasks,
- seller analytics.

Commerce Operations provides the administrative truth across those domains.
