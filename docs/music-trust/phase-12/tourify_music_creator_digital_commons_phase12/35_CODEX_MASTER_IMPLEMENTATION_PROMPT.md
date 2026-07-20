# Codex Master Implementation Prompt — Phase 12

You are extending Tourify’s existing music ecosystem with **Phase 12: Global Creator Digital Commons and Multilateral Stewardship Readiness**.

## Mandatory first step

Before changing code or schema:

1. Read every file in `docs/music-trust/phase-12/`.
2. Read the canonical music integration guide and Phase 11 handoff.
3. Audit the actual repository, deployed Supabase schema, migrations, RLS, storage, feature flags, workers, provider contracts and current Phase 1–11 implementation.
4. Produce `CURRENT_STATE_AUDIT_RESULTS.md` using the supplied template.
5. Copy `phase-12-execution-plan.template.json` to `phase-12-execution-plan.json` and replace every `AUDIT_REQUIRED` assumption with verified evidence.
6. Run baseline build, lint, typecheck and tests before implementation. Record pre-existing failures separately.

## Non-negotiable architecture

- Do not create a second music upload, catalog, entitlement or player path.
- Preserve `artist_music`, private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile, marketplace, feed, profile, EPK and analytics behavior.
- Use route handlers under `app/api/**` for commons APIs, colocated Zod schemas, `requireApiUser` and `jsonError`.
- Use additive migrations only. Never reset the database.
- Create new migrations using the installed Supabase CLI after checking `supabase --help` and command-specific help.
- Enable RLS for every table in exposed schemas. Combine role targeting with exact ownership or capability predicates.
- Do not use user-editable metadata for authorization. Do not expose service-role credentials.
- Use security-invoker views or explicit projection tables for public data.
- Keep privileged functions in non-exposed schemas, minimize `SECURITY DEFINER`, revoke default `PUBLIC` execute and add explicit authorization.
- Use append-only audit and outbox records. External writes and webhooks must be idempotent and replay-safe.

## Phase 12 authority boundary

A Tourify account, Phase 11 identifier, credential, Rights Passport, registry entry or resolver response does not create commons participation, copyright ownership, representation, licensing authority, collection authority or payment authority.

Never authorize a high-impact action from a public identifier, cached credential or registry projection alone. Resolve current authority from the applicable source system and exact scope.

Tourify remains an optional provider. Implement every critical component so that it can be exported, rebuilt, operated and verified without Tourify.

## Implementation order

Follow the 16 stages and task dependencies in `phase-12-execution-plan.json`:

1. Audit and baseline.
2. Steward entity and governance.
3. Critical assets and neutral custody.
4. Protocol commons and open-source governance.
5. Independent registries and trust.
6. Participation, identity and credentials.
7. Operators, conformance and continuity.
8. Funding and procurement.
9. Privacy, cross-border and accessibility.
10. Security and resilience.
11. Accountability and anti-capture.
12. Database, APIs and workers.
13. UI, operations and public reporting.
14. Bilateral independent sandbox.
15. Tourify-exit and operator-replacement drills.
16. Limited-production approval and Phase 13 handoff.

## Hard stop conditions

Stop and record a blocker when:

- asset ownership, transfer authority or escrow terms are unclear;
- entity, governance, public approval, funding or operator independence is unresolved;
- a feature would imply compulsory identity, global mandate, collective pricing or legal authority;
- a public route would query confidential operational tables;
- there are not two materially independent implementations for a production-critical protocol;
- a provider contract lacks export, step-in, termination or reconciliation rights;
- cross-border, privacy, accessibility, security or jurisdiction review is incomplete;
- a change would weaken existing music upload, access, playback or rights controls.

## Evidence discipline

After every task, update `phase-12-execution-plan.json` with:

- exact files changed;
- migrations and generated types;
- commands run;
- test names and results;
- screenshots or request/response payloads where applicable;
- security, privacy, accessibility, governance and legal reviews;
- feature flags and jurisdictions;
- service owner, monitoring and response target;
- rollback or compensating action; and
- unresolved blockers.

A task is not complete because a document exists, a mocked UI renders, a self-issued credential verifies, or a single Tourify-hosted service works. Production-readiness requires independent operation, asset custody, multi-provider conformance, transition drills and approved public governance.
