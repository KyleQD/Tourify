# Tourify Execution Mode Prompt

Use this prompt for normal Codex/engineering implementation. Replace the variables in angle brackets. Do not attach the full historical handoff suite unless the active task explicitly requires it.

---

You are implementing Tourify task batch `<TASK_IDS>` for domain `<DOMAIN>`.

## Required context

Read only:

1. `docs/engineering/ENGINEERING_CONSTITUTION.md`
2. the relevant entries from `docs/engineering/baselines/<DOMAIN>.json`
3. the capability entries named by each task's `reference_ids` in `docs/engineering/reference-maps/<DOMAIN>-reference-map.json`
4. the active task records from `docs/engineering/execution/<DOMAIN>.json`
5. the active thin phase brief under `docs/engineering/phases/<DOMAIN>/`
6. unresolved relevant entries in `docs/engineering/decisions/DECISIONS.md`
7. current target source files and direct dependencies
8. only the exact reference-build files named by the selected reference-map entries

Do not read every historical audit, roadmap, task ledger, or reference-branch file by default.

## Before implementation

Run a Level 3 drift audit:

- compare `<BASELINE_COMMIT>` with current HEAD using git diff/status/history as appropriate;
- inspect schema/migration changes relevant to the active tasks;
- inspect changed shared dependencies used by the active targets;
- identify new relevant test failures if already known.

If the baseline assumptions for this task are still valid, continue. Do not repeat a full-system audit.

Escalate to a targeted Level 2 phase audit only when a relevant owner/path/schema assumption is stale or unresolved. Escalate to Level 1 Discovery Mode only when architecture or canonical ownership has materially changed.

## Implementation rules

- Implement the smallest coherent vertical slice that satisfies the active task batch.
- Reuse canonical Tourify routes, components, services, tables, APIs, messaging, notifications, account context, and authorization boundaries before creating alternatives.
- Reference builds are reuse evidence. Adapt them to current code; do not copy a branch wholesale.
- Preserve current working behavior unless the active task explicitly replaces it.
- Use additive database changes only after verifying a real schema gap.
- Do not hard-code entity IDs or bypass RLS/authorization.
- Cover applicable loading, empty, partial, error, offline, forbidden, responsive, and accessibility states.
- Batch tightly coupled changes so the same code is inspected and tested once rather than restarting context per ledger item.

## Verification

Run the targeted tests listed on the active tasks first. At the phase gate, run only the broader commands specified in the phase brief.

Classify every failure as:

- caused by this batch;
- pre-existing;
- environment/dependency;
- not applicable.

Do not mark a task `verified` without evidence.

## Tracking

After implementation:

1. update only the affected task statuses in `docs/engineering/execution/<DOMAIN>.json`;
2. update the phase evidence JSON under `docs/engineering/evidence/` with changed files, tests, migrations, authorization checks, regressions, blockers, and decisions;
3. add a durable decision to `docs/engineering/decisions/DECISIONS.md` only when future work would otherwise need to rediscover it;
4. update the baseline/reference map only if verified architecture facts changed.

Do not create a separate narrative completion report unless requested or unless a critical blocker cannot be represented in the structured files.

## Stop conditions

Stop the affected task and record a blocker rather than guessing when schema/RLS cannot be verified, a destructive data change appears necessary, canonical systems conflict, required credentials/dependencies are unavailable, or an unresolved regression makes the vertical slice unsafe.

## Final response

Return a concise execution summary: completed task IDs, material changed files, verification result, migrations/authorization impact, and blockers. Do not restate the entire plan or reproduce the documentation.

---

## Example invocation

`<DOMAIN>` = `work`  
`<TASK_IDS>` = `WORK-P01-T01, WORK-P01-T02`  
`<BASELINE_COMMIT>` = `76d8389ebf939cee70f7070abf74a6bacc46f5de`

The model should load the relevant Work baseline records and only the reference capabilities attached to those two task records, inspect current drift, implement/test the batch, and update structured evidence.