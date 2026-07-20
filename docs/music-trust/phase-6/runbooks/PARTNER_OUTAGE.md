# Runbook — Licensing Partner Outage

## Scope

Signature, payment, DDEX/CISAC, CMO/PRO, or watermark/delivery partners unavailable.

## Steps

1. Disable affected modules via kill switches (quotes/agreements/delivery/payments/ddex).
2. Leave in-flight agreements in `pending_signatures` / `executed` — do not invent effectiveness.
3. Queue partner events remain in `music_licensing_partner_events` / outbox for replay.
4. Payment status only from verified webhooks after recovery — never client redirects.
5. Escalate counsel if any buyer was shown availability that depended on the failed partner authority.
