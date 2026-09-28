# Orchestrator questions

Audit date: 2026-09-09
Task: ORCH-001

Priority: P1 questions block other agents from starting. P2 questions can be answered in parallel with agent work.

## P1 — Block other agents

### Q1: Agent dispatch model
How should agents be dispatched? The task model defines JSON tasks but there is no runtime agent orchestration. Should agents be:
- (a) Subagents launched via the task tool with detailed prompts?
- (b) Humans assigned tasks via the control plane?
- (c) Automated cron-like dispatchers?
- **Blocks**: All 16 remaining *-001 audits.
- **Recommendation**: (a) subagents for this bootstrap phase.

### Q2: Generated maps currency
Are the 9 generated maps in `docs/engineering/generated/` current (run recently against HEAD)? If stale, should `npm run agents:generate` be run before agents consume them?
- **Blocks**: Every agent's BASELINE.md claims about routes, components, DB objects, permissions.
- **Recommendation**: Run `npm run agents:generate` and validate before dispatching agents.

### Q3: Dirty worktree ownership
386 entries are dirty. Which changes are intentional (this bootstrap session) vs pre-existing unfinished work? Should agents avoid touching untracked/modified files outside their working set?
- **Blocks**: Agents may conflict or misattribute dirty state.
- **Recommendation**: Agents read-only audit avoids modifying files; dirty tree documented in each task checkpoint.

### Q4: Exec-plan and handoff model
`docs/engineering/exec-plans/` and `docs/engineering/handoffs/` are referenced but appear empty. Are these models planned but not yet built? Should orchestrator create them?
- **Blocks**: Task handoff workflow, cross-domain coordination.
- **Recommendation**: Create minimal templates now; flesh out as agents produce handoffs.

## P2 — Can be answered during agent work

### Q5: Decisions log duplicate ID
Two decisions share CP-002. Should the second be renumbered to CP-005?
- **Blocks**: Nothing, but causes confusion.
- **Recommendation**: Renumber to CP-005.

### Q6: Agent identity provisioning
CP-002 (agent service principals) states identities start pending. Has the migration been applied? Do agents need credentials for this read-only audit phase?
- **Blocks**: Runtime agent authentication (not needed for read-only audit).
- **Recommendation**: No action needed for read-only audits; defer to implementation tasks.

### Q7: QA and RELEASE edit permissions
QA-001 and RELEASE-001 acceptance criteria state "edit: deny" permission. Is this enforced at the task level or agent level? How?
- **Blocks**: QA and RELEASE agents need clarity on write restrictions.
- **Recommendation**: Document in their charter/state; agents self-enforce during audit.

### Q8: Legacy .agents ledger integration
6 legacy specialist ledgers exist in `.agents/`. Should these be:
- (a) Preserved as-is and linked from new task records?
- (b) Migrated into the new task model?
- (c) Archived?
- **Blocks**: Nothing immediately; cleanup debt.
- **Recommendation**: (a) preserve and link.

### Q9: Work packet vs task model overlap
`docs/work-packets/` and `docs/engineering/tasks/` both track work. The task model is newer. Should work packets be deprecated, or do they serve a different purpose?
- **Blocks**: Nothing, but causes confusion.
- **Recommendation**: Work packets are for human-facing detailed plans; task JSONs are for agent orchestration. Keep both, link them.

### Q10: Fix pass decomposition
5 fix passes are documented in DEVELOPMENT_BACKLOG.md changelog but not decomposed into task records. Should these be retroactively tracked as completed tasks?
- **Blocks**: Nothing; historical record.
- **Recommendation**: Create completed task records for traceability.

## Closeout disposition — 2026-09-20

| Question | Disposition and evidence |
| --- | --- |
| P1 Q1 — dispatch | Answered: bounded work is routed through the 17 registered domain owners and canonical task records; CP-009 and `docs/engineering/agents/orchestrator/STATE.md` record the operating model. |
| P1 Q2 — map currency | Answered: CP-008 established regeneration and SHA stamping. Current SHA-drift warnings are non-blocking for this documentation-only closeout and will be reconciled with shared generated files outside ORCH-001. |
| P1 Q3 — dirty ownership | Follow-up created: ORCH-002 owns preservation, ownership mapping, deletion evidence, and release-branch curation. |
| P1 Q4 — plans/handoffs | Built: `docs/engineering/exec-plans/README.md`, `docs/engineering/exec-plans/TEMPLATE.md`, `docs/engineering/handoffs/README.md`, and `docs/engineering/handoffs/TEMPLATE.md` define the models. |
| P2 Q5 — decision ID | Fixed under the append-only policy: the second historical CP-002 is CP-005; `docs/engineering/DECISIONS.md` has unique labels. |
| P2 Q6 — identities | Read-only audit required no runtime credentials. Provisioning remains implementation work governed by CP-002 and does not block this audit. |
| P2 Q7 — QA/release writes | Resolved operationally through task scope and owner charters; audit tasks self-enforce their recorded read-only boundaries. |
| P2 Q8 — legacy ledgers | Answered by CP-004: preserve and link rather than bulk-migrate or delete `.agents/` evidence. |
| P2 Q9 — packet/task overlap | Answered: `docs/DEVELOPMENT_WORKFLOW.md` keeps detailed human-facing packets; `docs/engineering/tasks/README.md` makes task JSON canonical status truth. |
| P2 Q10 — fix-pass history | Non-blocking candidate: retain the changelog and create historical completed records only when traceability value justifies the work; do not manufacture implementation evidence. |

The four P1 decisions are resolved or routed to ORCH-002. The P2 items are
resolved policy or explicitly non-blocking historical cleanup, so unanswered
owner questions do not block ORCH-001 completion.
