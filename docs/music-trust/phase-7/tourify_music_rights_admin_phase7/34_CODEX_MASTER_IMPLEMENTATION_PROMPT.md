# Codex Master Implementation Prompt — Tourify Global Rights Administration and Enforcement Phase 7

## Purpose

Provide the controlling prompt Codex must follow when implementing Phase 7 in the audited Tourify repository.

## Phase boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve the existing private `artist-music` bucket, stream route, `resolveMusicAccess`, Jukebox, mobile player, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database. Use additive migrations, explicit backfills, versioned records, feature flags, audit events and compensating actions.
- A Rights Passport is evidence. It is not an administration mandate, collection authority, litigation authorization or platform-claim entitlement.
- Separate composition, sound recording, performer/neighbouring, name/likeness/voice, lyrics, artwork, trademark, union/reuse and privacy rights.
- External registries, CMOs, administrators, platforms and courts remain authoritative for their own records. Tourify stores reconciled, versioned mirrors and submission evidence.
- Default to manual review when authority, identity, shares, territory, term, exclusivity, claim policy, registration status or evidence is incomplete, disputed or expired.
- No automated takedown, monetization claim, ownership assertion or legal threat may be sent solely from fingerprint similarity, metadata matching or AI confidence.
- Every external submission, correction, claim, notice, dispute, recovery and status update must be idempotent, signed where applicable, versioned and auditable.

## Required outcomes

- Audit first.
- Maintain JSON execution plan.
- Implement in dependency order.
- Attach evidence before completion.

## Architecture and source-of-truth rules

- All Markdown files are approved scope.
- Canonical integration guide governs current music architecture.
- Actual repository and deployed schema override templates.

## Primary workflows

### Mandatory start

1. Record branch and commit.
2. Complete audit results.
3. Run baseline tests.
4. Copy and resolve execution plan.
5. Stop on unsupported legal/provider assumptions.

## Data and state requirements

- Execution plan status, tasks, dependencies, evidence, blockers, files and tests.

## Controls and stop conditions

- Never batch-complete tasks.
- Never claim production readiness without external gates.

## Existing-system integration

- Use existing stack conventions and route helpers.

## Testing requirements

- Schema validation and stage-gate reports.

## Exit criteria

- Codex produces all required final reports and updated plan.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.

## Mandatory implementation instructions

1. Record current branch and commit.
2. Complete `CURRENT_STATE_AUDIT_RESULTS.md` from the actual repository and deployed Supabase project.
3. Audit Phases 1–6 as implemented, including provider contracts and operational ownership.
4. Run baseline build, lint, typecheck and test commands; record existing failures.
5. Copy `phase-7-execution-plan.template.json` to `phase-7-execution-plan.json`; replace every `AUDIT_REQUIRED` value with audited facts.
6. Validate the plan against `phase-7-execution-plan.schema.json`.
7. Follow task dependencies; never batch-complete tasks.
8. For each task record exact scope, files changed, migrations, RLS tests, route tests, worker tests, evidence, blockers, feature flags and rollback.
9. Stop on missing mandates, unsupported provider contracts, unresolved legal role decisions, unsafe automation, unreconciled funds or failed security gates.
10. Produce final ADRs, audit, migration/RLS report, security report, provider conformance report, pilot report and rollout/rollback runbook.

## Required stage gates

- S0 audit, source-of-truth, legal role map and baseline
- S1 mandates, parties, partner coverage and data model
- S2 registration and official-source reconciliation
- S3 matching, corrections, overclaims and transfers
- S4 usage ingestion and royalty claim preparation
- S5 mechanical/publishing and neighboring-right administration
- S6 platform fingerprint claims and authorized-use policies
- S7 monitoring, evidence and infringement triage
- S8 DMCA, disputes, appeals and legal escalation
- S9 settlements, recoveries, reversion and global optimization
- S10 APIs, UI, enterprise workflows and notifications
- S11 operations, security, analytics, incidents and runbooks
- S12 pilot, hardening, rollout and rollback
- S13 Phase 8 handoff and final evidence package

## Required production evidence

- No external submission lacks an active mandate and exact rights scope.
- No technical match alone sends a takedown or monetization claim.
- No official-source mirror silently overwrites prior data.
- No recovered money bypasses Phase 3 accounting, tax and payout controls.
- No unauthorized cross-artist, cross-organization or cross-case data access.
- DMCA deadlines and designated-agent renewal are monitored.
- Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics and mobile tests remain green.
- Every provider webhook and job is signed, idempotent and replay-protected.
- Feature and provider kill switches work without deleting evidence.
