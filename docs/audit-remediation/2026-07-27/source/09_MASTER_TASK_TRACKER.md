# Master Task Tracker

The implementation register contains **157 tasks**. `TASK_TRACKER.csv` is the importable source; do not renumber task IDs.

## Task distribution

| Prefix | Area | Count |
|---|---|---:|
| API | Comments/API authorization | 8 |
| AUTH | Authentication hardening | 5 |
| BLD | Production build | 3 |
| CI | Dependency and CI enforcement | 13 |
| CON | Schema contract gate | 5 |
| DB | Migration reconciliation/baseline | 24 |
| DOM | Domain schema restoration | 24 |
| GOV | Surface governance | 7 |
| OBS | Debug/telemetry | 4 |
| PERF | Database and journey performance | 15 |
| QLT | Lint quality | 3 |
| REL | Controlled release | 8 |
| RLS | RLS access decisions/tests | 4 |
| RPC | RPC classification/restoration | 5 |
| RUN | Runtime error containment | 4 |
| SEC | Privileged function/security | 13 |
| STO | Storage hardening | 6 |
| TST | Test contract repair | 6 |
| **Total** |  | **157** |

## Status vocabulary

Use only:

- `NOT_STARTED`
- `READY`
- `IN_PROGRESS`
- `IN_REVIEW`
- `VALIDATING`
- `BLOCKED`
- `DONE`
- `DEFERRED`

## Required tracking fields

The CSV begins with the fields extracted from the approved plan. Add these fields in the project-management system:

| Field | Requirement |
|---|---|
| Accountable owner | One person, not only a team |
| Due date | Date or sprint |
| Phase | 0–7 |
| Priority | P0/P1/P2 |
| Pull request/change record | URL |
| Migration version | If applicable |
| Before evidence | Log, schema, test, advisor, trace |
| Validation result | Command/result and date |
| After evidence | Same dimensions as baseline |
| Feature flag | Name and off/on state |
| Rollback instruction | Tested or demonstrably available |
| Production approver | Named for production-impacting work |
| Observation end | Date/time |

## Completion rule

A task is `DONE` only when:

- Intended behavior is documented.
- Change scope is bounded.
- Data changes are forward-only.
- Positive and negative authorization tests pass.
- Required unit, contract, integration, and E2E tests pass.
- Migration replay and schema contracts pass where applicable.
- Build and lint policy pass.
- Before/after evidence is attached.
- Rollback or feature-flag behavior is available.
- Ownership/registry documentation is updated.
- Production observation ends without recurrence.

Code merged is usually `VALIDATING`, not automatically `DONE`.

## Phase board

| Phase | Start condition | Exit evidence | Initial status |
|---:|---|---|---|
| 0 | Plan approved | Target confirmed, pushes paused, evidence captured | READY |
| 1 | Code-only work may start; DB writes wait for target | Security/privacy/debug containment green | PARTIAL/BLOCKED |
| 2 | Phase 0 complete | Baseline and dry-run predictability | BLOCKED |
| 3 | Disposable baseline available | Active contracts/authorization green | BLOCKED |
| 4 | Intended contracts approved | Required CI and clean build | BLOCKED |
| 5 | Correctness restored | Measured performance/Auth/storage targets | BLOCKED |
| 6 | Registries can be generated | Ownership/lifecycle enforced | BLOCKED |
| 7 | Phases 0–5 pass | Controlled release and observation | BLOCKED |

## Weekly report

```text
Reporting period:
Current phase:
Release posture: BLOCKED / LIMITED / CLEAR

Completed task IDs:
Tasks in validation:
Blocked tasks and owner:
Production changes applied:
Migration versions:
Feature flags changed:

Error signatures baseline/current:
Security advisor baseline/current:
Performance advisor baseline/current:
Jest/Vitest:
Build:

Decisions required:
Rollback readiness:
Next three task IDs:
```

## Critical path

`P0-001 → P0-005/P0-006/P0-008 → DB-001–DB-010 → DB-011–DB-017 → DB-018–DB-024 → CON-001–CON-005 → domain batches → REL-001–REL-008`

## First ten execution groups

1. `P0-001`
2. `P0-003`
3. `P0-004`
4. `P0-005`, `P0-006`, `P0-008`
5. `OBS-001`–`OBS-003`
6. `API-001`–`API-005`
7. `SEC-001`–`SEC-005`
8. `RUN-001`, `RUN-002`, `RUN-004`
9. `DB-001`–`DB-006`
10. `DB-011`–`DB-017`

## Tracker hygiene

- Never reuse a completed ID for different work.
- Split a task only by adding child IDs in the project system; preserve the parent.
- Record blocked dependencies explicitly.
- Do not change a failed task to `DONE` by weakening its acceptance evidence.
- Keep production changes and observations linked to the exact task and migration.
