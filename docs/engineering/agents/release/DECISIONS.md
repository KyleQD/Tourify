# Release decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## REL-001 — Diagnose, do not remediate, the PR #14 release-lane check failures

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005, RELEASE-006, RELEASE-007
- Decision: The Wave 32 release lane is a **read-only diagnosis** of the `Vercel`,
  `Lint And Build`, and `CodeQL` check failures on PR #14. It changes no product
  code, no workflow, no `vercel.json`, no dependency manifest, no lockfile, and no
  hosted or branch-protection setting. Deliverable is evidence only, in
  `docs/audits/flow-notes/release-pr14-check-triage-2026-09-25.md` plus four
  handoffs.
- Evidence: each candidate fix was evaluated against measured evidence and rejected
  because the evidence does not support it.
  1. **No `timeout-minutes` on the `Lint And Build` job.** The job ran 70m40s and
     concluded `failure` at step 11 (`Typecheck`, 68m18s); nothing timed out, and
     the log contains zero OOM keywords. A green run must additionally pass 15 more
     steps plus a full `next build`, so no timeout value can be chosen from a
     *failing* run's timings without risking a false red on a green tree.
  2. **No change to the typecheck invocation or its `--max-old-space-size=8192`.**
     The setting is correct for a 4-core/16 GB `ubuntu-latest` runner, and the step
     completed normally rather than dying on heap exhaustion.
  3. **No change to the Vercel `NODE_OPTIONS` ceilings** (`vercel.json`
     `build.env` 4096, `build:vercel` 6144, `typecheck` 8192). The deployment API
     reports `BUILD_EXCEEDED_MAXIMUM_TIME`, a wall-clock kill, not an OOM. Raising an
     unproven heap cap on a 4-core/8 GB build machine can convert a clean timeout
     into a hard OOM kill, and there is no measured green-run build duration to size
     against.
  4. **No weakening of the typecheck gate.** `continue-on-error`, `if: always()` on
     the downstream steps, and tsconfig relaxation were all rejected: the 1,384
     diagnostics are a true upstream schema/type defect owned by `database`
     (`HF-RELEASE-DB-TYPECHECK`).
  5. **No change to the Vercel project binding or alias list.** The binding is
     demonstrably wrong — PR previews are building inside the production project
     `tourify-beta-k2` / `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`, whose production alias
     list still contains `demo.tourify.live` — but every corrective action is a
     hosted mutation and needs owner authorization (`HF-RELEASE-007-VERCEL-HOSTED`).
  6. **No change to branch protection.** The task record says the owner provisions it
     and the lane was dispatched read-only. Gaps are reported instead
     (`HF-RELEASE-005-REQUIRED-CHECKS`).
  7. **No deletion of the stale tracked `pnpm-lock.yaml`.** It is a real
     determinism defect (RELEASE-006), but it is a root dependency file with other
     lanes' worktrees in flight and is outside release file ownership.
- Consequences: PR #14's `mergeStateStatus: BLOCKED` is correct and should stay
  blocked. The 96 Advanced Security code-scanning alerts, including one critical
  SSRF, remain unrequired and therefore cannot block a merge — that is a governance
  gap for the owner, not something this lane can close. RELEASE-006 gains its first
  hosted build evidence: the hosted build environment is correctly provisioned, so
  the previously recorded local `build:vercel` blocker is local credential
  availability rather than a build-contract defect. A new hard constraint is
  recorded: the Vercel-hosted build path has a 45-minute ceiling, which the
  controlled `--prebuilt` promotion path does not.

## REL-002 — Split the release gate into independent evidence jobs, and derive every timeout from a measurement

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005, RELEASE-006
- Decision: `.github/workflows/ci.yml` is restructured from **one composite job**
  into **eleven independent jobs with no `needs:` edges**. The production build,
  the migration gates and the service-role audit become independent required-
  check candidates instead of steps sequenced after `Typecheck`. Two supporting
  rules are adopted for the whole release domain.

  1. **The ten existing required context names are contract.** GitHub matches a
     required status check by the check's reported **name**. Renaming or removing
     any of `Production Debug Scan`, `Vitest`, `Database Types`, `Lint And Build`,
     `Unit Tests (Vitest)`, `E2E Tests (Playwright)`, `Security exception
     governance`, `Secret scan`, `CodeQL (JavaScript/TypeScript)`, `Generate SBOM`
     makes that required context stop reporting and blocks **every** future merge
     of `main`. A job rename is therefore a branch-protection change even when it
     touches no protection file. New jobs are named so they can be added to the
     required set in one atomic `PUT`.
  2. **Every timeout is annotated MEASURED or PROVISIONAL in the file itself, and
     every PROVISIONAL value names the single green run that would replace it.**
     A cap derived from a *failing* run's timings is a guess; a guess presented as
     a measurement is worse than no cap, because it looks like evidence. The
     workflow also gains `defaults.run.timeout-minutes: 30` so no `run` step can
     consume GitHub's 360-minute default unnoticed.

