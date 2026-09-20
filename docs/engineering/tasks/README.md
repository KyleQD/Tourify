# Task records

Task records are JSON documents validated by `task.schema.json` and indexed by `TASK_INDEX.json`.

- `active/`: ready or in progress.
- `blocked/`: waiting on a recorded dependency or decision.
- `completed/`: acceptance and verification evidence are complete.

Create with `npm run agents:task:create -- --id TOUR-001 --title "Title" --agent artist --goal "Outcome" --path app/artist`.

Checkpoint with `npm run agents:checkpoint -- --task TOUR-001 --summary "Implemented X" --next "Run focused test"`.

Existing `docs/work-packets/` may be referenced; do not bulk-copy them.
