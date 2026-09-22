# Tourify Development Workflow

This is the default workflow for humans and coding agents. Keep each task bounded to one subsystem and one acceptance target.

## Start every task with a work packet

Create `docs/work-packets/<task-id>.md` from `docs/work-packets/TEMPLATE.md`. A packet must include:

- task ID, goal, and out-of-scope areas;
- affected routes, components, services, migrations, or mobile surfaces;
- references to read first;
- acceptance criteria;
- the verification tier and targeted commands;
- blockers, next action, and final evidence.

Use `npm run context:task -- --task <task-id> --paths <path>...` to print a bounded context packet. Prefer explicit paths and `--changed` over repository-wide searches.

## Verification tiers

Run the smallest tier that proves the current work. Promote the tier when the scope changes or the task reaches a release boundary.

| Tier | Use | Checks |
| --- | --- | --- |
| Fast | During implementation | changed-file lint, focused tests, and the relevant domain check |
| Feature | Before handoff | Fast checks plus targeted route/API tests, typecheck, and affected audit checks |
| Release | Before merge/release | full typecheck, lint, unit tests, migration/security checks, and production build |

Commands:

```bash
npm run verify:fast -- --changed
npm run verify:feature -- --changed
npm run verify:release
```

The wrappers print each check, stop on failure, and write no generated audit artifacts unless an underlying check does so explicitly.

## Change-to-check map

- `app/`, `components/`, `hooks/`, or `lib/` UI: focused tests, lint, and `verify:fast`.
- `app/api/`, `lib/api/`, auth, or contracts: focused route/service tests and `verify:feature`.
- `supabase/migrations/` or database access: migration validation, Supabase target validation, and relevant RLS/security checks.
- `components/admin/`, `app/admin/`, or admin registry files: admin route registry, admin audit, and focused admin tests.
- `apps/mobile/`: mobile unit tests, typecheck, and lint.
- Docker, deployment, Next config, or CI: Docker/build verification and `verify:release` before merge.

## Completion report

Every implementation task ends with a compact report in the task response or packet:

1. changed areas;
2. checklist status;
3. commands actually run;
4. failures, including whether they pre-existed;
5. remaining blockers;
6. recommended next task.

Do not claim completion from a clean typecheck alone. Do not run full release verification for an exploratory or isolated change unless the task is at a release boundary.

## Docker

Use `docker/local/docker-compose.yml` for local parity dependencies and the app build. The production Compose stack remains for deployment operations and is intentionally not the default developer loop.

```bash
docker compose -f docker/local/docker-compose.yml --env-file .env.local up --build
```

The local stack is deliberately small: app, Redis, and Postgres. Supabase remains the database source of truth when the task requires hosted Supabase behavior.

## Task state

Use `npm run task:status -- --task <task-id>` to inspect a packet and `npm run task:next` to list the next open task packets. Keep packets small enough that a new agent can resume without rereading the repository.
