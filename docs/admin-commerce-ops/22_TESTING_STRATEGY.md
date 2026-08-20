# Testing Strategy

## Unit Tests

- Money formatting.
- Minor-unit arithmetic.
- Currency validation.
- Fee calculation.
- Seller payable calculation.
- Refund eligibility.
- Payout eligibility.
- Status transitions.
- Issue ranking.
- Scope parsing.
- Search escaping.
- CSV safety.

## Service Tests

- Checkout-to-order orchestration.
- Payment capture mapping.
- Fee snapshot creation.
- Ticket issuance reconciliation.
- Refund workflow.
- Payout retry workflow.
- Settlement reconciliation.
- Subscription entitlement reconciliation.
- Case resolution.

## API Tests

For every route:

- unauthenticated rejection,
- unauthorized scope,
- insufficient permission,
- valid success,
- invalid input,
- stale version,
- idempotent repeat,
- provider unknown state,
- structured errors,
- pagination,
- filtering,
- PII field restriction.

## RLS Tests

- Platform admin.
- Finance admin.
- Moderator.
- Support agent.
- Organization manager.
- Event ticketing manager.
- Artist seller.
- Cross-seller rejection.
- Cross-organization rejection.
- Aggregate non-leakage.
- Sensitive table protection.

## Migration Tests

- Clean apply.
- Representative snapshot apply.
- Idempotent backfill.
- Count preservation.
- Currency conversion verification.
- Fee snapshot verification.
- Constraint verification.
- Index verification.
- Policy verification.
- Rollback documentation verification.

## End-to-End Flows

### Marketplace physical order

- Create listing.
- Checkout.
- Payment.
- Order.
- Inventory reservation.
- Fulfillment.
- Seller payable.
- Payout.
- Settlement.

### Ticket purchase

- Reserve ticket.
- Pay.
- Issue ticket.
- Deliver.
- Refund.
- Void.
- Reconcile Event settlement.

### Service booking

- Request.
- Offer.
- Accept.
- Pay.
- Schedule.
- Complete.
- Payout.

### Subscription renewal

- Renewal attempt.
- Payment.
- Entitlement.
- Failure and grace period.
- Cancellation.

### Failed payout

- Simulate failure.
- Verify issue.
- Verify provider state.
- Retry idempotently.
- Reconcile.

### Refund partial failure

- Provider refund succeeds.
- Internal update fails.
- Verify repair issue and no duplicate refund.

### Cross-scope attack

- Read, export, refund, payout retry, and seller mutation attempts against unauthorized scope.

## Accessibility Tests

- Keyboard-only.
- Screen reader.
- Table navigation.
- Confirmation dialogs.
- Focus return.
- Color contrast.
- Mobile zoom.

## Performance Tests

- 100,000 transactions.
- 20,000 sellers.
- 50,000 orders.
- 10,000 payout records.
- Large date ranges.
- Concurrent admin users.
- Webhook bursts.
- Large exports.

## Release Gates

- Lint.
- Typecheck.
- Build.
- Unit tests.
- Service tests.
- API tests.
- RLS tests.
- Migration tests.
- E2E tests.
- Accessibility checks.
- Reconciliation checks.
- Evidence in checklist.
