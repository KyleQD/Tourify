# Subscriptions, Fees, and Promotions

## Subscription Operations

### States

- Trialing.
- Active.
- Past due.
- Grace period.
- Payment failed.
- Scheduled cancellation.
- Cancelled.
- Expired.

### Subscription List

- Subscriber.
- Account type.
- Plan.
- Amount.
- Currency.
- Renewal date.
- Payment state.
- Failed attempts.
- Entitlements.
- Cancellation state.
- Issue count.

### Reconciliation Rules

- Payment succeeded but entitlement missing.
- Entitlement active after cancellation.
- Plan mismatch.
- Duplicate subscription.
- Renewal failed without user notice.
- Grace period expired without entitlement update.

## Fee Rules

Support:

- percentage,
- fixed amount,
- minimum,
- maximum,
- scope,
- seller override,
- product override,
- ticket override,
- promotion override,
- currency,
- effective dates,
- version,
- approval.

Completed transactions must retain an immutable fee snapshot.

## Fee Rule Lifecycle

- Draft.
- Pending approval.
- Active.
- Scheduled.
- Superseded.
- Disabled.

## Promotions Commerce

Track:

- promoter account,
- promoted object,
- campaign,
- budget,
- payment,
- delivery period,
- spend,
- refunds or credits,
- platform revenue,
- campaign state.

## Promotion Reconciliation

- Payment captured but campaign not activated.
- Campaign delivered without captured payment.
- Campaign cancelled with no refund or credit.
- Spend exceeds budget.
- Promotion entitlement mismatch.

## Configuration Audit

Every fee, plan, or promotion-pricing change requires:

- actor,
- reason,
- effective time,
- before and after,
- approval where required,
- impacted future transactions.
