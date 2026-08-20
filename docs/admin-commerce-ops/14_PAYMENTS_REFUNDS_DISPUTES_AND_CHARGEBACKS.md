# Payments, Refunds, Disputes, and Chargebacks

## Payment Attempt Model

Required fields:

- provider,
- provider reference,
- checkout attempt,
- order,
- amount,
- currency,
- state,
- failure code,
- failure message,
- customer snapshot,
- idempotency key,
- created,
- updated,
- captured amount,
- refunded amount.

## Payment States

- Created.
- Requires action.
- Authorized.
- Captured.
- Failed.
- Cancelled.
- Partially refunded.
- Refunded.
- Disputed.
- Chargeback.
- Unknown.

## Provider Event Timeline

Display:

- signature verification,
- event ID,
- received time,
- processed time,
- matched object,
- processing result,
- retry count,
- duplicate detection.

## Refund Workflow

1. Load current provider payment state.
2. Calculate refundable amount.
3. Show previous refunds.
4. Select full or partial refund.
5. Select line items or amount.
6. Require reason.
7. Show seller-balance impact.
8. Show fee treatment.
9. Show ticket, access, or fulfillment impact.
10. Preview communication.
11. Verify permission and threshold.
12. Execute idempotently.
13. Persist provider result.
14. Update internal states.
15. Audit.
16. Create issue if reconciliation is uncertain.

## Disputes

Track:

- customer claim,
- seller response,
- transaction,
- amount,
- evidence,
- deadline,
- payout hold,
- refund decision,
- outcome.

## Chargebacks

Dedicated queue:

- provider case,
- amount,
- reason,
- response deadline,
- evidence requirements,
- submission status,
- seller impact,
- platform exposure,
- outcome.

## Duplicate Charge Protection

- Idempotent checkout.
- Provider idempotency keys.
- Duplicate event detection.
- Customer-facing support workflow.
- Reconciliation rule.

## Approval Thresholds

Configurable controls:

- support refund limit,
- finance refund limit,
- dual approval threshold,
- manual adjustment threshold.
