# Runbook — Opt-Out Propagation

## When
User revokes consent or requests opt-out from aggregate/benchmark purposes.

## Actions
1. Mark consent `revoked` via DELETE `/api/rights-intelligence/consents?id=...`.
2. Confirm outbox event `consent.revoked` enqueued.
3. Run `npm run music:rights-intelligence-outbox-worker`.
4. Evaluate releases with `releasesAffectedByOptOut`; revoke/suppress those falling below cohort thresholds.
5. Do not continue using that participant’s observations in new metric runs for revoked purposes.

## SLA target
Propagation intents should be queued immediately; worker drain within operational window.
