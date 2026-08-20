# Fulfillment, Delivery, and Bookings

## Objective

Ensure a paid transaction remains operationally visible until the promised delivery is complete.

## Fulfillment Obligation

Each order item should create or map to a fulfillment obligation with:

- type,
- responsible party,
- due date,
- current state,
- evidence,
- customer visibility,
- seller visibility,
- failure reason.

## Physical Goods States

- Unfulfilled.
- Processing.
- Partially shipped.
- Shipped.
- Delivered.
- Returned.
- Lost.
- Cancelled.

## Digital Goods States

- Pending generation.
- Ready.
- Delivered.
- Accessed.
- Delivery failed.
- Revoked.

## Ticket States

- Reserved.
- Issued.
- Delivered.
- Transferred.
- Checked in.
- Refunded.
- Voided.

## Service States

- Request received.
- Awaiting seller.
- Quoted.
- Accepted.
- Scheduled.
- In progress.
- Completed.
- Disputed.
- Cancelled.

## External Checkout States

- Clicked out.
- Provider state unknown.
- Confirmation imported.
- Link failed.
- Seller follow-up required.

## Fulfillment Queue

Views:

- Paid but unfulfilled.
- Overdue.
- Partial.
- Failed delivery.
- Seller action required.
- Customer action required.
- Ticket issuance failed.
- Service booking unconfirmed.
- Return requested.

## Seller Fulfillment SLA

Track:

- expected handling time,
- due date,
- actual completion,
- overdue duration,
- escalation threshold.

## Evidence

Depending on type:

- tracking number,
- carrier,
- delivery receipt,
- ticket issuance ID,
- digital access event,
- booking confirmation,
- completion acknowledgement.

## Integration

Fulfillment changes must update:

- order state,
- customer notifications,
- seller metrics,
- payout eligibility,
- refund eligibility,
- issue engine,
- audit.
