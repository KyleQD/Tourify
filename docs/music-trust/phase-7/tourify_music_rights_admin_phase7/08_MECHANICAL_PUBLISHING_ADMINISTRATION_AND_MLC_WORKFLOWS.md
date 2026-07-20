# Mechanical and Publishing Administration Workflows

## Purpose

Support U.S. digital mechanical registration, claiming, matching and overclaim workflows through artist-controlled exports or approved administration partners.

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

- MLC-ready work registration and share data.
- Claiming and recording-match case support.
- CWR/MWN export versioning.
- Overclaim and catalog-transfer handling.

## Architecture and source-of-truth rules

- Tourify does not impersonate a publisher or administrator without mandate.
- MLC Member Hub and official records remain authoritative.
- PRO registration is distinct from MLC registration.

## Primary workflows

### Work readiness

1. Validate writers, publishers, IPI, shares and recordings.
2. Search existing work records.
3. Choose new registration or share claim.
4. Generate user-reviewed package.

### Matching and overclaim

1. Identify unmatched sound recordings.
2. Submit suggested matches through approved path.
3. Track review.
4. Open overclaim case where totals exceed 100%.

## Data and state requirements

- MLC Song Code, work registration status, controlled collection share, recording links, CWR/MWN version and submission results.

## Controls and stop conditions

- Do not register another party’s share.
- Do not treat recording match as proof of work ownership.

## Existing-system integration

- Use Phase 2 works/claims and Phase 3 mechanical statements.

## Testing requirements

- Self-administered writer, publisher-administered share, duplicate work and overclaim scenarios.

## Exit criteria

- Exports validate against current provider rules.
- User can see exact official versus Tourify status.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
