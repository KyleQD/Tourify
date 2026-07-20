# Enterprise Rights Administration Portal, APIs, and Exports

## Purpose

Provide labels, publishers, managers, administrators and approved partners with scoped bulk workflows without bypassing artist rights or platform controls.

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

- Organization workspaces and delegated roles.
- Bulk imports/exports with dry-run validation.
- Case and SLA dashboards.
- Webhook and API credentials with narrow scopes.

## Architecture and source-of-truth rules

- Enterprise access follows explicit organization and repertoire mandates.
- Bulk actions never bypass validation, review or idempotency.
- Partner systems receive only minimum necessary data.

## Primary workflows

### Enterprise onboarding

1. Verify organization and representatives.
2. Approve service roles and repertoire scope.
3. Issue environment-specific credentials.
4. Test sandbox.

### Bulk operation

1. Upload or submit batch.
2. Validate all rows and show dry run.
3. Approve by authorized user.
4. Process idempotently.
5. Return item-level results and exceptions.

## Data and state requirements

- Organizations, memberships, service roles, repertoire scopes, API clients, credentials, quotas, batches and per-item status.

## Controls and stop conditions

- No organization can access artists outside mandate.
- Rate limit and revoke credentials.
- No service role in browser clients.

## Existing-system integration

- Use Tourify’s current organization/team model after audit.

## Testing requirements

- Cross-organization RLS, revoked mandate, partial batch, replay and quota tests.

## Exit criteria

- Enterprise users can operate at scale without broader access.
- Exports contain source and effective-date metadata.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
