# Validation, Release, and Rollback Runbook

## Validation matrix

| Layer | Required validation |
|---|---|
| Migration | Clean replay, second-run determinism, dry run, checksum, lock review |
| Schema | Objects, columns, types, defaults, constraints, indexes, triggers, functions, grants |
| Data | Counts, nulls, orphans, duplicates, mapping exceptions, checkpoints |
| RLS | Anonymous, owner, collaborator, admins, blocked and unrelated users |
| Functions | Grants, impersonation, caller-controlled IDs, search path, return shape, triggers |
| API | Authn/authz, validation, pagination, stable errors, no raw internals |
| Storage | List/read/insert/update/upsert/delete by allowed and denied personas |
| Application | Unit, contract, integration, E2E, flag off/on, compatibility |
| Performance | Query/request counts, p50/p95, payload, plan, cache, write cost |
| Deployment | Correct target, approved versions, artifact, smoke, monitoring, rollback |

## Critical user journeys

Validate at minimum:

1. Signup, email confirmation, login, refresh, logout, and recovery.
2. Public and restricted profile viewing.
3. Feed, author feed, comments, polls, follows, friends, and blocks.
4. Artist music upload, preview, trust metadata, and playback.
5. Artist merchandise/storefront and external checkout redirect.
6. Released marketplace checkout/request/quote flows.
7. Organization/tour creation and artist/team membership.
8. Job post, application, approval, onboarding, roster, scheduling, worker access.
9. Venue operations and venue-versus-organization boundaries.
10. Admin logistics and tour-event reads/writes.
11. Every active file/image upload.
12. Admin-only, cron, worker, and backfill routes rejecting unauthorized callers.

## Pre-release database checklist

- [ ] Exact project ref matches approved environment registry.
- [ ] Branch/environment matches change record.
- [ ] Backup/PITR readiness confirmed.
- [ ] Dry run reviewed.
- [ ] Migration versions and checksums match approval.
- [ ] No destructive SQL.
- [ ] Lock and timeout analysis complete.
- [ ] Backfill is bounded, resumable, and separately controllable.
- [ ] Feature flag defaults off.
- [ ] RLS/grants are included before exposure.
- [ ] Data and authorization queries are prepared.
- [ ] Alerting and named on-call owner are active.
- [ ] Rollback/forward-fix instructions are prepared.

## Production deployment sequence

1. Merge only after required checks pass.
2. Verify target project and branch.
3. Verify backup/PITR readiness.
4. Run dry run against the intended target.
5. Compare versions/checksums with the change record.
6. Confirm lock and backfill plan.
7. Apply expansion migration.
8. Run schema, smoke, grant, and RLS persona queries.
9. Start bounded backfill.
10. Validate data integrity and advisor deltas.
11. Enable internal/canary cohort.
12. Expand rollout in approved stages.
13. Observe through the defined window.
14. Record final evidence and status.

## Stop conditions

Stop rollout immediately when:

- Project ref or migration checksum differs.
- Dry run proposes an unapproved migration.
- Destructive SQL appears.
- Lock wait or latency crosses the approved threshold.
- Error rate crosses the rollback threshold.
- Any cross-tenant authorization result changes.
- Data count/null/orphan/duplicate checks exceed tolerance.
- Backfill encounters ambiguous mappings not covered by quarantine rules.
- Required monitoring is unavailable.
- A legitimate critical journey is denied after grant/RLS change.

Do not “push through” a failed gate to see whether production stabilizes.

## Rollback model

Production rollback is application-first and forward-fix oriented:

1. Disable the capability flag.
2. Stop the backfill at its checkpoint.
3. Roll back the application deployment to the compatibility path.
4. Revoke a newly added grant if it created exposure.
5. Preserve new additive structures and data.
6. Apply a reviewed forward migration to correct schema/policy behavior.
7. Re-run validation before resuming.

Do not use destructive down migrations against user data.

## Backfill standard

Every backfill must provide:

- Deterministic selection criteria.
- Stable ordering.
- Bounded batch size.
- Checkpoint key.
- Idempotency.
- Retry limits.
- Exception/quarantine table or report.
- Progress metrics.
- Stop command.
- Post-backfill reconciliation.

Ambiguous user/entity mappings are quarantined, never guessed.

## Canary rollout

Recommended stages:

1. Engineering test accounts.
2. Internal admin accounts.
3. Selected low-risk beta accounts.
4. 10% of eligible tenants/users.
5. 25%.
6. 50%.
7. 100%.

Each stage requires the observation interval and metrics specified in the change record. High-risk Auth, finance, rights, or hiring PII work may require narrower cohorts and longer windows.

## Evidence bundle

Retain:

- Pull request and approvals.
- Migration SQL/version/checksum.
- Dry-run result.
- Target verification.
- Build artifact/result.
- Before/after schema and data checks.
- Persona and journey tests.
- Advisor and performance deltas.
- Feature-flag changes.
- Alerts/incidents.
- Rollback readiness.
- Final observation sign-off.

## Release unfreeze

Normal production migration delivery may be re-enabled only after:

- Phases 0–5 exit gates pass.
- Manual target verification is enforced.
- Required CI is enforced.
- Migration dry run and checksums are displayed.
- Named production approval is required.
- Release lead, database lead, security lead, QA lead, and platform lead sign off.