- Evidence:
  - The defect is measured, not inferred. Run `35761777731`, job `106861310047`:
    step 11 `Typecheck` failed at 68 m 18 s and steps 12–27 — fifteen release-gate
    steps plus `Build` — were all `skipped`. So `d2176904` has **no
    production-build evidence at all**, and `check:migration-validation` and
    `check:service-role-allowlist` were unobservable.
  - The restructure is coverage-preserving, proven mechanically: a set difference
    of every `npm run …` / `npm test` / `npm ci` / `npm audit` invocation before
    and after returns **0 removed and 0 added**. `npm audit --audit-level=critical`
    additionally **moved up** from step 18 to step 9, ahead of `Typecheck`, so it is
    no longer maskable — strictly more coverage than before.
  - No weakening markers: zero occurrences of `continue-on-error`, `if: always()`,
    `|| true`, `|| echo`, or `ignoreDuringBuilds`. The single `ignoreBuildErrors`
    occurrence in the file is inside a comment quoting `next.config.ts`.
  - Every referenced `npm run X` exists in `package.json` (23/23). All 16 workflows
    parse. `${{ … }}` expressions balance 11/11. Every job has `runs-on` and a
    job-level `timeout-minutes`.
  - `node --test scripts/ci/release-workflow-contract.test.mjs` → 2/2 pass. That
    test reads `e2e.yml`, `deploy-demo.yml` and `deploy-production.yml`, not
    `ci.yml`, and none of the three was modified.
- Consequences:
  - **The four `ci.yml` required contexts are preserved byte-for-byte**, so the
    restructure cannot brick `main` on its own. The six new contexts only start
    reporting once a pull request runs the new `ci.yml`; adding them to the
    required set is a separate, owner-executed step (REL-003) and must be
    scheduled with the merge.
  - **Coverage is redistributed, not reduced.** Steps that were enforced through
    `Lint And Build` only because typecheck happened to pass now run
    unconditionally in their own jobs.
  - `Lint And Build` is now exactly one evidence class: clean install, lint, the
    ESLint warning budget, the critical dependency audit, and the full typecheck.
    The `--audit-level=high` threshold is deliberately **not** adopted here; the
    existing `critical` threshold is moved, not raised, and raising it is a
    separate decision.
  - **Nine of the eleven job caps are provisional.** Only `Production Debug Scan`
    (56 s), `Vitest` (119 s) and `Mobile Typecheck And Lint` (85 s) are measured
    against a green whole-job run. The `Typecheck` step cap of 115 min is 1.69×
    the only observation (68 m 18 s, on a *failing* tree). The `Production Build`
    cap rests on a cost model in which the **static-generation phase has never
    once been measured**, because the `Build` step has never completed on this
    repository; 45 min is budgeted for it deliberately over-generously. No claim
    is made that any of these jobs completes inside its budget.
  - The residual duplicated typecheck inside `next build` is **not** removed. It
    cannot be removed from a release-owned file: `next.config.ts` is not
    release-owned and relaxing `typescript.ignoreBuildErrors` would weaken a gate.
    See REL-003 for the E2E-job consequence and `HF-QA-035-E2E-BUILD-HEADROOM`.
  - `actionlint` is unavailable in this workspace, so the first real CI run is
    still the first schema-level lint of the new file.

## REL-003 — Required-check posture: decide it, do not apply it, and never require a path-filtered context

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005
- Decision: `HF-RELEASE-005-REQUIRED-CHECKS` is **decided and recorded, not
  executed.** No branch-protection setting was changed. The decisions:

  | Candidate | Decision |
  | --- | --- |
  | Advanced Security `CodeQL` gate | **Defer.** Require only after a `refs/heads/main` baseline exists (REL-004) **and** the alert backlog is triaged. |
  | `Dependency review` | **Require.** |
  | `Migrations And RLS Matrix` | **Do not require as configured** (path-filtered). |
  | `mobile-checks` | **Do not require as configured** (path-filtered). |
  | `redirect-safety` | **Do not require as configured** (path-filtered). |
  | `Production Build`, `Migration Gates`, `Service-Role Audit`, `Jest Unit Tests`, `Route And Registry Gates`, `Regression Safeguards` | **Require** (one atomic `PUT`). |
  | `Mobile Typecheck And Lint` | **Do not require** until its path filter is widened. |
  | `required_signatures` | Leave `false`; recommend the owner enable it. |

