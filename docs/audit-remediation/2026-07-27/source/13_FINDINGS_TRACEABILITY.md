# Audit Findings Traceability

## Purpose

This matrix prevents findings from being “closed” by an unrelated code change. Each finding requires its mapped tasks and completion evidence.

| Finding | Verified issue | Primary documents | Task prefixes | Completion evidence |
|---|---|---|---|---|
| F-01 | Migration history drift and collisions | 01, 08, 10 | `P0-*`, `DB-*`, `CON-*`, `REL-*` | Target confirmed, deterministic baseline, predictable dry run, canonical types |
| F-02 | Broad privileged-function grants | 02, 10 | `SEC-*`, `RLS-*`, `RPC-*` | Function manifest, least grants, fixed search paths, denial/persona tests |
| F-03 | Live schema contract failures | 03, 08 | `RUN-*`, `CON-*`, `DOM-*`, `RPC-*` | No active absent targets, gated future paths, zero error window |
| F-04 | Comments can bypass parent visibility | 02, 03 | `API-*` | Visibility matrix, user-scoped authorization, negative integration tests |
| F-05 | RLS/index issues and policyless tables | 02, 05 | `RLS-*`, `PERF-001`–`PERF-007` | Access decisions, persona equivalence, measured advisor reduction |
| F-06 | CI evidence and coverage gaps | 04 | `CI-*`, `TST-*` | Required jobs run on PR and block merge |
| F-07 | Production localhost debug telemetry | 04, 06 | `OBS-*` | Calls removed, scanner fixtures and required check |
| F-08 | Tests/build not fully green | 04 | `TST-*`, `QLT-*`, `BLD-*` | Both suites green, no-new-warning gate, clean build artifact |
| F-09 | Product/schema sprawl | 07 | `GOV-*` | Registries, owners, lifecycle enforcement, no destructive cleanup |
| F-10 | Request/query fan-out | 05 | `PERF-101`–`PERF-108` | Journey budgets, traces, bounded queries, load results |
| F-11 | Auth/storage hardening | 06 | `AUTH-*`, `STO-*` | Password/MFA policy operational, bucket/path and persona tests |

## Finding closeout template

```text
Finding:
Accountable owner:
Mapped task IDs:
Approved intended state:
Implementation PRs:
Migration versions:
Before evidence:
Positive tests:
Negative tests:
After evidence:
Production observation:
Residual risk:
Approvers:
Close date:
```

## F-01 closeout requirements

- Confirm exact production project.
- Preserve live and local histories.
- Reconcile all versions and collisions by object effect.
- Rebuild approved baseline twice.
- Apply only forward convergence migrations.
- Prove future dry-run predictability.
- Generate types from approved target.

Any unresolved history row keeps F-01 open.

## F-02 closeout requirements

- Inventory all 136 definers.
- Resolve eight anonymous findings first.
- Remove public/default execution where not needed.
- Prove intended caller paths and denied direct calls.
- Fix search paths and caller identity.
- Add CI grant assertions.

An unowned callable definer keeps F-02 open.

## F-03 closeout requirements

- Classify all missing static targets.
- Restore only active contracts.
- Server-gate future paths.
- Restore or remove absent RPC references.
- Maintain zero live signature recurrence through the approved window.

Returning empty arrays for missing active schema does not close F-03.

## F-04 closeout requirements

- Parent visibility is decided before child read.
- Service-role access does not bypass the decision.
- Public/follower/friend/private/draft/deleted/block cases pass.
- Raw database errors are not public.
- Comment counts are atomic or reconciled safely.

## F-05 closeout requirements

- Four policyless tables have explicit access decisions.
- Finance offering insert is constrained or gated.
- RLS optimization retains exact persona behavior.
- Index changes have query-plan evidence.
- “Unused” and duplicate index retirement is deferred unless separately approved.

## F-06/F-08 closeout requirements

- CI runs are visible for a real PR.
- All named jobs are required.
- Jest and Vitest are green.
- Production-debug scan is green.
- Clean build exits successfully.
- Warning budget prevents regression.

## F-07 closeout requirements

- Both identified feed code paths are clean.
- Scanner rejects loopback ingest and markers.
- Legitimate telemetry uses approved redacted/sampled mechanisms.

## F-09 closeout requirements

- Active schema/routes have owners and lifecycle.
- Overlapping families have canonical decisions.
- Documentation distinguishes authoritative from archived.
- No unowned new surface can merge.

This finding can be controlled without deleting legacy objects.

## F-10 closeout requirements

- Top journeys have numeric budgets.
- Real waterfalls are captured.
- N+1 and duplicate requests are reduced.
- Lists are paginated.
- Cache behavior is tenant- and role-safe.
- Load smoke meets thresholds.

## F-11 closeout requirements

- Leaked-password protection is enabled and tested.
- MFA policy is operational for privileged roles.
- Session/role removal behavior is proven.
- Avatar listing is narrowed.
- Every active bucket/path and CRUD operation passes persona tests.

## Positive controls to preserve

Do not regress:

- RLS enabled on all observed public tables.
- Primary keys on all observed public tables.
- `security_invoker=true` on all observed public views.
- JWT verification on observed Edge Functions.
- Strict TypeScript mode.
- No global Next.js ignore of type/build errors.
- Production middleware blocking known debug/setup/migration/test route families.
- Existing audit/debug scanners that can be strengthened.
