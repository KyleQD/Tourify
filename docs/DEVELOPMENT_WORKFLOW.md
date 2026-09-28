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
| Feature | Before handoff | Fast checks plus targeted route/API tests, a **scoped** typecheck, and affected audit checks |
| Release | Before merge/release | full typecheck, lint, unit tests, migration/security checks, and production build |

Commands:

```bash
npm run verify:fast -- --changed
npm run verify:feature -- --changed
npm run verify:release
```

The wrappers print each check, stop on failure, and write no generated audit artifacts unless an underlying check does so explicitly.

### The `feature` tier's scoped typecheck

`npm run verify:feature -- --changed` scopes its typecheck to the changed work. It builds a tsc project in the same shape as the scope projects this repository already uses by hand (`tsconfig.wfc003-slice.json` and `tsconfig.ds-scope.json` in the current working tree, and the committed `tsconfig.admin003-slice.json`, `tsconfig.world-slice.json` and four others): `extends` the base config, `incremental: false`, an explicit `include` list, the base `exclude` minus the test globs — but rooted at the changed TypeScript sources instead of at `**/*.ts`. It then runs `tsc -p` on that project. Without `--changed` the tier still runs the full `npm run typecheck`.

**Why it is scoped.** The full program cannot be built on a machine that cannot grant the 8 GB heap `npm run typecheck` requests. Measured on an 8 GB host, the same `tsc --noEmit` given a 2 GB ceiling dies in 19.9s with `FATAL ERROR: ... JavaScript heap out of memory` and prints zero diagnostics — no verdict at all, so the tier could not complete whatever a lane changed (CP-106). The ceiling was not raised and type coverage was not removed; the check moved to a program that fits.

**What the scoped run covers.** Every changed TypeScript source, plus the transitive import closure of those sources, compiled with the base config's `strict: true`, `paths`, and ambient types. Changed **test** files are roots too, so a changed test is type-checked.

**What it does not cover, and a lane must know this before it records a pass:**

- **Reverse dependents.** TypeScript roots a program downwards. A repository file that *imports* a changed file is not checked unless it is also a root. A change that breaks a caller is not caught by this step.
- **Unrelated files**, and therefore whole-repository breakage. Full-program typecheck is unchanged in `npm run verify:release`, in `ci.yml` job `Lint And Build` step `Typecheck`, and in RELEASE-006's curated clean-checkout run. The `feature` tier stopped duplicating a check that belongs to those places; it did not remove it.
- **`lib/database.types.ts`** only when a changed root imports it. The step prints whether it is in the program.

**Widening it.** Pass a committed scope project that lists your dependents: `npm run verify:feature -- --changed --typecheck-scope tsconfig.<lane>-scope.json`. The step refuses to report a pass if any changed file is missing from the program, so an incomplete scope fails loudly instead of looking clean. The closest in-repo precedents are `tsconfig.wfc003-slice.json` and the committed `tsconfig.admin003-slice.json`, both of which list test roots as well as source roots.

**Finding your dependents without hunting for them.** The tier prints the **reverse dependents** of each changed root: the repository files whose code textually references it, marked `NOT in the program above, and NOT checked by this step`. That is a copy-paste source for a scope project, and it is also a warning: a signature change to a widely-imported file is invisible to this step. Measured on `lib/auth/auth-email-redirect.ts` (8 importers), changing its signature produced **zero** diagnostics from the scoped typecheck and the tier still reported the run as non-pass only because an unrelated check was skipped. Widening with a scope project built from the printed list turned the same change into a truthful red.

That lookup is a **textual** instrument, not a resolver. It matches the extension-less path and finds literal importers; it misses re-exports, barrel indirection, computed specifiers and dynamic `import()`, and it proves nothing about any file it names. It only tells you where to look, it cannot turn a red green, and it never changes the verdict. See CP-122 for why that is where the line is drawn.

**Reading its output.** The step runs `tsc --listFiles` and prints the repository files that were in the program, the count against the repository total, the evidence file path, and a final `RESULT:` line naming the typecheck's mode. If `--changed` is passed and the worktree has no changed TypeScript source, the typecheck reports `NOT RUN` and the tier says so — record that as not-run, not as a pass.

### The `feature` tier's verdict: three outcomes, and what a credential-gated step does

A step that cannot run for want of an environment prerequisite is **not** a pass and **not** a failure of your change. It is reported as `skipped` with the missing variables named, the tier keeps going, and the run ends with one of three verdicts:

| Verdict | Exit | Meaning | What a task record may say |
| --- | --- | --- | --- |
| `pass` | 0 | every check that applies to this change ran and passed | `pass` |
| `incomplete` | 3 | nothing that ran failed, but N check(s) could not run | `partial`, with the skipped set — **never** `pass` |
| `fail` | the failing check's own status | a check that ran and failed | `fail` |

The last line of the run is `[verify:feature] RESULT: <verdict>`. That is the line to read, and the exit code is arranged so that reading only the exit code gives the same answer: **0 is reserved for a real pass.** A run with a skipped step cannot exit 0, so a lane cannot record a green tier by glancing at `$?` — that guarantee is structural, not a convention to remember.

**Why `incomplete` is not 0.** One number cannot be both "your code is fine" and "this was not fully verified", and every tool that has not read the verdict line resolves that ambiguity in the permissive direction. The cost of the stricter choice is that a migration lane in an unprovisioned environment still cannot record a green `feature` tier — which is correct, because `check:supabase-target` genuinely did not run — and what it gets instead is a named, itemized account of everything that did run. See CP-121.

**Which steps are credential-gated.** Only `check:supabase-target`, which requires `SUPABASE_PROJECT_ID`, `EXPECTED_SUPABASE_PROJECT_ID` and `SUPABASE_TARGET_CONFIRMATION`. The requirement is declared in `scripts/verify.mjs` and **printed on every run, green included**, so the gate cannot be dropped without leaving a trace. If the variables are absent the step is skipped; if they are present the step runs and any failure is a real failure, including a target mismatch. That is fail-closed, and it is the same default as before this change.

**Reading a skip.** The run prints `SKIPPED — these checks did NOT run and are not covered by this result:` followed by one line per skipped check with the exact variables that were missing, and `TO GET A PASS: provision the named variable(s) and re-run this tier.`

**A step that did not run is a skip.** `--changed` with no changed TypeScript source reports the typecheck as skipped rather than as a pass, so a run that verified no types cannot be recorded as a pass either. For a documentation-only change, use `verify:fast`, which is the tier for work that cannot affect these checks.

**Which tier for what.** The `fast` and `release` tiers are unchanged and do no skip accounting: the `fast` tier has no credential-gated step, and the `release` tier's credential-gated step is `build:vercel`, which must fail loudly because a release cannot be built in an unconfigured environment.

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
