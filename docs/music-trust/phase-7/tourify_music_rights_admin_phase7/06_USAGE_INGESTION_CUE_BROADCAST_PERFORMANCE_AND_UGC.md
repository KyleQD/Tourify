# Usage Ingestion: Cue, Broadcast, Performance, and UGC

## Purpose

Ingest usage reports and detection events from licensees, platforms, CMOs, monitoring vendors and Tourify surfaces for claim and collection workflows.

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

- Versioned raw usage files and normalized events.
- Source-specific adapters and reconciliation.
- Deduplication and confidence controls.
- Cue-sheet and AVR+/future adapter readiness.

## Architecture and source-of-truth rules

- Raw source evidence is immutable.
- Normalized usage does not become payable until matched, validated and accepted by the relevant source.
- Platform estimates remain separate from official statements.

## Primary workflows

### Usage intake

1. Receive signed webhook, API pull or file.
2. Verify sender and schema.
3. Store raw payload in restricted storage.
4. Normalize source rows.
5. Deduplicate and quarantine errors.

### Usage resolution

1. Match asset/work and right category.
2. Resolve territory, service and usage period.
3. Create claim candidate or informational event.
4. Reconcile later official report.

## Data and state requirements

- Source, provider account, usage timestamp, territory, service, media, duration, count, asset candidates, status and official-report link.

## Controls and stop conditions

- Reject unsigned or replayed webhooks.
- Do not use estimated UGC views as final royalty amounts.
- Quarantine impossible dates and identifier conflicts.

## Existing-system integration

- Feed accepted payable data to Phase 3 ingestion; keep detection-only records separate.

## Testing requirements

- Replay, duplicate file, late correction, timezone, currency and partial-row tests.

## Exit criteria

- Raw-to-normalized lineage is complete.
- Exceptions can be replayed without double counting.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
