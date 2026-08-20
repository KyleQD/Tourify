# Orders and Order Details

## Order List Redesign

### Required columns

- Order number.
- Created date and timezone.
- Source.
- Customer.
- Seller.
- Summary.
- Gross total.
- Currency.
- Payment state.
- Fulfillment state.
- Refund state.
- Payout state.
- Risk state.
- Issue count.
- Last action.

### Filters

- Date.
- Source.
- Payment.
- Fulfillment.
- Refund.
- Payout.
- Seller.
- Customer.
- Event.
- Currency.
- Amount.
- Risk.

### Pagination

Use server-side cursor or stable offset pagination. Do not load a fixed 50-record set without visible navigation.

### Error handling

Never translate an API failure into an empty order list.

Required states:

- empty,
- loading,
- forbidden,
- error,
- partial data,
- stale,
- schema unavailable.

## Item Counting

Display:

- line-item count,
- total unit count.

Do not label line count as total item quantity.

## Order Detail Tabs

### Summary

- Order number.
- Source.
- Created.
- Amount.
- Status summary.
- Issues.

### Timeline

- Checkout created.
- Payment authorized.
- Payment captured.
- Order created.
- Inventory reserved.
- Seller notified.
- Fulfillment events.
- Refunds.
- Payout events.
- Case actions.

### Parties

- Customer snapshot.
- Seller snapshot.
- Linked live account.
- Contact controls.
- Verification.
- Payout readiness.

### Items

- Product.
- Variant.
- Quantity.
- Unit price.
- Discount.
- Tax.
- Line total.
- Fulfillment.

### Payment

- Provider.
- Payment intent or equivalent.
- Checkout reference.
- Attempts.
- Failure codes.
- Captured amount.
- Refunds.
- Webhook receipts.

### Fulfillment

- Obligations.
- Seller action.
- Tracking.
- Delivery.
- Ticket issuance.
- Booking state.
- External handoff.

### Fees

- Platform fee.
- Fixed fee.
- Percentage.
- Processing fee.
- Rule version.
- Overrides.

### Payouts

- Seller payable.
- Holds.
- Payouts.
- Provider reference.
- Reconciliation.

### Cases and Notes

- Internal notes.
- Customer support cases.
- Moderation cases.
- Disputes.

### Audit

- Actor.
- Action.
- Reason.
- Before and after.
- Correlation ID.
- Provider result.

## Controlled Actions

- Add internal note.
- Contact customer.
- Contact seller.
- Resend delivery.
- Mark fulfillment state with evidence.
- Cancel where allowed.
- Issue refund.
- Place payout hold.
- Escalate case.

Each action must validate current state and permissions.
