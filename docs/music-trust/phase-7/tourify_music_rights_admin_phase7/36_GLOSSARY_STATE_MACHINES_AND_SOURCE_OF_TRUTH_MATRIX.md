# Glossary, State Machines, and Source-of-Truth Matrix

## Purpose

Provide a shared vocabulary and deterministic state boundaries across administration, registration, claims, enforcement and collections.

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

- Canonical definitions.
- Source-of-truth table by concept.
- Allowed transitions and compensation.
- Status display guidance.

## Architecture and source-of-truth rules

- Terms such as claim, registration, mandate, notice, match, infringement and recovery are not interchangeable.
- External official status and Tourify workflow status remain separate fields.

## Primary workflows

### State transition

1. Validate current version and permitted transition.
2. Write event and updated state transactionally.
3. Trigger outbox.
4. Compensate rather than delete if downstream fails.

## Data and state requirements

- State enum, transition, actor, authority, reason, prior/new version and related source event.

## Controls and stop conditions

- Reject impossible transitions.
- Never derive legal status from UI labels.

## Existing-system integration

- Shared helpers under `lib/music/rights-admin/`; Zod at route boundary.

## Testing requirements

- State-machine unit and concurrency tests.

## Exit criteria

- All teams use the same terms and states.
- Public labels have approved definitions.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
