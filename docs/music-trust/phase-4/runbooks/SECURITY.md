# Runbook — Marketplace Security

## Hard prohibitions

- No Tourify private keys, seed phrases, or custody wallets
- No raw KYC / tax / accreditation document storage in ordinary app tables
- No Tourify matching engine, escrow account, or internal wallet balance

## Controls

- Partner webhooks: signature verify, immutable receipt, idempotency
- RLS owner/investor scoped tables; service_role for workers
- Private storage buckets: disclosures, statements, evidence, comms
- Feature flags as kill switches
- Admin dual-control for destructive ops

## Incident steps

1. Rotate webhook secrets and disable unsigned mode.
2. Kill affected flags.
3. Audit `music_marketplace_partner_event_receipts` and `admin_actions`.
4. Engage counsel + partners; preserve evidence.
