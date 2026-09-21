# Orchestrator gaps

Audit date: 2026-09-09
Task: ORCH-001

## Missing

| # | Gap | Evidence |
|---|-----|----------|
| M1 | No BASELINE.md, GAPS.md, or QUESTIONS.md existed before this audit | `docs/engineering/agents/orchestrator/` had only bootstrap skeletons |
| M2 | DECISIONS.md has duplicate label CP-002 (two decisions share the same ID) | `docs/engineering/DECISIONS.md:13` and `docs/engineering/DECISIONS.md:19` |
| M3 | No execution plan model defined or documented | `docs/engineering/exec-plans/` referenced in INDEX.md but no exec-plan files found |
| M4 | No handoff model documented beyond README reference | `docs/engineering/handoffs/README.md` referenced but no handoff files found |
| M5 | Agent identities file not read/verified | `docs/engineering/agent-identities.md` referenced but existence unconfirmed in this audit |
| M6 | No cross-domain dependency tracking beyond static DEPENDENCY_MAP.md | No runtime or task-level dependency edges recorded between agents |
| M7 | No orchestrator-specific tests or verification evidence | No test files under `docs/engineering/agents/orchestrator/` |
| M8 | Generated maps have no last-run evidence in this audit | SHA stamps not verified; `npm run agents:generate` not run |

## Incomplete

| # | Gap | Evidence |
|---|-----|----------|
| I1 | STATE.md says "none assigned" — was stale at audit time | `docs/engineering/agents/orchestrator/STATE.md:5` |
| I2 | BACKLOG.md has no active items — task not linked | `docs/engineering/agents/orchestrator/BACKLOG.md:5` |
| I3 | 17 starter tasks created but none started or assigned to subagents | `docs/engineering/tasks/active/*-001.json` all show progress "Created; implementation not started." |
| I4 | WORKING_SET.json lists paths but no generated map content | `docs/engineering/agents/orchestrator/WORKING_SET.json` — paths only, no map integration |
| I5 | Only 1 work packet exists (TA-PH0) and it is in_progress | `docs/work-packets/TA-PH0.md` — no other packets for domain agents |
| I6 | Dirty worktree (386 entries) ownership unresolved | `PROJECT_STATE.md` and task JSONs reference dirty tree |
| I7 | Completed tasks (AUTH-AGENT-001, CTRL-001, ADMUX-W01) not linked to orchestrator state | `docs/engineering/tasks/completed/` — no cross-references |

## Improve

| # | Gap | Evidence |
|---|-----|----------|
| U1 | Startup protocol references npm scripts that may not exist or work | `npm run agents:context`, `npm run agents:generate`, `npm run agents:validate` — unverified |
| U2 | Decisions log has duplicate CP-002 IDs | `docs/engineering/DECISIONS.md` — needs renumbering |
| U3 | No standard template for orchestrator-level checkpoint or handoff format | Only task-level checkpoint CLI exists |
| U4 | Legacy .agents/ ledgers not linked from task records | `.agents/admin-dashboard-builder/` etc. — should be referenced from task JSONs |
| U5 | DEVELOPMENT_BACKLOG.md has 5 completed fix passes but no task-level tracking | `docs/DEVELOPMENT_BACKLOG.md` changelog — fix passes not decomposed into tasks |
| U6 | No process for agents to report questions back to orchestrator | QUESTIONS.md format exists in task schema but no workflow for answer consumption |

## Closeout disposition — 2026-09-20

This file preserves the gaps as they were found on 2026-09-09. Subsequent work
resolved M2-M4, M8, I1-I4, I7, U1-U3, and U6 through the append-only decision
log, generated-map workflow, task/context/checkpoint commands, execution-plan
and handoff templates, and active task records. M5 was verified through
`docs/engineering/agent-identities.md`; legacy evidence remains preserved under
`.agents/` per CP-004. Current workspace curation and dependency truth moved to
ORCH-002 rather than extending this audit indefinitely.

Remaining product or governance work is not an ORCH-001 blocker. It stays in
the owning task records and the orchestrator backlog, including historical fix
pass traceability, legacy-ledger linkage where useful, and hosted launch gates.
