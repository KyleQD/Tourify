# Executive Summary

## Decision

Tourify should enter a temporary schema-recovery and release-hardening program before more database-dependent features are merged to `main`.

The audit did not find one isolated migration mistake. It found four divergent representations of the product:

1. Application relation, column, RPC, and storage references.
2. The 324 local migration files.
3. Checked-in generated TypeScript database types.
4. The connected live schema and its 180 migration-history records.

That divergence is already visible in live traffic through missing relations, missing columns, permission failures, function return-shape mismatches, and API 400/404 responses. The same audit identified privileged database functions with broad grants, a comments endpoint that may bypass parent-post visibility, incomplete CI enforcement, production debug instrumentation, and a large governance/performance backlog.

## Release posture

Until Phases 0–4 are complete:

- Treat database-dependent production releases as blocked.
- Permit UI-only changes only when they do not alter database contracts and all required checks pass.
- Route urgent fixes through a dedicated hotfix branch with explicit validation evidence and a forward-only rollback path.
- Keep automatic production migration pushes disabled.

## Verified scope

| Area | Audited result |
|---|---|
| Repository | About 6,594 tracked files |
| Web surface | 347 pages and 726 API route files |
| Tests | 238 test files across Jest and Vitest |
| Local migrations | 324 timestamped SQL files |
| Remote migration history | 180 entries |
| Matching migration versions | 144 |
| Local-only migration versions | 180 |
| Remote-only migration versions | 37 |
| Known timestamp/name collisions | 2 |
| Public tables | 543 |
| Public `SECURITY DEFINER` functions | 136 |
| Live Postgres sample | 62 errors in the latest 100 records returned |
| Lint | 0 errors, 698 warnings |
| Jest | 335 passed, 2 failed |
| Vitest | 698 passed, 12 failed |
| Build | Compiled and generated 582 pages; final cleanup did not exit cleanly |

## Most urgent risks

### 1. Wrong-target and migration-history risk

The audited database is named `Tourify Demo`. It showed production-like traffic, but its deployment identity must be confirmed. A correct migration sent to the wrong project remains a critical incident.

### 2. Privilege and privacy risk

Eight privileged functions were reported executable by anonymous users, and many more were broadly executable by authenticated users. The comments GET route uses service-role access without proving that the parent post is visible to the caller.

### 3. Runtime contract failure

Current traffic references columns and relations absent from the connected schema. Static analysis also found approximately 83 table-like targets and 16 RPC names absent from the live public schema. Some represent intended features; others are scaffolding, debug utilities, or invalid legacy references.

### 4. Unenforced quality controls

Vitest and the production-debug checker are not required CI gates. Both maintained test suites are not green, and current dependency/lockfile behavior differs between local, CI, and deployment environments.

## Program strategy

Every database change follows:

```text
EXPAND → BACKFILL → VALIDATE → SWITCH → OBSERVE → RETIRE LATER
```

- **Expand:** add nullable columns, new tables, replacement functions, indexes, or policies.
- **Backfill:** update existing rows in bounded, resumable batches.
- **Validate:** prove counts, integrity, authorization, performance, and compatibility.
- **Switch:** move reads/writes behind a flag or compatibility layer.
- **Observe:** retain old structures through a defined monitoring window.
- **Retire later:** perform destructive cleanup only under a separate approval program.

## Target outcome

The program succeeds when Tourify has:

- A confirmed production database identity.
- One reproducible disposable-database baseline.
- Predictable forward migration behavior without a production reset.
- Generated types that match the approved schema.
- No active production code referencing absent schema objects.
- Explicitly owned and tested privileged functions and RLS policies.
- Parent-aware authorization for comments and other child-content APIs.
- Required CI for typecheck, lint policy, Jest, Vitest, debug scanning, migration replay, schema contracts, grants/RLS, advisors, build, and selected E2E journeys.
- Measured performance budgets for critical journeys.
- Owners and lifecycle statuses for production tables, functions, pages, and routes.

## Ownership model

| Role | Accountable outcome |
|---|---|
| Release lead | Freeze/unfreeze decisions, target confirmation, phase sign-off |
| Database lead | History ledger, baseline, convergence migrations, generated types |
| Security lead | Function grants, RLS, API authorization, Auth and storage |
| Backend lead | Runtime contracts, RPCs, stable errors, feature gates |
| Frontend/domain leads | Client compatibility and journey behavior |
| QA lead | Contract decisions, persona tests, E2E evidence |
| Platform/SRE lead | CI, deployments, logs, alerts, performance budgets |
| Product/domain owner | Active versus gated versus legacy classifications |

One person may hold several roles, but every outcome must have one accountable name.

## Immediate leadership decisions

1. Confirm whether `auqddrodjezjlypkzfpi` is the deployed production database.
2. Name the release, database, security, platform, backend, QA, and domain owners.
3. Approve the temporary database-dependent release freeze.
4. Approve npm as the canonical root package manager unless a documented workspace exception is required.
5. Approve the rule that no legacy object is dropped during this remediation.
6. Approve a disposable Supabase environment for baseline replay and destructive local testing.
