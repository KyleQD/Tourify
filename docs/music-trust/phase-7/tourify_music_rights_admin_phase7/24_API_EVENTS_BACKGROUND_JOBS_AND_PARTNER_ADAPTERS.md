# APIs, Events, Background Jobs, and Partner Adapters

## Purpose

Define versioned route handlers, domain events, outbox processing and external adapters for Phase 7.

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

- Route handlers under `app/api/**`.
- Colocated Zod schemas and standard auth helpers.
- Idempotent outbox jobs.
- Signed and replay-protected partner webhooks.

## Architecture and source-of-truth rules

- Request threads do not wait for registry/platform processing.
- Every external action records request, response and reconciliation.
- Provider adapters cannot mutate canonical history directly.

## Primary workflows

### API mutation

1. Authenticate and authorize.
2. Validate payload and optimistic version.
3. Write domain transaction and audit event.
4. Enqueue outbox.
5. Return stable case status.

### Worker

1. Lease job.
2. Resolve current mandate and stop conditions.
3. Send idempotency key.
4. Store response.
5. Retry or dead-letter.
6. Emit reconciliation event.

## Data and state requirements

- Versioned endpoints for mandates, registrations, matches, claims, notices, disputes, settlements, deadlines, partners and exports.

## Controls and stop conditions

- Dead-letter after bounded retries.
- Circuit breaker for provider incidents.
- Secrets server-side only.

## Existing-system integration

- Use existing route helpers, notifications and worker conventions.

## Testing requirements

- Authorization, stale version, replay, timeout, duplicate callback and dead-letter tests.

## Exit criteria

- Jobs can be replayed safely.
- Provider outage does not corrupt local state.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
