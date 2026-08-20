# Backend APIs, Services, Events, and Webhooks

## Service Layer

Recommended services:

- `resolveCommerceContext`
- `listCommerceTransactions`
- `getCommerceOverview`
- `getOrderDetails`
- `createOrderNote`
- `evaluateFulfillmentState`
- `issueRefund`
- `createOrUpdateCommerceCase`
- `calculateFeeSnapshot`
- `calculateSellerPayable`
- `verifyPayoutState`
- `retryPayout`
- `reconcileSettlement`
- `processPaymentWebhook`
- `reconcileTicketTransaction`
- `reconcileSubscriptionEntitlement`

## API Envelope

Success:

```json
{
  "data": {},
  "meta": {
    "pagination": null,
    "facets": null,
    "correlation_id": "..."
  }
}
```

Error:

```json
{
  "error": {
    "code": "PAYOUT_NOT_RETRYABLE",
    "message": "This payout is already processing.",
    "recovery": "REFRESH_PROVIDER_STATE",
    "details": {},
    "correlation_id": "..."
  }
}
```

## Idempotency

Required for:

- checkout creation,
- payment capture requests,
- order creation,
- ticket issuance,
- refund,
- payout scheduling,
- payout retry,
- subscription state mutation,
- promotion activation,
- webhook processing.

## Concurrency

Use expected-version checks for:

- order state,
- fulfillment updates,
- refund initiation,
- payout actions,
- case resolution,
- fee configuration,
- seller restrictions.

## Domain Events

Suggested events:

- `checkout.created`
- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `order.created`
- `order.cancelled`
- `fulfillment.created`
- `fulfillment.completed`
- `refund.requested`
- `refund.completed`
- `dispute.opened`
- `fee.snapshotted`
- `seller_payable.created`
- `payout.scheduled`
- `payout.failed`
- `payout.completed`
- `settlement.reconciled`
- `ticket.issued`
- `subscription.changed`
- `commerce_case.created`
- `commerce_issue.created`

## Webhook Security

Every provider webhook must:

- read raw body where required,
- verify signature,
- validate timestamp,
- reject replay,
- store immutable event receipt,
- deduplicate provider event ID,
- process idempotently,
- record result,
- support retry,
- avoid exposing secrets in logs.

## Provider State

Internal actions must re-check provider state before:

- refund,
- payout retry,
- payout release,
- chargeback response,
- subscription correction.

## Bulk APIs

Safe bulk actions may include:

- assign cases,
- hide listings,
- recheck external links,
- export,
- resend safe delivery notifications.

Financial bulk operations require stricter approval or should be prohibited.

## Observability

Track:

- API latency,
- provider latency,
- webhook lag,
- duplicate events,
- reconciliation differences,
- refund failures,
- payout failures,
- authorization denials,
- issue-rule volume,
- queue depth.
