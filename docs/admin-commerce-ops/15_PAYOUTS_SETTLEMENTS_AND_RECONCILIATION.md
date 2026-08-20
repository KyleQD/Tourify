# Payouts, Settlements, and Reconciliation

## Seller Balance Model

Components:

- gross sales,
- discounts,
- refunds,
- disputes,
- platform fees,
- processing fees,
- adjustments,
- held amount,
- paid amount,
- available amount.

## Payout States

- Not eligible.
- Pending.
- Scheduled.
- Processing.
- Paid.
- Failed.
- On hold.
- Reversed.
- Cancelled.
- Unknown provider state.

## Payout Readiness

Validate:

- seller verified,
- destination active,
- supported currency,
- minimum threshold,
- no blocking dispute,
- balance available,
- provider status current,
- tax or compliance requirements complete.

## Safe Retry Workflow

1. Re-fetch provider state.
2. Verify no successful or processing transfer exists.
3. Load internal ledger state.
4. Show seller and destination.
5. Show amount and currency.
6. Show failure reason.
7. Show previous attempts.
8. Require reason.
9. Require permission.
10. Use idempotency.
11. Execute or schedule.
12. Store provider result.
13. Audit.
14. Create issue if state remains uncertain.

## Holds

Hold reasons:

- active dispute,
- verification problem,
- negative balance,
- suspected fraud,
- fulfillment failure,
- provider restriction,
- manual finance review.

Hold records require:

- amount,
- reason,
- actor,
- created,
- release condition,
- expiration where applicable,
- audit.

## Settlement

A settlement should group:

- source transactions,
- fees,
- refunds,
- adjustments,
- seller payables,
- payouts,
- Event or seller scope,
- currency,
- reconciliation status.

## Reconciliation Equation

```text
Gross captured
- discounts
- refunds
- processor fees
- platform fees
+ approved adjustments
= seller payable
```

Then:

```text
Seller payable
- holds
- prior payouts
= available payout balance
```

## Reconciliation States

- Not started.
- In progress.
- Reconciled.
- Difference found.
- Provider state unknown.
- Manual review.

## Reports

- Seller statement.
- Event ticket settlement.
- Platform fee report.
- Payout report.
- Refund report.
- Reconciliation exception report.
- Currency report.
