# Codex Master Implementation Prompt

## Purpose

Give Codex an audit-first, evidence-gated implementation prompt that preserves the current Tourify music stack and applies Phase 9 in controlled stages.

## Primary workflows

1. Copy the template execution plan to a working plan.
2. Complete repository and deployed-schema audit.
3. Replace assumptions with verified paths and types.
4. Implement only approved stages and maintain evidence.
5. Stop on legal/entity/provider blockers rather than inventing authority.

## Required controls

- Codex cannot create a cooperative entity, issue legal opinions or enable collective action.
- Reference SQL and TypeScript are design aids, not production assumptions.
- All flags remain off until acceptance criteria pass.

## Primary records

- `phase-9-execution-plan.json`
## Canonical source-of-truth rules

- `artist_music` remains the catalog anchor; Phase 9 stores references and approved extracts, not replacement catalog rows.
- Rights Passports, Phase 6 licences and Phase 7 administration/enforcement records remain immutable source evidence.
- Phase 8 consent, privacy and benchmark decisions are inputs, but cooperative membership and data contribution require new, separately executed records.
- External research institutions, regulators, standards bodies, CMOs, courts and government registries remain authoritative for their own decisions and filings.
- Every derived dataset, analysis, publication and benefit allocation points to an immutable input manifest and policy version.

## Stop conditions

Stop the workflow when any of the following is true:

- membership, contribution licence, consent, authority or permitted purpose is missing or expired;
- the source dataset cannot be reproduced from an approved lineage manifest;
- the cohort fails minimum-size, independence, concentration, delay or re-identification controls;
- the request would expose current or future competitive strategy, prices, bids, rates or contract positions;
- research ethics, privacy, security, export, IP, competition or jurisdiction review is incomplete;
- an output could be interpreted as legal, tax, investment or coordinated pricing advice;
- the board, member vote, independent committee or outside authority required by policy has not approved the action;
- a member withdrawal, legal hold, regulator request or incident requires processing to pause.

## Existing-system integration

- Consume approved, versioned extracts through adapters or event outboxes; never query confidential operational tables directly from public or researcher-facing routes.
- Do not modify upload, stream, entitlement, player, feed, profile, EPK, marketplace, licensing, rights-administration, royalty or mobile behavior.
- Keep Phase 9 routes under a dedicated namespace and behind feature, jurisdiction and entity-readiness flags.
- Use route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, additive migrations and explicit RLS.
- Use restricted storage, short-lived signed URLs, access logs and output review for all cooperative and research files.

## Required tests

- membership versus ordinary Tourify-account separation;
- purpose-specific contribution and revocation behavior;
- RLS for members, directors, committee reviewers, researchers, administrators and workers;
- small-cohort, concentration, stale-source and re-identification stop conditions;
- default-deny research access and output release;
- competition-sensitive content detection and escalation;
- idempotent external submissions and compensating rollback;
- regression coverage for upload, playback, entitlement, marketplace, feed, profile, EPK, analytics and mobile.

## Completion evidence

Codex may mark this area complete only after it records:

1. audited repository paths and deployed database objects;
2. approved legal/entity/governance assumptions and named operational owners;
3. migrations, generated types, RLS tests and route tests;
4. privacy, ethics, competition, security and jurisdiction review evidence;
5. feature flags, stop conditions, monitoring and rollback instructions; and
6. task-level files changed, commands run, test results and unresolved blockers in `phase-9-execution-plan.json`.

## Paste-ready Codex instruction

You are implementing Tourify Music Ecosystem Phase 9: Creator Data Cooperative and Global Policy Infrastructure Readiness.

### Mandatory first actions

1. Read `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`, `SOURCE_PHASE_8_HANDOFF.md`, every numbered Phase 9 document, the execution-plan schema and the reference files.
2. Copy `phase-9-execution-plan.template.json` to `phase-9-execution-plan.json`.
3. Produce `CURRENT_STATE_AUDIT_RESULTS.md` before changing code or schema.
4. Record the exact repository commit, branch, deployed Supabase project, current migration head, feature-flag implementation and all relevant Phase 1–8 paths.
5. Run the baseline build, lint, typecheck, unit, route, RLS and regression suites. Preserve failures that predate Phase 9 as separately documented blockers.

### Architecture requirements

- Extend the existing Next.js App Router and Supabase architecture.
- Use route handlers under `app/api/**`; do not create a second backend.
- Use colocated Zod schemas, `requireApiUser`, `jsonError`, interfaces, named exports and lowercase dashed filenames.
- Keep data contribution and membership separate from Tourify account/subscription state.
- Keep cooperative/research data in dedicated restricted storage and tables.
- Use event outboxes and background workers for exports, research computations, publication checks and partner delivery.
- Never expose raw cooperative data to client code or researchers.
- Implement default-deny policy functions in shared server modules and test them directly.
- Use additive migrations created with the installed Supabase CLI after auditing real types. Never reset the database.

### Required working files

Maintain throughout implementation:

- `CURRENT_STATE_AUDIT_RESULTS.md`
- `phase-9-execution-plan.json`
- `PHASE_9_DECISION_LOG.md`
- `PHASE_9_RISK_REGISTER.md`
- `PHASE_9_MIGRATION_ROLLBACK.md`
- `PHASE_9_RELEASE_EVIDENCE.md`

### Evidence rule

A task remains incomplete until its execution-plan entry lists actual files changed, migrations, commands, tests, screenshots or logs, review approvals, feature flags, monitoring and rollback. Do not mark placeholders complete.

### Absolute stop conditions

Stop and record a blocker instead of guessing when:

- the cooperative or legal entity is not approved;
- membership, governance, fiduciary, tax or securities decisions are missing;
- a data contribution licence or permitted purpose is ambiguous;
- research ethics, privacy, competition or IP review is required but unavailable;
- a feature would enable collective pricing, representation, licensing, bargaining or lobbying without separate authorization;
- an external provider contract or official API is missing; or
- the proposed change would replace or weaken existing Tourify music controls.

### Final proof

Before declaring Phase 9 readiness complete, prove that all existing upload, signed-stream, access, Jukebox, mobile, marketplace, feed, profile, EPK, certification, Rights Passport, licensing, royalty and rights-administration tests remain green and that all Phase 9 external-action flags remain disabled unless a separate approval package explicitly authorizes them.
