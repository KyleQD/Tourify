# Phase 7 Definition of Done

## Purpose

Establish the evidence required before Phase 7 can be called implemented, piloted or production-ready.

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

- Functional, security, legal, provider, operations and regression gates.
- No incomplete task is hidden by a stage-level status.
- Known limitations and unsupported territories are explicit.

## Architecture and source-of-truth rules

- Completion is evidence-based.
- Production readiness is separate from code completion.
- External partner availability and contracts are required for live services.

## Primary workflows

### Completion review

1. Validate every execution-plan task.
2. Reconcile migrations and deployed schema.
3. Review security and legal gates.
4. Review pilot metrics.
5. Approve rollout or document blockers.

## Data and state requirements

- Task evidence, test reports, ADRs, migrations, runbooks, provider contracts, legal decisions, pilot results and sign-offs.

## Controls and stop conditions

- No critical security issue.
- No unresolved authorization defect.
- No unreconciled cash.
- No unmonitored statutory deadline.

## Existing-system integration

- All existing Tourify music surfaces remain intact.

## Testing requirements

- Full regression, restore, legal hold, provider outage and incident drills.

## Exit criteria

- All 35 completion requirements in this document are evidenced.
- Phase 8 remains disabled.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
