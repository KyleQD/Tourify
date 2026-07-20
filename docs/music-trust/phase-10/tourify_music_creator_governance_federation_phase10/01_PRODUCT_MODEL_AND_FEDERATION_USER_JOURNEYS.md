# Product Model and Federation User Journeys

## Purpose

Describe the product surfaces for member organizations, creators, delegates, federation reviewers, credential verifiers, researchers, regulators and standards partners.

## Primary workflows

1. Member organization applies and proves legal identity and authority
2. Organization configures reserved powers and approved federation services
3. Creator presents a local membership or mandate credential without exposing unnecessary data
4. Federation routes a request to the correct sovereign organization
5. Organization suspends or withdraws and credentials are updated without deleting history

## Required controls

- User journeys must show which entity acts at every step.
- Public interfaces cannot imply that Tourify or the federation represents a creator.
- Creators receive a plain-language explanation of issuer, scope, expiry, revocation and dispute options.

## Primary records

- `creator_federation_applications`
- `creator_federation_service_enrollments`
- `creator_federation_user_journey_events`

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
