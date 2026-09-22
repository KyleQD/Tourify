# DESIGN-001 — Design-system audit

## Goal

Reconcile the design-system baseline, gaps, questions, and follow-up backlog against the
current shared primitives, accessibility, layout, token, and interaction-consistency
evidence.

## Scope

- In: `docs/engineering/agents/design-system/`, `docs/engineering/generated/`,
  `docs/work-packets/`, and the design-system default paths in `WORKING_SET.json`.
- Evidence expansion: `hooks/`, `components/venue/`,
  `app/admin/dashboard/components/hooks/`, `lib/design-system/`,
  `__tests__/design-system/`, named `.agents/` ledgers, and related venue records.
- Out: production code, migrations, unrelated domains, and deletion of shared/domain
  components. The expansion was required to verify completed DESIGN-002/DESIGN-003
  callers and the active DESIGN-004 venue boundary.

## References

- `docs/engineering/INDEX.md`
- `docs/engineering/agents/design-system/{CHARTER,STATE,WORKING_SET}.md/json`
- `docs/engineering/tasks/completed/DESIGN-002.json`
- `docs/engineering/tasks/completed/DESIGN-003.json`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/DEVELOPMENT_BACKLOG.md`
- `docs/engineering/DECISIONS.md`
- `docs/work-packets/VENUE-002.md`

## Acceptance criteria

- Reconciled `BASELINE.md`, `GAPS.md`, and `QUESTIONS.md` with current source and maps.
- Updated design-system state, decisions, backlog, and verification evidence.
- Refreshed generated maps.
- No production code or migration changes.
- `npm run agents:validate` passes with zero errors.

## Verification

- `npm run agents:context -- --task DESIGN-001` — completed.
- `npm run agents:generate` — completed; maps report 369 web routes, 24 mobile routes,
  939 API handlers, 1,939 component files, 693 database objects, and 1,287 policies.
- `npm run agents:validate` — pending final handoff run.

## Final evidence

The audit distinguishes resolved shared-contract work from remaining adoption debt:
DESIGN-002 established the canonical responsive hook; DESIGN-003 established and tested
shared EmptyState/ErrorState/Skeleton primitives. Remaining owner questions and candidate
tasks are recorded in `QUESTIONS.md` and `BACKLOG.md`. Unanswered questions do not block
completion.
