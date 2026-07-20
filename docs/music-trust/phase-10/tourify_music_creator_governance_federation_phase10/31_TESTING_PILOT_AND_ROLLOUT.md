# Testing, Pilot and Rollout

## Purpose

Define audit-only, sandbox, bilateral, limited-federation and production-readiness gates.

## Primary workflows

1. Run architecture and legal readiness audit
2. Test credential and mandate flows in sandbox
3. Pilot two organizations with no external representation
4. Run independent security, privacy and governance assessment
5. Approve limited production services by jurisdiction and feature

## Required controls

- Initial pilot excludes collective licensing, bargaining, global representation, public data pooling and transferable membership.
- Every stage has rollback and stop authority.
- Pilot success is measured by correctness and sovereignty, not user volume.

## Primary records

- `creator_federation_pilots`
- `creator_federation_rollout_decisions`
- `creator_federation_readiness_evidence`

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
