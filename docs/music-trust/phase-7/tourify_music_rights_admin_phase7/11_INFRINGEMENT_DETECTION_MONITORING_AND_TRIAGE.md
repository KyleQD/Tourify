# Infringement Detection, Monitoring, and Triage

## Purpose

Detect suspected unauthorized uses across platforms and the web while separating technical matches from legal infringement conclusions.

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

- Multi-source monitoring and deduplication.
- Risk-ranked review queues.
- Authorized-use and exception screening.
- Evidence snapshots and chain of custody.

## Architecture and source-of-truth rules

- Detection creates an observation, not an accusation.
- Fair use/fair dealing and other exceptions require contextual review.
- Monitoring vendors do not receive broader content rights than necessary.

## Primary workflows

### Detection intake

1. Receive URL, fingerprint match or report.
2. Capture timestamped page/media evidence.
3. Link candidate asset and territory.
4. Check known licenses and allowlists.
5. Score for review.

### Triage

1. Reviewer confirms match and use context.
2. Determine informational, authorized, uncertain or actionable status.
3. Select platform claim, notice, outreach, monitor or close.

## Data and state requirements

- Observation source, URL, capture hash, matched segments, confidence, jurisdiction, use context, license check and triage decision.

## Controls and stop conditions

- No automated public accusation.
- Do not retain unrelated personal data.
- Stop monitoring sources that prohibit or cannot lawfully support collection.

## Existing-system integration

- Reuse fingerprints, licenses and public verification records.

## Testing requirements

- False positives, licensed use, commentary, cover, short sample and geo-restricted use tests.

## Exit criteria

- Reviewers can reproduce the detection evidence.
- Every action recommendation records uncertainty and jurisdiction.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
