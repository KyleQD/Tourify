# Testing, Pilot, and Rollout

## Purpose

Define a staged launch that proves safety, correctness, data quality and operations before external automation or broad availability.

## Phase boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve the existing private `artist-music` bucket, stream route, `resolveMusicAccess`, Jukebox, mobile player, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database. Use additive migrations, explicit backfills, versioned records, feature flags, audit events and compensating actions.
- A Rights Passport is evidence. It is not an administration mandate, collection authority, litigation authorization or platform-claim entitlement.
- Separate composition, sound recording, performer/neighbouring, name/likeness/voice, lyrics, artwork, trademark, union/reuse and privacy rights.
- External registries, CMOs, administrators, platforms and courts remain authoritative for their own records. Tourify stores reconciled, versioned mirrors and submission evidence.
- Default to manual review when authority, identity, shares, territory, term, exclusivity, claim policy, registration status or evidence is incomplete, disputed or expired.
- No automated takedown, monetization claim, ownership assertion or legal threat may be sent solely from fingerprint similarity, metadata matching or AI confidence.
- Every external submission, correction, claim, notice, dispute, recovery and status update must be idempotent, signed where applicable, versioned and auditable.

## Required outcomes

- Comprehensive automated test matrix.
- Shadow-mode matching.
- Limited provider pilots.
- Artist cohort and operations training.
- Rollback and restore drills.

## Architecture and source-of-truth rules

- Begin with export/manual submission before live adapters.
- Automation expands only after false-positive and reversal thresholds are met.
- Each territory/provider requires its own gate.

## Primary workflows

### Pilot

1. Select verified catalogs and diverse rights structures.
2. Run shadow diagnostics.
3. Approve limited submissions.
4. Measure acceptance, disputes and recoveries.
5. Collect participant feedback.

### Rollout

1. Enable by feature flag, account, service, provider and territory.
2. Monitor safety and SLA.
3. Pause automatically on thresholds.
4. Expand only after gate approval.

## Data and state requirements

- Pilot cohort, consent, baseline, test results, metrics, incidents, go/no-go decisions and rollback evidence.

## Controls and stop conditions

- No production automation without signed partner/legal approval.
- Stop on unauthorized access, excessive false claims, unreconciled funds or missed statutory deadlines.

## Existing-system integration

- Existing upload, playback, marketplace, Phase 2–6 and mobile tests remain mandatory.

## Testing requirements

- Unit, route, RLS, worker, partner contract, E2E, security, accessibility, load, restore and incident tests.

## Exit criteria

- Pilot results meet approved thresholds.
- Rollback disables external actions without data loss.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
