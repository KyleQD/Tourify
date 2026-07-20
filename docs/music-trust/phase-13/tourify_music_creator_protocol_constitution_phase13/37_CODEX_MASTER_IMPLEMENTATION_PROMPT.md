# Codex Master Implementation Prompt — Phase 13

You are extending Tourify with **Phase 13: Global Creator Protocol Commons and Constitutional Stewardship Readiness**.

## Mandatory first step

1. Read every file in `docs/music-trust/phase-13/`.
2. Read the canonical music integration guide and Phase 12 handoff.
3. Audit the actual repository, deployed Supabase schema, migrations, RLS, storage, feature flags, workers, provider and custodian contracts, Phase 1–12 implementation, asset ownership and public approvals.
4. Produce `CURRENT_STATE_AUDIT_RESULTS.md` from the template.
5. Copy `phase-13-execution-plan.template.json` to `phase-13-execution-plan.json` and replace every `AUDIT_REQUIRED` assumption with verified evidence.
6. Run baseline build, lint, typecheck and tests before changing code. Record pre-existing failures separately.

## Non-negotiable architecture

- Do not create a second music upload, catalog, entitlement or player path.
- Preserve `artist_music`, private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile, marketplace, feed, profile, EPK and analytics.
- Use `app/api/creator-protocol-constitution/**`, colocated Zod schemas, `requireApiUser` and `jsonError`.
- Use additive migrations only. Never reset the database.
- Enable RLS on every table in exposed schemas and validate exact role/capability predicates.
- Use restricted evidence storage and explicit public projections.
- Use append-only audit and outbox records. External writes and webhooks must be signed where applicable, idempotent, replay-safe and reconciled.

## Constitutional boundary

A Tourify account, identifier, credential, Rights Passport, registry entry, compact listing or public resolver result does not create constitutional membership, copyright ownership, representation, licensing, collection, payment or enforcement authority.

Fundamental provisions cannot be changed through a software deploy, schema migration, operator configuration or ordinary-majority decision. Exact-scope current authority must be resolved from authoritative source records at execution time.

## Implementation order

Follow the 17 stages and dependencies in `phase-13-execution-plan.json`:

1. Audit, source-of-truth and baseline.
2. Entity and constitutional charter.
3. Membership, ratification and withdrawal.
4. Fundamental rights, sovereignty and reserved powers.
5. Amendment classification and decision rules.
6. Public deliberation, objections and independent review.
7. Protocol covenant, licensing and conformance.
8. Trust roots, identifiers and rights references.
9. Assets, custody and fiscal constitution.
10. Operators, succession, forks and continuity.
11. Interoperability compacts and jurisdiction modules.
12. Security, emergency powers and incident remedy.
13. Database, APIs, workers and projections.
14. UI, admin operations, accessibility and observability.
15. Bilateral constitutional sandbox.
16. Public ratification, Tourify-exit and replacement drills.
17. Limited-production activation and Phase 14 handoff.

## Hard stops

Stop and record a blocker when entity authority, ratification, local sovereignty, asset ownership, funding, provider contracts, independent review, standards profile, jurisdiction, privacy, security or accessibility is incomplete; when a feature implies universal identity or global representation; when a public route would expose restricted data; or when the change weakens existing music or rights controls.

## Evidence discipline

After each task update `phase-13-execution-plan.json` with exact files, migrations, generated types, commands, test results, reviews, operational owners, monitoring, rollback and unresolved blockers. A document, mocked UI, self-issued credential or single Tourify-hosted service is not production evidence.
