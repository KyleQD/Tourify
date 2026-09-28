# Orchestrator backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- ORCH-002: Curate the workspace and own the production launch critical path. IN PROGRESS.
- LOCAL-READINESS-20260909: Coordinate local-first readiness with Supabase as source of truth. IN PROGRESS.
- Ongoing oversight: reconcile task truth, enforce launch-gate sequencing, and accept only evidence-backed completion through ORCH-002.

## Dependency board

### Ready / owner-executable

- DESIGN-033: obtain QA visual evidence for the applied radius token, then close.
- ADMIN-003: remain precondition-bound; accept only a newly landed enabling handoff or the owner decision on events communications.

### In progress / evidence completion

- DB-002: production verification completed with a release-blocking anon/PUBLIC EXECUTE defect and migration-history drift; remediate explicitly, then rerun.
- DB-005 and DB-006: prepare approved-target manual migration and events_v2 cutover evidence.
- INTG-006, SOCIAL-004, and MUSIC-004: finish focused contracts, then require hosted schema/Realtime/operations evidence.

### External or owner blocked

- INTG-003: MFA verification-code schema and server-only access contract required from database/auth owners.
- DISC-002: configured Redis and Supabase-backed search smokes required.
- RELEASE-003/004/005: secrets, observability, recovery, green Vitest, matching-SHA E2E, and branch-protection evidence required; RELEASE-005 preflight is blocked on all three test/governance conditions.
- ARTIST-003, USER-003, and MKT-002: product decisions or deployed/schema evidence required.
- VENUE-002: remains blocked by its recorded keep-boundary policy.

### Completed audits / decision follow-ups

- ADMIN-001, ARTIST-001, and ORCH-001 are complete. Their unresolved product choices become separate bounded follow-up tasks and do not place the audits on hold.

## Candidate

- Create completed task records for the 5 historical fix passes.
- Link legacy `.agents/` ledgers from relevant task records.

## Done

- Control-plane bootstrap created.
- ORCH-001 read-only audit completed 2026-09-20: BASELINE.md, GAPS.md, and QUESTIONS.md contain the original audit plus closeout disposition; bounded context rebuilt; validation passed with 0 errors.
- DESIGN-034 completed the token-registry CI drift gate; its canonical task record contains the implementation and verification evidence.
- Exec-plan and handoff models created; CP-005 resolved the duplicate decision label; CP-008 established generated-map refresh and SHA currency.
- Runtime dispatch model selected for local readiness: parallel specialist lanes, followed by QA and release/local-parity integration.

## Production readiness — 2026-09-16

- **ORCH-002 (P0)** — preserve and secret-scan the 758-entry workspace, curate the production-readiness branch, map retained changes to owners/tasks/atomic commits, and maintain the launch go/no-go dependency graph.
- Hold later waves until the preceding task evidence is recorded; no audit finding alone completes an implementation task.
