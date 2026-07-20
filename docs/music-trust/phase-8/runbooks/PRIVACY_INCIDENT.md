# Runbook — Privacy Incident

## When
Suspected re-identification, small-cohort leakage, clean-room misuse, or unauthorized peer data exposure.

## Actions
1. Kill `cohorts`, `benchmarks`, `clean_rooms`, and `benchmark_public_publish` flags immediately.
2. Suspend affected dataset versions (`privacy_status=failed`) and revoke published releases.
3. Queue opt-out / revoke outbox events; run `npm run music:rights-intelligence-outbox-worker`.
4. Preserve audit evidence; do not claim data was anonymous without assessment.
5. Escalate to privacy counsel; document re-identification assessment before any re-publish.

## Do not
- Relabel pseudonymized outputs as anonymous
- Re-enable public publish without privacy sign-off
