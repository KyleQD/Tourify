# Codex Master Implementation Prompt — Tourify Music Phase 8

You are implementing **Phase 8: Global Rights Intelligence and Collective Negotiation Readiness** inside the existing Tourify repository.

## Required first actions

1. Install this package at `docs/music-trust/phase-8/`.
2. Read every numbered Markdown file, `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`, `SOURCE_PHASE_7_HANDOFF.md`, this prompt, the JSON Schema and execution-plan template.
3. Copy `CURRENT_STATE_AUDIT_TEMPLATE.md` to `CURRENT_STATE_AUDIT_RESULTS.md` and complete it from the actual repository, deployed Supabase schema, current provider contracts and approved legal/operations decisions.
4. Copy `phase-8-execution-plan.template.json` to `phase-8-execution-plan.json`. Replace `AUDIT_REQUIRED` assumptions with verified findings.
5. Record branch and commit. Run and record baseline build, lint, typecheck, tests, Supabase migration status and advisors before changing code.
6. Do not begin production implementation until Stage S0 audit and governance tasks have evidence.

## Canonical integration rules

- Reuse `artist_music`, private `artist-music` storage, `/api/music/stream`, `lib/music/music-access.ts`, Jukebox and the existing mobile player.
- Phase 8 consumes approved Phase 7 events and reconciled mirrors. It never rewrites source cases, Rights Passports, licences, royalty ledgers or official external records.
- Use additive migrations created with the installed Supabase CLI. Never reset the database.
- Use Next.js App Router route handlers under `app/api/**`, colocated Zod, `requireApiUser` and `jsonError`.
- Prefer interfaces, named exports, function declarations and lowercase-dash filenames.
- Use existing notifications, feature flags, jobs, admin capabilities and audit patterns after auditing them.
- Do not create a second global state store or music player.

## Product boundary

Phase 8 may ship private education and privacy-approved historical aggregate benchmarks. It may not ship:

- coordinated prices, minimums, rate recommendations or standardized commercial terms;
- current or future identifiable competitor information;
- automated contract or legal advice;
- external negotiation, collective licensing, representation, boycotts or demands without a separate approved legal/entity/mandate package;
- punishment, ranking changes or reduced service for nonparticipants;
- a claim that pseudonymized data is anonymous without assessment.

All negotiation groups start as `readiness_only`, with `external_action_enabled = false`. A feature flag is never a substitute for legal authority.

## Execution-plan discipline

- Work in dependency order.
- Update task status as work proceeds.
- A task may be `complete` only when `evidence`, `filesChanged` and `tests` contain real entries and all blockers are removed.
- Record deviations and newly discovered tasks in the JSON rather than silently reducing scope.
- Validate the JSON against `phase-8-execution-plan.schema.json` after updates.
- Do not mark a stage complete if a child task is incomplete or blocked.

## Privacy and competition gates

Before any benchmark release, prove:

1. active purpose-specific consent;
2. approved source and dataset versions;
3. minimum participants and independent controllers;
4. dominance, recency, outlier and small-cell controls;
5. re-identification and repeated-query testing;
6. privacy review;
7. competition review;
8. methodology and quality review;
9. historical/descriptive disclosure with no recommendation;
10. revocation and downstream purge capability.

Before any group activity, prove group type, participant roles, jurisdiction, counsel, allowed topics, prohibited topics, voluntary participation, non-retaliation, facilitator controls and external-action disablement. Representation requires a separately executed exact-scope mandate.

## Required implementation sequence

Follow the 15 stages and 207 tasks in `phase-8-execution-plan.json`. Begin with private diagnostics and education. Do not use a real negotiation or collective-licensing counterparty in the initial pilot.

## Verification commands

Discover actual commands from `package.json`, repository scripts and `supabase --help`. At minimum, record evidence for build, lint, typecheck, unit tests, route tests, RLS tests, migration validation, Supabase advisors, privacy attack tests, competition-output tests and canonical music regressions.

## Completion response

Return:

- audited architecture findings;
- exact files and migrations changed;
- database objects and RLS policies;
- tests and results;
- feature flags and rollout state;
- privacy and competition review status;
- unresolved blockers and external approvals;
- rollback instructions;
- path to the updated `phase-8-execution-plan.json`.

Never claim that collective negotiation, representation, labor exemption, collective licensing or anonymization is approved unless the corresponding executed documents and evidence are present.
