# Data Model, Migrations, RLS, Storage, and Retention

## Purpose

Define additive Supabase objects and security boundaries for administration, claims, enforcement and official-source reconciliation.

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

- Dedicated Phase 7 tables referencing canonical IDs.
- RLS for owners, representatives, operations, legal reviewers and workers.
- Restricted evidence and legal storage.
- Retention, legal hold and deletion controls.

## Architecture and source-of-truth rules

- Do not add a second catalog table.
- Do not expose privileged or sensitive tables through public views.
- Append-only events and compensating records preserve case history.

## Primary workflows

### Migration

1. Audit exact existing types and schemas.
2. Create migration with Supabase CLI.
3. Apply locally or in approved environment.
4. Run advisors and RLS tests.
5. Backfill explicitly behind flag.

### Storage

1. Create restricted buckets/prefixes.
2. Apply owner and service access.
3. Use short-lived signed URLs.
4. Log reads and exports.

## Data and state requirements

- Administration cases, mandates, registrations, external records, usages, claims, notices, disputes, settlements, deadlines, partners, audit events and outbox events.

## Controls and stop conditions

- RLS enabled before grants.
- Views use security_invoker where supported.
- No service-role secret in clients.
- Legal hold overrides routine deletion.

## Existing-system integration

- Reference Phase 2–6 foreign keys after audit; use UUID/type consistency.

## Testing requirements

- RLS matrix, migration rollback/compensation, storage path and retention tests.

## Exit criteria

- Advisors have no unresolved critical finding.
- No cross-artist or cross-organization data access.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
