# Codex Master Implementation Prompt

## Purpose

Implement Tourify Music Ecosystem Phase 11: Global Creator Public Infrastructure Readiness through an audit-first, non-destructive and evidence-gated workflow.

## Mandatory first actions

1. Read `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`, `SOURCE_PHASE_10_HANDOFF.md`, every numbered Phase 11 document, the execution-plan schema and all reference files.
2. Copy `phase-11-execution-plan.template.json` to `phase-11-execution-plan.json`.
3. Produce `CURRENT_STATE_AUDIT_RESULTS.md` before modifying code or schema.
4. Record the exact commit, branch, deployed Supabase project, migration head, current flags, provider contracts, standards profiles and relevant Phase 1–10 paths.
5. Run baseline build, lint, typecheck, unit, route, RLS, worker, security and regression tests. Record pre-existing failures separately.

## Non-negotiable architecture

- Preserve `artist_music` as the canonical upload/catalog row.
- Preserve private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile playback, marketplace, feed, profile, EPK and analytics.
- Use Next.js App Router route handlers under `app/api/**`; colocate Zod schemas and use `requireApiUser` plus `jsonError`.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs, append-only audit events and transactional outbox patterns.
- Never reset the database, replace existing music paths or silently overwrite a public-infrastructure, credential, trust, resolver or governance record.

## Public-infrastructure boundary

Tourify is an optional technology and service provider. A separately approved public-interest entity must steward production public infrastructure. Participation is explicit, portable and revocable. A Tourify account, upload, Rights Passport, certification, federation relationship or cooperative membership does not create a public identifier, credential, data contribution, global mandate, representation, collective-licensing or bargaining authority.

Identifiers are references. Credentials are signed statements. Resolver responses are status views. None independently proves copyright ownership or authorizes licensing, registration, collection, payment, enforcement or legal representation.

## Required design properties

- optional participation and provider portability;
- open, versioned profiles and schemas;
- issuer, verifier, service and schema trust governance;
- public projections separated from confidential source data;
- minimal rights references with source, freshness and dispute status;
- local-organization sovereignty and reserved powers;
- accessible notice, correction, appeal and remedy;
- open-source, reproducible builds and supply-chain attestations;
- multi-provider conformance and migration tests;
- independent funding, governance and anti-capture controls;
- public service levels, incident reporting and continuity plans.

## Stop immediately when

- public-interest entity, governance, funding, procurement, participation, identifier, credential, issuer, verifier or service authority is unclear;
- a requested action would allow Tourify or one organization to override a creator or another organization;
- a public route would expose or directly query confidential operational data;
- a standard profile, trust anchor, provider contract, transfer mechanism, jurisdiction module or security review is missing;
- a feature could imply universal identity, global representation, collective action, coordinated pricing or legal authority;
- an identifier, credential, resolver result, fingerprint or AI score is being treated as ownership or licensing authority; or
- a change would weaken existing Tourify music controls.

## Implementation order

1. Audit and baseline.
2. Separate entity, governance, funding and anti-capture controls.
3. Participation, withdrawal and portability.
4. Optional creator and organization identifiers.
5. Trust registries, credentials, wallets and status.
6. Rights-reference resolver and authoritative-source links.
7. Open protocols, schemas, IPR and conformance.
8. Service directory, public APIs and fair-access controls.
9. Privacy, cross-border, accessibility and human-rights safeguards.
10. Security, key management, transparency logs and resilience.
11. Data model, APIs, UI and operations.
12. Bilateral sandbox with two independent implementations.
13. Independent assessment and limited production approval.

## Required verification

- ordinary Tourify account versus infrastructure participation separation;
- explicit enrollment, withdrawal, export and provider migration;
- identifier control, rotation, deactivation and no-PII public documents;
- issuer trust, credential proof, holder binding, expiry, suspension and revocation;
- resolver source, scope, freshness, dispute and confidentiality controls;
- service-directory neutrality and failover;
- public API projections, quotas, abuse response and version migration;
- RLS isolation and privileged-operator separation;
- cross-border transfer, localization and onward-transfer gates;
- accessibility, assisted service, offline and low-bandwidth use;
- key compromise, registry poisoning, malicious issuer and network partition;
- complete existing-music regression suite.

## Completion evidence

Update `phase-11-execution-plan.json` after every task. Record exact files, migrations, generated types, commands, test outputs, screenshots or payloads, reviews, feature flags, service owners, monitoring, rollback and blockers. Do not mark a task complete from intent, mocked UI, a self-issued credential or an unverified standards assumption.
