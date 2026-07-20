# Neighboring Rights Registration and International Collection

## Purpose

Coordinate performer and sound-recording owner registrations, repertoire claims and international mandates for eligible neighboring-right income.

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

- Featured artist, nonfeatured performer and sound-recording owner roles kept distinct.
- Country-of-fixation and first-release metadata.
- International mandate and society routing.
- Duplicate and conflicting repertoire claims.

## Architecture and source-of-truth rules

- Neighboring rights vary by territory and participant category.
- SoundExchange U.S. statutory collections are not composition royalties.
- International collection requires active mandates and partner eligibility.

## Primary workflows

### Enrollment

1. Verify performer/owner identity and role.
2. Validate recordings and ISRCs.
3. Capture territory-specific facts.
4. Execute or link mandate.
5. Submit repertoire.

### Claim and collection

1. Search official repertoire.
2. Claim or correct recordings.
3. Reconcile society confirmations.
4. Import official payments to Phase 3.

## Data and state requirements

- Performer role, owner role, ISRC, country of fixation, first release date, society, mandate, territory and collection status.

## Controls and stop conditions

- Block unsupported territories or categories.
- Prevent one party from claiming both owner and performer shares without evidence.

## Existing-system integration

- Link to sound recordings and Phase 2 party/role data.

## Testing requirements

- Featured/nonfeatured, label-owned, session musician, deceased artist and international mandate tests.

## Exit criteria

- Repertoire can be registered without exposing sensitive identity data publicly.
- Payments retain source-society lineage.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
