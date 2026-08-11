# Codex master implementation prompt — Phase 20

You are implementing **Tourify Phase 20: Global Creator Cultural Memory Trust and Deep-Time Commons Readiness**.

This is an audit-first, non-destructive, evidence-gated implementation. Do not begin by creating tables or UI. First prove how the current repository and deployed Supabase project work.

## Controlling files

Read in this order:

1. `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`
2. `SOURCE_PHASE_19_HANDOFF.md`
3. `00_PHASE_20_SCOPE_DEPENDENCIES_AND_BOUNDARIES.md`
4. `CURRENT_STATE_AUDIT_TEMPLATE.md`
5. `59_NON_DESTRUCTIVE_INTEGRATION_CHECKLIST.md`
6. `60_DEFINITION_OF_DONE.md`
7. `phase-20-execution-plan.schema.json`
8. `phase-20-execution-plan.template.json`
9. Every numbered Phase 20 document associated with the current stage
10. `reference/` only after the audit proves where and how its patterns should be adapted

Copy `phase-20-execution-plan.template.json` to `phase-20-execution-plan.json`. That new file is the authoritative implementation ledger. Never replace completed evidence with narrative summaries.

## Mandatory first action

Complete Stage `P20-S0` before making product changes. Record:

- repository commit and branch;
- deployment environments;
- actual Next.js route, component, helper and service paths;
- deployed Supabase tables, views, functions, RLS, grants, storage and workers;
- canonical music and rights source paths;
- existing audit/outbox/idempotency patterns;
- baseline commands and results;
- external providers, contracts, trust anchors and named owners;
- legal, cultural, privacy, archival, funding and governance blockers.

When repository documentation and deployed reality conflict, treat the deployed system as an audit finding. Do not silently choose one.

## Hard architecture rules

- Preserve `artist_music` as the canonical upload/catalog row.
- Preserve the private `artist-music` bucket.
- Preserve `/api/music/stream` → `resolveMusicAccess` → signed URL.
- Preserve `JukeboxProvider`, `useJukebox` and existing mobile playback.
- Do not create another catalog, upload pipeline, player, entitlement system, royalty ledger, Rights Passport or rights-administration source.
- Never reset the database or destructively rewrite existing tables.
- Never query confidential Phase 1–19 tables from public, researcher or verifier-facing routes.
- Never authorize a high-impact action from a public identifier, credential, finding aid or cached projection alone.
- Never infer trust participation, deposit, cultural authority, ownership, access, disclosure, reuse or representation from a Tourify account or prior-phase participation.
- Never describe a proposed entity as a legal trust, public charity, certified repository or recognized institution until the applicable external process is complete.

## Engineering conventions

After audit, use the repository's established equivalents of:

- Next.js App Router handlers under `app/api/**`;
- colocated Zod request/response schemas;
- `requireApiUser` and `jsonError`;
- named exports, TypeScript interfaces, lowercase dashed filenames and receive-object/return-object helpers;
- additive Supabase migrations generated through the installed CLI;
- explicit RLS and grant tests;
- restricted storage and short-lived signed URLs;
- append-only audit events and outbox workers;
- signed external requests/webhooks where supported;
- idempotency, replay protection, reconciliation, dead-letter and compensating actions.

The suggested namespaces are `app/api/creator-cultural-memory-trust/**` and `lib/music/creator-cultural-memory-trust/**`, but use them only when the audit confirms that they fit the real codebase.

## State and evidence requirements

Every durable record must store, directly or through an immutable related record:

- lifecycle state;
- policy version;
- schema or preservation-profile version;
- jurisdiction;
- effective and expiry dates;
- actor authority;
- source manifest;
- idempotency key;
- audit event;
- restriction, dispute, suspension and revocation status.

Keep `draft`, `proposed`, `under_review`, `approved`, `effective`, `suspended`, `revoked`, `withdrawn`, `expired`, `superseded`, `terminated`, `rejected` and `archived` distinct. Do not overload one `active` boolean.

## Implementation order

Work through stages `P20-S0` to `P20-S23` in dependency order. For each task:

1. Confirm dependencies are complete.
2. Re-read the relevant numbered documents.
3. Record the intended files and tests in the execution plan.
4. Implement the smallest non-destructive change.
5. Run targeted tests.
6. Run relevant canonical regressions.
7. Record exact commands, results and evidence.
8. Leave the task blocked when external authority or evidence is missing.

Do not mark a task complete because a placeholder, migration outline or mock exists.

## Database instructions

The SQL under `reference/supabase/migration-templates/` is conceptual. Do not apply it verbatim.

- Audit naming, auth helpers, organization scoping and existing RLS patterns.
- Generate a new timestamped migration through the installed Supabase CLI.
- Use additive tables and columns.
- Write explicit, resumable backfills.
- Validate local and linked environments.
- Regenerate database types.
- Run database lint/advisors where available.
- Test every actor and denial path.
- Document rollback and compensating actions.

## Required first releasable slice

The first slice is sandbox-only and must include:

- one proposed trust record and draft charter;
- explicit voluntary participant and deposit records;
- one cultural-authority record with exact scope;
- synthetic or explicitly contributed preservation content;
- two independent sandbox custodians;
- a validated preservation package and manifests;
- independent export and restore;
- mediated access, denial and appeal;
- restriction propagation;
- repatriation/shared-custody simulation;
- AI-reuse denial;
- provider replacement and Tourify-unavailable operation;
- full canonical regression evidence.

Do not enable compulsory deposit, bulk production ingest, unrestricted discovery, AI training, commercial reuse, public production custody or irreversible asset transfer.

## Stop conditions

Stop and record a blocker rather than inventing an implementation when any of these is missing or stale:

- legal entity or charter authority;
- creator or community authority;
- deposit or reuse permission;
- source lineage or fixity;
- privacy or cultural restriction basis;
- custodian agreement or provider contract;
- funding, staffing, insurance or operational owner;
- security, accessibility or disaster review;
- independent audit or public approval.

## Final closure

Before proposing activation:

- complete the current-state audit;
- satisfy `60_DEFINITION_OF_DONE.md`;
- run all stage and regression tests;
- prove independent custodian restore, provider replacement, dissolution survival and Tourify-unavailable operation;
- attach legal, cultural, archival, privacy, security and accessibility reviews;
- update monitoring, incident, rollback and decommissioning runbooks;
- record every unresolved blocker;
- generate the Phase 20 approval package;
- keep all feature flags disabled unless the exact scoped activation gate is approved.
