# APIs, Events, Background Jobs and Partner Adapters

## Purpose

Define authenticated route handlers, idempotent command APIs, outbox events, workers and external adapters.

## Primary workflows

1. Validate request and authority
2. Persist command and idempotency key
3. Commit domain record and outbox atomically
4. Process background work with retries and dead-letter handling
5. Reconcile partner acknowledgment and compensating action

## Required controls

- No secrets or private keys in clients.
- Partner callbacks require signature verification and replay protection.
- A failed external action cannot be marked complete from a local optimistic state.

## Primary records

- `creator_federation_api_commands`
- `creator_federation_outbox_events`
- `creator_federation_partner_reconciliations`

## Canonical source-of-truth rules

- `artist_music` remains the canonical catalog anchor and is referenced, never duplicated or replaced.
- Rights Passports, licences, administration cases, royalty ledgers and official external records remain authoritative within their own domains.
- Federation records express organization relationships, credentials, mandates and decisions; they do not rewrite underlying rights or member records.
- Every derived record points to a versioned source, issuer, policy, jurisdiction, effective period and immutable audit event.

## Stop conditions

- Required entity, membership, mandate, consent, jurisdiction or governing-body approval is missing, expired, suspended or disputed.
- A requested action would allow one member organization or Tourify to override another organization’s lawful member decision.
- Cross-border data transfer, localization, privacy, security, sanctions, export or competition review is incomplete.
- The action could imply global representation, collective pricing, licensing, bargaining or legal authority that has not been separately granted.

## Existing-system integration

- Use dedicated Phase 10 namespaces and adapters; do not add a second upload, player, entitlement or catalog pipeline.
- Use Next.js App Router route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser` and `jsonError`.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs and append-only audit/outbox records.
- Keep all Phase 10 feature flags disabled by default and require entity plus jurisdiction readiness before activation.

## Required tests

- Default-deny authorization and RLS for every organization, member, delegate, verifier, reviewer, administrator and worker role.
- Idempotent state transitions, webhook replay protection, versioning, revocation and compensating rollback.
- Cross-organization isolation, jurisdiction gates, expiry, suspension and local-sovereignty override prevention.
- Regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Exit criteria

- Audited repository paths, deployed database objects, current provider contracts and named operational owners are recorded.
- Required legal, privacy, competition, cooperative-governance, security and jurisdiction approvals are attached.
- Migrations, generated types, RLS tests, route tests, monitoring and rollback instructions are complete.
- Task-level implementation and verification evidence is recorded in `phase-10-execution-plan.json`.
