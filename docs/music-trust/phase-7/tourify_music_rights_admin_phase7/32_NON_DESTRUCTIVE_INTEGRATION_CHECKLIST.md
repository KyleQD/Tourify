# Non-Destructive Integration Checklist

## Purpose

Provide the mandatory checklist Codex and reviewers use before every Phase 7 stage gate.

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

- Repository and deployed-schema audit.
- Additive migrations and RLS review.
- Canonical-path regression evidence.
- Feature flags, kill switches and compensation.

## Architecture and source-of-truth rules

- Documentation assumptions never override audited code.
- Legacy records remain valid.
- Phase 7 can be disabled independently.

## Primary workflows

### Before change

1. Record branch/commit and baseline.
2. Map affected tables/routes/components.
3. Identify source of truth and rollback.

### After change

1. Run migration and RLS validation.
2. Run affected and regression tests.
3. Exercise flag off/on.
4. Record evidence and known limitations.

## Data and state requirements

- Checklist results live in execution tasks and stage reports.

## Controls and stop conditions

- Never reset database.
- Never create parallel player/catalog.
- Never bypass `resolveMusicAccess`.

## Existing-system integration

- Applies to every Phase 7 file and provider integration.

## Testing requirements

- Migration, RLS, storage, API, worker, UI and regression evidence.

## Exit criteria

- Every task has exact files changed and test results.
- All stop conditions and rollback owners are documented.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
