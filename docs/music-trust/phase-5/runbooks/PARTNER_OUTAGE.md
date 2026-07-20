# Runbook — Institutional Partner Outage

## Symptoms

- Fund-admin NAV webhook failures
- Reconciliation exceptions open on NAV/settlement
- Closing stuck awaiting `official_provider_reference`

## Actions

1. Kill affected capability flags.
2. Preserve immutable `music_institutional_partner_events` and outbox rows.
3. Never substitute parallel NAV estimates as official NAV.
4. Retry via `npm run music:institutional-outbox-worker`.
5. Escalate to fund admin / custody / bank partners.
