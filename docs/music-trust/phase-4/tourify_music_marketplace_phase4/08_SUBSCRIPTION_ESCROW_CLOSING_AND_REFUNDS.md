# Subscriptions, Escrow, Closing, and Refunds

Subscription funds and securities allocations must remain under the responsible regulated partner and escrow/custody structure.

## Subscription states

`initiated → disclosures_acknowledged → eligibility_confirmed → payment_pending → funds_received → cooling_off_or_review → accepted → allocated → closed`

Exception states: `cancelled_by_investor`, `rejected`, `payment_failed`, `refunded`, `rescinded`, `chargeback_review`, `compliance_hold`.

## Idempotency

Every partner webhook and polling result must be idempotent. Use provider event IDs, immutable raw payload storage, signature verification, monotonic transition checks, and reconciliation jobs. Tourify may not infer acceptance from payment success alone.

## Escrow and refunds

Track the party holding funds, settlement status, cancellation windows, minimum-offering conditions, rolling closing rules, fees, refund method, failed payout remediation, and evidence of returned funds. Tourify must never commingle subscription funds with operating or artist payout balances.

## Oversubscription

Allocation policies—first come, pro rata, issuer discretion, priority tiers, or partner rules—must be disclosed before launch, executed by the authorized system, and auditable. Do not let artists manually favor undisclosed investors.
