# Commerce Overview and Attention Engine

## Objective

Create an operational command center that explains commercial health, money movement, liabilities, and exceptions.

## KPI Sections

### Sales

- Gross sales.
- Ticket gross sales.
- Marketplace sales.
- Services booked.
- Subscription revenue.
- Promotion revenue.
- Transaction count.
- Average order value.

### Platform Revenue

- Platform fees.
- Ticket fees.
- Subscription revenue.
- Promotion fees.
- Processing fees if treated as revenue or expense.
- Net revenue after refunds.

### Liabilities

- Seller payable.
- Pending payouts.
- Funds on hold.
- Refund liability.
- Disputed amount.
- Negative seller balances.

### Operations

- Paid but unfulfilled orders.
- Failed payments.
- Failed payouts.
- Open refunds.
- Open disputes.
- Moderation cases.
- Unmatched provider events.
- Ticket issuance failures.
- Subscription renewal failures.

## Commerce Issue Model

Suggested fields:

```text
id
scope_type
scope_id
category
rule_code
severity
status
amount_minor
currency
order_id
transaction_id
seller_id
customer_id
event_id
payout_id
case_id
title
description
recommended_action
owner_user_id
due_at
detected_at
resolved_at
resolution
metadata
```

## Initial Rule Categories

- payment,
- order,
- fulfillment,
- refund,
- payout,
- settlement,
- seller,
- listing,
- ticketing,
- subscription,
- moderation,
- webhook,
- data integrity.

## Initial Rules

### Payment

- Captured provider payment without order.
- Order marked paid without captured payment evidence.
- Failed payment with repeated attempts.
- Unmatched webhook event.
- Duplicate provider event.

### Fulfillment

- Paid order unfulfilled beyond SLA.
- Ticket paid but not issued.
- Digital delivery failed.
- Service booking unconfirmed.
- External checkout destination broken.

### Refund

- Refund requested beyond SLA.
- Provider refund succeeded but internal order not updated.
- Internal refund recorded without provider evidence.
- Refund exceeds available amount.

### Payout

- Payout failed.
- Payout destination missing.
- Provider state unknown.
- Seller balance does not reconcile.
- Payout attempted during active dispute.

### Settlement

- Gross minus fees and refunds does not equal seller payable.
- Event ticket settlement incomplete.
- Currency mismatch.
- Orphan ledger entry.

### Seller

- Seller has sales but no payout setup.
- Seller verification incomplete.
- Repeated fulfillment failures.
- Negative balance.

### Subscription

- Payment succeeded but entitlement missing.
- Entitlement active after subscription ended.
- Repeated renewal failure.

## Issue Ranking

Rank by:

- severity,
- amount at risk,
- customer impact,
- seller impact,
- deadline,
- age,
- Event proximity,
- settlement blocking,
- regulatory or policy impact.

## Resolution UX

Every issue must show:

- cause,
- financial amount,
- affected parties,
- related records,
- recommended action,
- owner,
- due date,
- resolution history,
- waiver or escalation controls.
