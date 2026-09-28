# Task records

Task records are JSON documents validated by the v2 `task.schema.json` and indexed exactly once by `TASK_INDEX.json`. Immutable completed v1 records remain readable historical evidence; every unfinished record must use v2.

- `active/`: `ready`, `in_progress`, or `verifying`.
- `blocked/`: `waiting_dependency`, `waiting_external`, `waiting_decision`, or `queued_postlaunch`.
- `completed/`: `done`, `superseded`, or `cancelled`.

Every unfinished task names exactly one product outcome, a deliverable class, decision owner, dependencies, resume condition, bounded working set, structured acceptance criteria, and local/hosted/release verification gates. Broad runnable leases require an explicit shared lease.

One implementation task and one verification task may be active per agent. A third unchanged blocker update is rejected; after ten checkpoints, complete or supersede the journal and create a bounded successor.

Create with `npm run agents:task:create -- --id TOUR-001 --title "Title" --agent artist --goal "Outcome" --path app/artist`.

Checkpoint with `npm run agents:checkpoint -- --task TOUR-001 --summary "Implemented X" --next "Run focused test"`.

A checkpoint must include a state transition, completed work, verification evidence/result, `--scope-change`, or `--dependency-resolved`; narration and changed next-step wording alone are rejected. While a task is blocked, pass `--actor <dependency-owner>` or new evidence.

Run `npm run agents:validate -- --strict` before dispatch. Use `npm run agents:state:refresh` after any exceptional manual task repair; normal create/checkpoint commands refresh the index and generated state summaries automatically.

Existing `docs/work-packets/` may be referenced; do not bulk-copy them.
