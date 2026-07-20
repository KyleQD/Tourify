# Runbook — Regulated Partner Outage

## Symptoms

- Webhook signature failures or timeout spikes
- Subscription/order status stuck in `submitted_to_partner`
- Position reconciliation `pending` / `break`
- Market-data ticks stale

## Actions

1. Freeze new Tourify-side submissions for affected capability via kill switches.
2. Preserve immutable `music_marketplace_partner_event_receipts` and outbox rows.
3. Do not invent ownership, escrow, or execution state in Tourify.
4. Poll partner status pages / ops contacts; retry outbox with backoff (`music:marketplace-outbox-worker`).
5. Escalate settlement/position breaks to transfer agent / ATS as applicable.
6. Communicate investor/issuer status without liquidity or return promises.

## Recovery

Resume only after partner confirms catch-up and reconciliation matched.