- Evidence:
  - `GET /branches/main/protection` → 200: `strict: true`, 10 contexts,
    `required_approving_review_count 1`, `dismiss_stale_reviews`,
    `require_last_push_approval`, `enforce_admins`, `required_linear_history`,
    no force pushes, no deletions, `required_conversation_resolution`,
    `required_signatures.enabled: false`.
  - **The governing hazard is a non-reporting required context.** Three of the
    candidates are path-filtered (`admin-rls-ci.yml`,
    `mobile-ci.yml`, `mobile-redirect-safety.yml`). A pull request that changes
    none of the filtered paths produces no such context, and a required context
    that does not report **blocks the merge**. Requiring any of them in its
    current form would brick `main` on the first unrelated pull request. This is
    a stronger objection than "it is currently green" and it is the reason the
    answer is no rather than a yes-with-caveats.
  - `Dependency review` is the one candidate with `if: github.event_name ==
    'pull_request'` and **no** path filter, is already green on the PR, and is
    already `fail-on-severity: critical`. It is the cheapest genuinely new
    enforcement available that cannot produce a non-reporting context.
  - The Advanced Security gate is the only check on the PR carrying a security
    verdict (96 open alerts, 1 critical) and it is the one that **cannot function
    as a regression gate today** — REL-004. Requiring a check whose number
    measures pull-request size would institutionalise the attribution bug.
- Consequences:
  - **No protection mutation was made by this lane.** The exact owner procedure —
  read the current set, build `current + 6`, `PUT` once, read back — is written
    out in `docs/audits/flow-notes/release-wave35-governance-2026-09-25.md` §2.3.
  - GitHub's endpoint **replaces** `required_status_checks.contexts` wholesale
    rather than appending, so the change is atomic and there is **no window in
    which coverage is weaker than today's**. That is the reason it is specified as
    one `PUT`: executing it as a sequence of partial edits would create exactly
    such a window.
  - **Timing constraint recorded:** the six new contexts only begin reporting once
    a pull request runs the restructured `ci.yml`. The `PUT` must land in the same
    window as the merge that carries this restructure, or immediately after it.
    In the interim the enforced set is today's 10 contexts, which is not weaker.
  - `Migrations And RLS Matrix`, `mobile-checks`, `redirect-safety` and
    `Mobile Typecheck And Lint` are *recommended* for a widened or removed path
    filter, so that the mobile and migration gates can eventually be required
    without the bricking hazard. Widening the filters is release-owned but was not
    done in this wave: it turns a ~3-minute Supabase stack boot and a second
    mobile dependency install on into the cost of *every* pull request, and that
    cost/benefit call is the owner's.
  - `required_signatures.enabled` stays `false`. Recorded, not changed: a commit
    signing policy is an owner and compliance decision.

## REL-004 — The missing `refs/heads/main` code-scanning baseline is a merge-ordering fact, not a configuration one

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005
- Decision: Diagnose precisely, change nothing. **No code-scanning analysis
  configuration, no branch configuration, and no alert was changed, and no alert
  was dismissed** (CP-060). The exact remediation is recorded as an owner-executed
  merge-ordering procedure, and the governance consequence is stated: until the
  baseline exists, the Advanced Security `CodeQL` gate is **not** a valid
  regression gate for this repository and its alert count must not be read as
  newly introduced risk.
