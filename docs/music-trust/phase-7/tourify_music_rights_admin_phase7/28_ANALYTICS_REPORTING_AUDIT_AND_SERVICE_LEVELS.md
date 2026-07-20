# Analytics, Reporting, Audit, and Service Levels

## Purpose

Measure registration quality, claim outcomes, recoveries, false positives, deadlines and partner performance without distorting legal or financial results.

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

- Operational dashboards.
- Artist statements and case histories.
- Partner SLA scorecards.
- False-claim and reversal metrics.
- Audit exports.

## Architecture and source-of-truth rules

- Separate estimated opportunities, submitted claims, accepted claims and cash collected.
- Do not optimize teams for takedown volume alone.
- Quality and reversal rates are primary safety metrics.

## Primary workflows

### Metric production

1. Consume immutable domain events.
2. Aggregate by case type and cohort.
3. Apply data-quality checks.
4. Publish role-scoped dashboard.

### Audit export

1. Select period and scope.
2. Generate manifest and source links.
3. Sign export.
4. Record recipient and purpose.

## Data and state requirements

- Cycle times, acceptance rates, disputes, releases, recoveries, costs, net amounts, deadline compliance and partner exceptions.

## Controls and stop conditions

- Metrics cannot expose another artist’s confidential results.
- No public leaderboard for enforcement volume.

## Existing-system integration

- Reuse Tourify analytics infrastructure but isolate financial/legal data.

## Testing requirements

- Metric reconciliation, late event, deletion/hold and scoped-export tests.

## Exit criteria

- Dashboards reconcile to source cases and Phase 3 ledger.
- Management can detect unsafe automation.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
