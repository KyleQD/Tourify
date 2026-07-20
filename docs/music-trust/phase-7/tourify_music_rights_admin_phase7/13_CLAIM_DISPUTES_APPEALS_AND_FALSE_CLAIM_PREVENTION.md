# Claim Disputes, Appeals, and False-Claim Prevention

## Purpose

Create consistent workflows for disputes involving registrations, UGC claims, collections, ownership, authority and platform actions.

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

- Standard dispute taxonomy and deadlines.
- Independent review tiers.
- Evidence exchange controls.
- False-claim and abuse monitoring.

## Architecture and source-of-truth rules

- The claimant who initiated a platform claim cannot be the sole final reviewer of high-risk appeals inside Tourify operations.
- Substantive ownership disputes are referred to parties, official processes or counsel.

## Primary workflows

### Dispute

1. Open from affected claim or external notice.
2. Freeze affected action or funds where required.
3. Collect evidence and response.
4. Apply review tier.
5. Release, amend, uphold or refer.

### Abuse review

1. Detect repeated unsupported claims.
2. Suspend automation or account authority.
3. Conduct independent review.
4. Require remediation or terminate service.

## Data and state requirements

- Dispute reason, deadlines, evidence disclosures, reviewer conflicts, decision, appeal and related official case IDs.

## Controls and stop conditions

- No retaliation against good-faith disputes.
- Limit evidence access to relevant parties.
- Escalate knowing misrepresentation risk.

## Existing-system integration

- Link Phase 2 disputes, Phase 6 conflicts and platform cases without merging histories.

## Testing requirements

- Concurrent disputes, appeal, conflict-of-interest and abusive claimant tests.

## Exit criteria

- Every claim can be released or corrected through a documented path.
- Abuse metrics and sanctions are auditable.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
