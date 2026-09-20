# QA backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- No active QA task after QA-001 completion. Owner answers to `QUESTIONS.md` should be converted into bounded follow-up task records.

## Candidate

Promoted from QA-001 GAPS.md; pending owner answers to `QUESTIONS.md` before bounding. QA-C01 is verification work, not a new CI build.

### P0 — Launch blockers

| ID | Candidate task | Gap ref | Blocked on |
|----|---------------|---------|------------|
| QA-C01 | Verify hosted CI status and required-check enforcement | GAP-001, GAP-003 | Q1 answer |
| QA-C03 | Build E2E money-flow journey (sell→check-in→settle) | GAP-002 | Q3 answer |
| QA-C04 | Add XSS payload E2E test | GAP-004 | Q4 answer |

### P1 — Must-fix before public scale

| ID | Candidate task | Gap ref | Blocked on |
|----|---------------|---------|------------|
| QA-C05 | Build RLS/security regression suite | GAP-010 | Q5 answer |
| QA-C06 | Expand forged-cookie 401 regression to all consumer routes | GAP-006 | Q6 answer |
| QA-C07 | Build rate-limit smoke test (real Upstash) | GAP-009 | Q7 answer |
| QA-C08 | Build non-member invite rejection integration test (real Supabase) | GAP-007 | Q7 answer |
| QA-C09 | Make typecheck tractable (scoped tsconfigs, <10 min target) | GAP-011 | Cross-domain with release |

### P2 — Product completion

| ID | Candidate task | Gap ref | Blocked on |
|----|---------------|---------|------------|
| QA-C10 | Build axe a11y scan of core flows (auth, feed, ticket, messaging) | GAP-012 | Q8 answer |
| QA-C11 | Build hire→assign shift E2E journey | GAP-013 | Q3 answer |
| QA-C12 | Add test coverage reporting to CI | GAP-014 | Q13 answer |
| QA-C13 | Build ticket transfer regression tests (both paths) | GAP-008 | Q14 answer |

### P3 — Scale/quality debt

| ID | Candidate task | Gap ref | Blocked on |
|----|---------------|---------|------------|
| QA-C14 | Build mobile E2E tests (Detox/Maestro/Playwright) | GAP-016 | Q9 answer |
| QA-C15 | Build visual/snapshot regression tooling | GAP-017 | Q10 answer |
| QA-C16 | Consolidate E2E auth helpers (remove duplication) | GAP-018 | Q11 answer (low effort) |
| QA-C18 | Build debug-route production-mode security tests | GAP-020 | Q15 answer |

## Done

- Control-plane bootstrap created.
- QA-001: Audit deliverables produced and reconciled against current generated maps and QA-002 evidence (BASELINE.md, GAPS.md, QUESTIONS.md, STATE.md, BACKLOG.md).
- QA-002: Full Vitest suite green; migration-chain and migration-validation checks pass.
- QA-001 audit check: all QA command aliases referenced by the QA documentation exist in `package.json` (GAP-019/Q12 resolved).

## P0 production launch task — 2026-09-16

- **QA-003** — build and run the deployed core-web launch certification suite against the exact isolated-staging release SHA; hand matching-SHA evidence and defect disposition to RELEASE-005.

## Batch status — 2026-09-16

- QA-003: partial harness implementation is present; add the fixture manifest/manual CI entry and run it only against isolated staging with protected secrets.

- QA-003 follow-up: replace the conservative example endpoint scenarios with approved staging contracts and attach exact-SHA evidence before promoting the task.
