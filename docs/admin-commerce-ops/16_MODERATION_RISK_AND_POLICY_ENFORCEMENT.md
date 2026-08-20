# Moderation, Risk, and Policy Enforcement

## Objective

Replace a generic moderation queue with typed, accountable case workflows.

## Case Types

- Listing policy.
- Prohibited product.
- Copyright.
- External link.
- Buyer complaint.
- Seller complaint.
- Fulfillment dispute.
- Payment dispute.
- Refund dispute.
- Fraud review.
- Chargeback.
- Seller verification.
- Payout risk.

## Case Fields

- Type.
- Source.
- Priority.
- Severity.
- Status.
- Customer.
- Seller.
- Listing.
- Order.
- Transaction.
- Amount.
- Owner.
- SLA.
- Evidence.
- Internal notes.
- Customer-facing response.
- Seller-facing response.
- Resolution category.
- Financial impact.
- Audit.

## Case Statuses

- Open.
- Assigned.
- In review.
- Waiting on customer.
- Waiting on seller.
- Waiting on provider.
- Escalated.
- Resolved.
- Dismissed.
- Reopened.

## Queue Metrics

API must provide global facets:

- open,
- assigned,
- in review,
- SLA breached,
- high priority,
- amount at risk,
- assigned to me.

Do not calculate queue totals from the currently loaded page.

## Search Safety

Do not interpolate unescaped user text directly into PostgREST filter expressions. Use a validated safe search strategy or dedicated search function.

## Resolution Requirements

Resolve or dismiss should require:

- resolution category,
- rationale,
- evidence status,
- customer outcome,
- seller outcome,
- refund decision,
- payout-hold decision,
- policy action,
- communication status.

## Risk Signals

Potential signals:

- repeated failed payments,
- abnormal refund rate,
- repeated disputes,
- broken external links,
- rapid seller account changes,
- payout destination changes,
- inventory mismatch,
- repeated fulfillment failure.

Risk automation must be explainable and reviewed for bias.
