# First 30 Days Execution Plan

This schedule assumes a small cross-functional team. Parallel work is encouraged only where dependencies permit.

## Days 1–2 — Freeze and identity

### Deliverables

- Confirm production Supabase project.
- Record environment matrix.
- Disable automatic production migration push.
- Pin Supabase CLI.
- Assign accountable owners.
- Establish tracker and release posture.

### Tasks

`P0-001`–`P0-004`, `P0-010`

### Gate

No database write before project identity is proven.

## Days 2–4 — Preserve evidence and remove debug artifacts

### Deliverables

- Schema/history/grants/advisor/error/bucket baseline.
- Backup/PITR readiness record.
- Local migration ledger.
- Localhost feed ingest removed.
- Production-debug scan required in CI.

### Tasks

`P0-005`–`P0-009`, `OBS-001`–`OBS-003`

### Gate

Evidence is immutable and scanner is green.

## Days 3–6 — Close immediate privacy/security gaps

### Deliverables

- Approved post visibility matrix.
- Shared parent visibility helper.
- Comments GET authorized.
- Bulk author/profile loading.
- Safe public errors.
- Caller map for eight anonymous privileged functions.
- Reviewed grant-containment migration prepared and tested.

### Tasks

`API-001`–`API-005`, `SEC-001`–`SEC-005`

### Gate

Restricted comments cannot be disclosed; intended function callers still work.

## Days 4–7 — Runtime containment and test harness

### Deliverables

- Ranked runtime error register.
- Server-side capability flags.
- Stable unavailable/error contracts.
- Alerts for schema/permission/return mismatches.
- Cron contract approved.
- `server-only` test environment standardized.
- Vitest decision sheet.

### Tasks

`RUN-001`–`RUN-004`, `TST-001`–`TST-003`

## Week 2 — Reconciliation ledger and canonical decisions

### Deliverables

- Local/remote merged migration ledger.
- Two timestamp collisions resolved by object effect.
- Destructive/backfill/external-assumption annotations.
- Live-object lineage report.
- Domain-by-domain live/code diff.
- Active/gated/legacy classification.
- Data preservation rules.

### Tasks

`DB-001`–`DB-010`

### Gate

No migration-history repair while any effect remains unclassified.

## Week 3 — Disposable baseline and contract tooling

### Deliverables

- Isolated recovery environment.
- Approved baseline SQL.
- Two deterministic clean replays.
- Database/RLS/grant/advisor test bundle.
- Generated TypeScript types.
- Static contract manifest.
- CI comparison prototype.

### Tasks

`DB-011`–`DB-017`, `CON-001`–`CON-003`

### Gate

Another engineer can reproduce the baseline from a clean environment.

## Week 4 — First domain convergence candidates

Prioritize based on live error counts and user impact.

### Candidate Batch A — Feed/social

- Poll release decision.
- Relationship ownership.
- Comment counter.
- Social journey suite.

Tasks: `DOM-101`–`DOM-105`, `API-006`–`API-008`

### Candidate Batch B — Music/artist

- Trust/origin lifecycle.
- Additive columns.
- Bounded backfill.
- Tour artist mapping quarantine.
- Merchandise visibility.
- RPC return contracts.

Tasks: `DOM-201`–`DOM-207`

### Gate

Only one bounded domain batch enters production at a time unless the release lead explicitly approves non-overlapping risk.

## Parallel Week 4 — CI enforcement

### Deliverables

- Canonical dependency workflow.
- Vitest/Jest repaired for approved contracts.
- Required debug, tests, type, lint, and build jobs.
- Disposable DB replay and schema-contract jobs.
- Initial branch protection.

### Tasks

`CI-001`–`CI-005`, `CI-101`–`CI-108`, `TST-004`–`TST-006`

Database/security CI jobs may remain blocked until the baseline and function/RLS manifests exist; record those dependencies rather than weakening the jobs.

## Day-30 expected state

At the end of 30 days, the team should have:

- Confirmed production identity.
- Paused unsafe automatic migration delivery.
- Closed the comments visibility gap.
- Removed production debug ingest.
- Contained anonymous privileged functions.
- Classified active runtime schema failures.
- Reconciled migration/object history.
- Reproduced an approved disposable baseline.
- Built the schema contract gate.
- Prepared or deployed the first small additive domain batch.
- Enforced the first set of required CI checks.

It is acceptable if broad performance optimization and legacy governance continue beyond day 30. It is not acceptable to skip correctness/security gates to reach the date.

## Daily operating rhythm

### 15-minute remediation standup

- Last completed task IDs.
- Current blocked task and owner.
- Production changes in last 24 hours.
- Error/advisor deltas.
- Today’s highest-risk action.
- Rollback readiness.

### End-of-day evidence check

- Tracker status matches reality.
- Pull requests/migrations linked.
- Validation attached.
- Decisions recorded.
- New risks added.

### Twice-weekly release review

- Phase exit criteria.
- Upcoming production writes.
- Target and backup verification.
- Stop conditions.
- Canary/observation plan.
