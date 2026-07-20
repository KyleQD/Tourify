# Corrections, Overclaims, Conflicts, and Letters of Direction

## Purpose

Manage data corrections and ownership/administration changes without silently altering prior claims or official records.

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

- Correction cases tied to exact prior versions.
- Overclaim detection and participant resolution.
- Letters of Direction and change-notice workflows where supported.
- Evidence-backed conflict closure.

## Architecture and source-of-truth rules

- A correction is a new assertion, not deletion of the prior assertion.
- Overclaims remain unresolved until affected claimants or an authoritative decision resolves them.
- Tourify does not adjudicate substantive ownership.

## Primary workflows

### Correction case

1. Identify incorrect field and official source.
2. Collect evidence and affected parties.
3. Propose corrected value.
4. Obtain approvals.
5. Submit change.
6. Reconcile response.

### Overclaim case

1. Detect overlapping shares above allowed total.
2. Freeze affected collection allocation.
3. Notify claimants.
4. Collect agreements or official decisions.
5. Submit resolution.
6. Release held amounts through Phase 3.

## Data and state requirements

- Case type, disputed fields, old/new values, affected claims, evidence, approvals, provider correspondence and resolution basis.

## Controls and stop conditions

- No correction can reduce another party’s claim without required authority or official process.
- Funds related to unresolved shares remain held and traceable.

## Existing-system integration

- Reference Phase 2 claims and Phase 3 holds; never edit settled ledger entries.

## Testing requirements

- Concurrent correction, stale version and conflicting approval tests.

## Exit criteria

- Every correction has an immutable before/after record.
- Overclaim states drive deterministic holds and releases.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
