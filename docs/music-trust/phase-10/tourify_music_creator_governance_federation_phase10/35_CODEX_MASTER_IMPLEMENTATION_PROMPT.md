# Codex Master Implementation Prompt

## Purpose

Implement Tourify Music Ecosystem Phase 10: Global Creator Governance Federation Readiness through an audit-first, non-destructive and evidence-gated workflow.

## Mandatory first actions

1. Read `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`, `SOURCE_PHASE_9_HANDOFF.md`, every numbered Phase 10 document, the execution-plan schema and all reference files.
2. Copy `phase-10-execution-plan.template.json` to `phase-10-execution-plan.json`.
3. Produce `CURRENT_STATE_AUDIT_RESULTS.md` before modifying code or schema.
4. Record the exact commit, branch, deployed Supabase project, migration head, current flags, provider contracts and all relevant Phase 1–9 paths.
5. Run baseline build, lint, typecheck, unit, route, RLS, worker and regression tests. Record pre-existing failures separately.

## Non-negotiable architecture

- Preserve `artist_music` as the canonical upload/catalog row.
- Preserve private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile playback, marketplace, feed, profile, EPK and analytics.
- Use existing Next.js App Router conventions and route handlers under `app/api/**`.
- Colocate Zod schemas in route files and use `requireApiUser` plus `jsonError`.
- Prefer interfaces, named exports, lowercase dashed filenames and RORO helpers.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs, immutable audit events and transactional outbox patterns.
- Never reset the database or silently overwrite an external, governance, credential, mandate or decision record.

## Federation boundary

Tourify is the platform provider. The federation and every member organization are separately governed entities. A Tourify account, subscription, upload, Rights Passport, Phase 8 consent or Phase 9 cooperative membership does not create federation membership, voting rights, data contribution, representation, mandate, collective licensing or bargaining authority.

Default to local sovereignty. Absence of a delegation means no delegation. A federation policy cannot activate a service for an organization until required local ratification is recorded.

## Credential and mandate requirements

- Treat credentials as verifiable statements, not independent legal authority.
- Verify issuer trust, schema, proof, holder binding, scope, jurisdiction, issue time, expiry, suspension and revocation.
- High-risk actions must also check the live source record.
- Every mandate must specify principal, delegate, service, rights domain, asset or data scope, territory, term, counterparties, approval requirements and subdelegation rule.
- Revocation must propagate to credentials, API authorization, jobs, partner adapters and public verification.

## Stop immediately when

- entity, membership, governance, mandate, consent, data-transfer or jurisdiction authority is unclear;
- an action could override a local creator or member-organization decision;
- a credential standard, issuer, verifier or wallet profile is not approved;
- a cross-border transfer mechanism, localization rule or processor agreement is missing;
- a feature would enable representation, collective licensing, bargaining, coordinated pricing, refusal to deal or transferable membership without separate legal approval;
- a provider contract or official API is absent; or
- a change would weaken existing Tourify music controls.

## Implementation order

1. Audit and baseline.
2. Entity, membership and sovereignty records.
3. Reserved powers and delegation policy.
4. Trust framework and issuer registry.
5. Credential issuance, presentation and status.
6. Mandates and revocation propagation.
7. Governance, voting, ratification and disputes.
8. Cross-border data and jurisdiction modules.
9. Federated research and policy observatory adapters.
10. Service directory and conformance program.
11. Data model, APIs, UI and admin operations.
12. Security, incident response and business continuity.
13. Bilateral sandbox pilot.
14. Independent review and limited production readiness.

## Required verification

- membership versus ordinary Tourify and Phase 9 membership separation;
- local sovereignty and reserved-power enforcement;
- issuer trust, credential proof, expiry, suspension and revocation;
- exact-scope mandate authorization and subdelegation denial;
- RLS isolation across organizations and roles;
- cross-border transfer, localization and onward-transfer stop conditions;
- quorum, veto, ratification, conflicts and appeal flows;
- webhook replay, outbox retries and compensating actions;
- network partition, key compromise and issuer suspension;
- complete existing-music regression suite.

## Completion evidence

Update `phase-10-execution-plan.json` after every task. Record exact files, migrations, generated types, commands, test outputs, screenshots or payloads, reviews, flags, monitoring, rollback and blockers. Do not mark a task complete from intent, mocked UI or unverified assumptions.