- Evidence:
  - `GET /code-scanning/analyses?ref=refs/heads/main` → **0**.
    `?branch=main&state=open|dismissed|fixed` → **0 / 0 / 0**.
  - All **19** recorded analyses, enumerated over five pages, are
    `refs/pull/{14,6,5,4}/merge`. No `refs/heads/main` among them.
  - **Both hypotheses in the lane brief are false, and the real cause is a third
    thing.** `git ls-tree --name-only origin/main .github/workflows/` returns
    **13** workflow files and `security-scans.yml` is **not** among them. The
    file was introduced in commit `be313ca2` (2026-08-04, event-discovery phase 1)
    on a feature branch that was never merged. `origin/main` is `76d8389e…`,
    committed 2026-07-19, and `gh api branches/main` shows `protected: true` — so
    `main` *was* pushed, months after the workflow was written, but with a tree
    containing no CodeQL workflow. GitHub Actions runs only workflow files present
    in the pushed commit, so `on: push: branches: [main]` **has never existed on
    the default branch and has never had the opportunity to fire.** The
    `schedule: cron "23 9 * * 1"` trigger is equally inert: the run list contains
    **zero** `schedule` events and **zero** `push` events.
  - **The SARIF upload is working.** The `pull_request` analyses carry the right
    tool (`CodeQL`), version (`2.27.0`) and category
    (`/language:javascript-typescript`). Only the *ref* is wrong: a
    `pull_request` run analyses `refs/pull/N/merge`, never `refs/heads/main`.
  - A `push`-triggered run is the **only** thing that uploads a SARIF against
    `refs/heads/main` in this repository. There is no configuration toggle that
    substitutes for it.
  - The attribution consequence is measured: 94 of 96 open alerts sit in files the
    pull request never touched, and the single critical
    (`app/api/discover/route.ts:351`, `js/request-forgery`) is not in the diff.
    The check's own summary admits it: *"Alerts not introduced by this pull request
    might have been detected because the code changes were too large."*
- Consequences:
  - The Wave 33/34 code fixes for `app/api/discover`, `app/api/hub` and
    `lib/news/feed-service.ts` are **not** confirmed closed. GitHub Advanced
    Security has no local engine; only a new recorded analysis can close an alert.
  - **A second-order coupling is now recorded, and it is the more dangerous one.**
    Four of the ten required contexts — `Security exception governance`,
    `Secret scan`, `CodeQL (JavaScript/TypeScript)`, `Generate SBOM` — are
    produced **only** by `security-scans.yml`, which is **not on `main`**. They
    are currently satisfiable only because the file is present in a pull request.
    Any change removing that file from `main` would make four required contexts
    unproducible and block every future merge. There is also **zero evidence** that
    those four gates have ever been validated on the `push: main` path at all.
  - Remediation is five ordered steps in the evidence record §3.4: merge a branch
    carrying the file; confirm a `push`-event run on `main`; confirm
    `analyses?ref=refs/heads/main` is non-empty (**the single check that proves the
    defect closed**); read back the repository's code-scanning default branch; and
    only then re-read the PR gate, whose absolute open count on `main` — not 96 —
    is the real backlog for `HF-RELEASE-SEC-CODEQL`. REL-003 D1 follows last.
  - Expect the first `main` baseline to be large, because the merge brings in the
    900-file branch. That is the correct and honest outcome: it converts
    "48 new alerts on one pull request" into "N pre-existing alerts on `main`",
    which is a tractable triage list instead of a PR-size artefact. It must not be
    reduced by dismissal.

## REL-005 — Correct a stale record in place when it is a live claim; supersede it by append when it is a dated observation

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005, RELEASE-007
- Decision: The obsolete `404 Branch not protected` baseline is retired across the
  release domain, under a rule that protects the audit trail: a record that
  asserts a **live** state is corrected in place; a record that reports a **dated
  observation** is superseded by an appended correction, never rewritten.
  Rewriting a dated measurement would be falsifying the record, and the control
  plane's value depends on those records being honest about what was known when.
- Evidence:
  - The live configuration, read-only 2026-09-25:
    `GET /repos/KyleQD/Tourify/branches/main/protection` → **200**, not 404, with
    `strict: true` over 10 contexts, 1 approving review, `dismiss_stale_reviews`,
    `require_last_push_approval`, `enforce_admins`, `required_linear_history`,
    `allow_force_pushes.enabled false`, `allow_deletions.enabled false`,
    `required_conversation_resolution`, `required_signatures.enabled false`.
  - Corrected **in place** (live claims): `agents/release/STATE.md:29`, `:403`,
    `:436`; `RELEASE-005.json` `progress.blockers[2]`; `RELEASE-007.json` audit
    baseline. `agents/release/STATE.md:521-522`, which said the stale baseline was
    still carried, is now rewritten to record that the correction has been
    **applied** — it was previously a correct observation of an uncorrected record.
  - Superseded **by append** (dated observations, left byte-intact):
    `RELEASE-005.json` evidence lines dated 2026-09-09 and 2026-09-20, and
    `RELEASE-007.json` evidence dated 2026-09-22. Each was true on its date.
  - **Verified to carry no stale claim, so nothing was changed there:**
    `agents/release/CHARTER.md` (grep for `404` / `protect` returns nothing) and
    `BASELINE.md`, `GAPS.md`, `QUESTIONS.md`, `VERIFICATION.md`, `INTERFACES.md`,
    `ARCHITECTURE.md`, `BACKLOG.md`.
