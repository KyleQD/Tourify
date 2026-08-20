# Rollout, Migration, and Rollback

## Feature Flags

Suggested:

- `commerce_context_v2`
- `commerce_overview`
- `commerce_transaction_ledger`
- `commerce_orders_v2`
- `commerce_fulfillment`
- `commerce_payments_v2`
- `commerce_payouts_v2`
- `commerce_cases_v2`
- `commerce_ticketing_finance`
- `commerce_subscriptions_v2`
- `commerce_reconciliation`

## Rollout Stages

### Stage 0 — Audit mode

- Trace current transactions.
- No user-visible change.
- Build integrity reports.

### Stage 1 — Shadow read models

- Build transaction ledger and Overview.
- Compare counts and amounts.
- Log differences.

### Stage 2 — Internal finance pilot

- Internal admins only.
- Read-only new views.
- Validate reconciliation.

### Stage 3 — Controlled write pilot

- Enable notes, case assignment, and low-risk actions.
- Keep financial mutations on legacy path.

### Stage 4 — Finance-action pilot

- Enable refunds or payout controls for approved accounts and staff.
- Monitor idempotency and provider state.

### Stage 5 — Expanded beta

- Enable unified transactions, orders, sellers, and cases.
- Retain legacy fallback.

### Stage 6 — Default-on

- New Commerce Operations becomes default.
- Legacy route remains behind rollback flag.

### Stage 7 — Legacy retirement

Only after:

- amount parity,
- workflow parity,
- provider reconciliation,
- support readiness,
- approved migration plan.

## Rollback Requirements

For each phase document:

- flags to disable,
- routes to restore,
- read models to stop using,
- database additions safe to retain,
- provider actions that cannot be reversed,
- financial records written,
- reconciliation steps,
- customer or seller communication impact.

## Monitoring

- Amount mismatches.
- API error rate.
- Authorization denials.
- PII access.
- Refund failures.
- Payout failures.
- Unknown provider states.
- Ticket issuance mismatch.
- Webhook lag.
- Case SLA.
- Page latency.

## Support Runbooks

- Find transaction.
- Correct order linkage.
- Resolve duplicate payment.
- Repair ticket issuance.
- Repair refund state.
- Verify payout before retry.
- Handle provider outage.
- Resolve seller balance mismatch.
- Handle PII incident.
- Restore legacy route.
