# Orchestrator backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- ORCH-001: Audit Orchestrator workspace — baseline, gaps, and questions. IN PROGRESS.
- LOCAL-READINESS-20260909: Coordinate local-first readiness with Supabase as source of truth. IN PROGRESS.
- Agent oversight cycle (2026-09-13): reconcile task truth, enforce launch-gate sequencing, and accept only evidence-backed completion.
- Next batch dispatched (2026-09-13): DESIGN-034 token-registry CI gate and DB-002 production-migration verification, each in an isolated worktree.
- Follow-on batch dispatched (2026-09-13): DESIGN-033 QA visual gate in an isolated worktree; DESIGN-034 remains queued and DB-002 remains release-blocked.
- Next visual follow-up dispatched (2026-09-13): DESIGN-033 authenticated browser verification in an isolated worktree; no duplicate DESIGN-034 or DB-002 lane launched.
- Focused visual blocker follow-up dispatched (2026-09-13): DESIGN-033 venue-session and artist-loading checks in an isolated worktree; DESIGN-034 remains queued.
- Fresh next batch dispatched (2026-09-13): DESIGN-034 token-registry CI gate after the prior dispatch produced no task-record evidence; DESIGN-033 remains blocked on clean venue QA.
- Release preflight dispatched (2026-09-14): RELEASE-005 required-check governance inspection; no branch-protection or workflow enforcement changes authorized.

## Dependency board

### Ready / owner-executable

- DESIGN-034: implement the token-registry CI drift gate.
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

### Audit / decision hold

- ADMIN-001, ARTIST-001, and ORCH-001 remain active until owner questions and final control-plane validation are recorded.

## Candidate

- Renumber duplicate CP-002 in DECISIONS.md to CP-005.
- Create exec-plan and handoff templates in `docs/engineering/exec-plans/` and `docs/engineering/handoffs/`.
- Run `npm run agents:generate` to refresh topology maps before domain audits.
- Create completed task records for the 5 historical fix passes.
- Link legacy `.agents/` ledgers from relevant task records.

## Done

- Control-plane bootstrap created.
- ORCH-001 read-only audit: BASELINE.md, GAPS.md, QUESTIONS.md produced.
- Runtime dispatch model selected for local readiness: parallel specialist lanes, followed by QA and release/local-parity integration.

## Production readiness — 2026-09-16

- **ORCH-002 (P0)** — preserve and secret-scan the 758-entry workspace, curate the production-readiness branch, map retained changes to owners/tasks/atomic commits, and maintain the launch go/no-go dependency graph.
- Hold later waves until the preceding task evidence is recorded; no audit finding alone completes an implementation task.
