# Tourify agent operating guide

This repository uses `docs/engineering/` as durable engineering memory. Keep this file concise; use the linked documents for detail.

## Start here

For every task:

1. Read `docs/engineering/INDEX.md`.
2. Read the assigned domain charter and state.
3. Read the task record under `docs/engineering/tasks/`.
4. Load only the task working set and named references.
5. Expand scope only when code evidence, a dependency, or failing verification requires it. Record why in a checkpoint.

Do not re-audit the whole repository before beginning a bounded task. Generated maps are indexes, not proof that behavior is correct.

## Working agreements

- Preserve unrelated changes. The worktree may contain concurrent or unfinished work.
- Treat Supabase migrations as the database source of truth. Do not use legacy bootstrap SQL for active environments.
- Keep authorization checks server-side and verify organization, venue, artist, or user scope at the data boundary.
- Prefer existing domain services, contracts, components, and verification commands.
- Update the task record at meaningful checkpoints and before handoff.
- Put durable domain knowledge in the owning agent state; keep turn logs in task records.
- Record architecture decisions in the cross-domain or domain decision log.
- Follow the verification tiers in `docs/DEVELOPMENT_WORKFLOW.md`.

## Control-plane commands

```bash
npm run agents:generate
npm run agents:validate
npm run agents:task:create -- --id TOUR-001 --title "Example" --agent artist --goal "Outcome"
npm run agents:context -- --task TOUR-001
npm run agents:checkpoint -- --task TOUR-001 --summary "What changed" --next "Next action"
```

Existing `docs/work-packets/` and `.agents/` records remain valid evidence. Link them from task records instead of copying or deleting them.

A task is complete only when acceptance criteria are met, verification evidence is recorded, topology maps are refreshed when needed, and the task is moved to completed.
