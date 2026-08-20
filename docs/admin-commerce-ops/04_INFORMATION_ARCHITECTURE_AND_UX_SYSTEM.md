# Information Architecture and UX System

## Recommended Navigation

### Commerce Overview

Operational and financial health.

### Transactions

Unified ledger across marketplace, ticketing, subscriptions, promotions, merchandise, services, and external sources.

### Orders

Order lifecycle, fulfillment, refunds, and support.

### Products & Listings

Catalog, listing status, inventory, moderation, and external-link health.

### Sellers

Seller readiness, sales, balances, payouts, storefronts, performance, and restrictions.

### Customers

Permission-controlled customer history and support context.

### Fulfillment

Physical, digital, ticket, service, and external delivery obligations.

### Payments & Refunds

Payment attempts, provider events, failures, refunds, disputes, and chargebacks.

### Payouts & Settlements

Balances, payout readiness, transfers, holds, reconciliation, and settlement.

### Moderation & Risk

Typed cases, policy, evidence, SLA, ownership, and fraud signals.

### Ticketing

Cross-Event ticket financial oversight.

### Subscriptions & Fees

Subscription state, plans, entitlements, and fee-rule versions.

### Settings & Audit

Providers, currencies, taxes, policies, webhooks, permissions, configuration, and audit.

## Persistent Commerce Shell

### Global header

- Active scope.
- Date range.
- Currency selector or currency indicator.
- Global transaction search.
- Needs Attention count.
- Export action where permitted.
- Last reconciliation timestamp.

### Scope selector

- Platform.
- Organization.
- Venue.
- Artist.
- Event.
- Seller.

Scope must be validated server-side.

### Global search

Search by:

- order number,
- transaction ID,
- payment reference,
- payout reference,
- customer,
- seller,
- Event,
- listing,
- ticket,
- email where permitted.

## URL State

Examples:

```text
/admin/dashboard/commerce/transactions?source=ticketing&payment_state=failed
/admin/dashboard/commerce/orders?fulfillment_state=overdue&seller_id=...
/admin/dashboard/commerce/payouts?state=failed&currency=USD
/admin/dashboard/commerce/moderation?assigned_to=me&sla=breached
```

Persist:

- scope,
- date range,
- filters,
- sort,
- page or cursor,
- saved view,
- selected record where appropriate.

## Shared List Requirements

- Server-side pagination.
- Search.
- Sort.
- Faceted filters.
- Saved views.
- Column selection.
- Bulk selection.
- Empty, error, forbidden, stale, and partial-data states.
- CSV or report export with permission.
- Accessible tables.

## Shared Record Detail Pattern

Use a split pane, drawer, or detail route with tabs:

- Summary.
- Timeline.
- Parties.
- Items.
- Payment.
- Fulfillment.
- Refunds.
- Fees.
- Payouts.
- Cases.
- Notes.
- Audit.

## Status Presentation

Never display raw enum text directly.

Every status must define:

- label,
- description,
- semantic category,
- color and icon,
- next action,
- whether it is terminal,
- whether it blocks fulfillment or settlement.

## Financial Action UX

High-risk actions require:

- explicit permission,
- current provider state,
- impact summary,
- reason,
- idempotency,
- confirmation,
- audit,
- structured result.

Examples:

- refund,
- payout retry,
- payout release,
- manual adjustment,
- fee override,
- seller suspension,
- order cancellation after payment.

## Mobile Strategy

Mobile should prioritize support and triage:

- transaction lookup,
- order status,
- payment status,
- fulfillment status,
- customer and seller contact,
- case assignment,
- internal note,
- escalation.

Complex finance actions may require desktop or enhanced confirmation.