- Consequences:
  - The two Vercel facts are reconciled rather than restated. `tourify-beta-k2`
    (`prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`) **is** the production project;
    `targets.production.alias` contains `tourify.live`, `www.tourify.live` **and
    `demo.tourify.live`**; RELEASE-007 acceptance criterion 1 is therefore
    **unmet**; and PR preview builds land inside that production project, which
    `docs/DEPLOYMENT_ROUTINE.md` §4 forbids. This supersedes the earlier
    "legacy/archival scratch clone" characterisation of the same project.
  - Ordering constraint recorded in `HF-RELEASE-007-VERCEL-HOSTED`: the Git
    integration must be disabled or relinked **before** `demo.tourify.live` is
    removed from the production alias list, or the alias is left unbound with no
    quick rollback.
  - `docs/engineering/PROJECT_STATE.md:43-44` mentions `myproject/tourify-beta-K2`.
    That is a **local directory**, a different object from the Vercel project of
    the same name. It is a reference document outside release file ownership and
    it was **not** edited; the two must not be conflated in a future wave.

## REL-006 — Two operator-gated preconditions are recorded as blocking, with the exact commands and the exact unprovable residue

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005, RELEASE-006
- Decision: Database type regeneration and `INTERNAL_API_ORIGIN` are recorded as
  **named, blocking, operator-gated preconditions** with their exact commands,
  variable names, and the specific claims that remain unprovable without a live
  target. Neither was actioned, approximated, or worked around. No credential,
  token, DSN, or hosted value was read, printed, copied, or fabricated; the only
  environment data inspected was the set of variable **names** in
  `deployment/*.env`.
- Evidence:
  - **Type regeneration is credential-gated, not permission-gated.**
    `supabase/.temp/linked-project.json` exists (keys `ref`, `name`,
    `organization_id`, `organization_slug`). `supabase/.temp/pooler-url` exists at
    92 bytes and carries **no embedded password**. Docker is unavailable on this
    8 GB machine. `scripts/ci/database-types-source.mjs` documents three modes and
    all three are blocked: `local` needs Docker; `linked` needs a database
    password; `project-id` needs a database password for that project even with a
    valid `SUPABASE_TYPE_PROJECT_ID`. `lib/database.types.ts` is byte-unchanged.
  - Regeneration is now **safe** rather than merely desirable. The database lane
    withdrew its own blocker with evidence: the active chain is a proven
    **superset** of the generated contract — 13 relations, 54 columns and 42
    callables added, and **zero** contract-only entries — so regeneration would add
    coverage and delete none.
  - **This machine cannot measure the type surface at all.** A full
    `tsc --noEmit` OOMs locally regardless of the heap flag, so CI's 16 GB runner
    is the only place the 1 384-diagnostic count can be re-measured. No local
    typecheck or build number is claimed.
  - **`INTERNAL_API_ORIGIN` is blocking, and the committed templates do not carry
    it.** A read-only key listing of `deployment/demo.env` and
    `deployment/production.env` shows 31 and 25 keys respectively, and **none** of
    `INTERNAL_API_ORIGIN`, `NEXT_PUBLIC_APP_URL`,
    `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, or
    `DISCOVER_ALLOW_LOCAL_UPSTREAM` appears. An operator who loads either template
    and deploys gets the fail-closed empty response.
- Consequences:
  - **Unprovable without a live target, and therefore not claimed:** PostgREST
    schema-cache behaviour after a migration is applied (a stale cache yields zero
    rows and *no* error — the same failure shape as the search drift Wave 34 found
    in `app/api/search/enhanced/route.ts`); real RLS against real rows, since
    `Migrations And RLS Matrix` proves the matrix against a freshly built
    *ephemeral* stack and not against a long-lived hosted database; and the **13
    view relations whose columns are proven by name occurrence** in the chain
    rather than by replaying the `SELECT` list — a view can name a column that
    exists and still select a different type, an aliased expression, or a
    subquery. Only a live `information_schema` / `pg_get_viewdef` read on the
    approved target resolves that.
  - **No key was added to either `deployment/*.env` template and no value was
    written.** A guessed origin would either be refused by the guard (useless) or,
    worse, allowlist something that should not be reachable. The variable must be
    a bare `scheme://host[:port]`; the guard rejects a value carrying a path, query
    or fragment, and `VERCEL_URL` should be avoided in preference to
    `INTERNAL_API_ORIGIN` because it is a per-deployment value that changes on
    every preview deploy.
  - Under CP-051 no migration was applied, proposed for automatic application, or
    reset. Nothing in this decision touches the database.
