# PR #14 check triage — release lane

- Date: 2026-09-25
- PR: [#14 "Add QA simulation campaign staging gates"](https://github.com/KyleQD/Tourify/pull/14)
- Head SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f` (`codex/qa004-staging-campaign`)
- Base: `main` @ `76d8389ebf939cee70f7070abf74a6bacc46f5de`
- PR size: **900 changed files** (GitHub API `pulls/14/files`, 9 pages × 100)
- `mergeStateStatus`: `BLOCKED`
- Lane: `release`. All evidence below is read-only: GitHub REST/GraphQL, GitHub Actions job
  logs, and the Vercel REST API plus `vercel inspect`. **No hosted mutation, no deployment, no
  branch-protection change, and no git history change was performed.**

## Summary

| Check | Surface | Conclusion | Blocks merge? |
| --- | --- | --- | --- |
| `Vercel` | Vercel **commit status** (not a check run) | `BUILD_EXCEEDED_MAXIMUM_TIME` — 45-minute Vercel build ceiling | No |
| `Lint And Build` | GitHub Actions job, `CI` #35761777731 | Genuine `tsc --noEmit` failure: 1384 diagnostics / 407 files. Pipeline config is correct | **Yes** |
| `CodeQL` | GitHub Advanced Security **code-scanning check run** (no workflow job) | 96 open alerts, 1 critical. Not a misconfiguration | No |
| `Database Types` | GitHub Actions job, `CI` #35761777731 | Failed at `supabase start` (other lane) | **Yes** |
| `E2E Tests (Playwright)` | GitHub Actions job, `E2E Tests` #35761778422 | `CANCELLED` (other lane) | **Yes** |

---

## (i) `Vercel` check fails

### Root cause: the Vercel build hit its maximum build duration

```
GET /v13/deployments/dpl_2zPXya6iLnXhdgDPeHu7mX3cbQdY?teamId=kyleqdaley-gmailcoms-projects
  readyState: ERROR
  errorCode: BUILD_EXCEEDED_MAXIMUM_TIME
  plan:      pro
  regions:   ["iad1"]
  projectId: prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n
  gitSource: { type: "github", repoId: 1166070718, ref: "codex/qa004-staging-campaign",
               sha: "d21769046d517898144ee09a1c7bb4a7d36b068f" }

  createdAt   -> buildingAt : 1.31 s
  buildingAt  -> ready      : 2738.605 s = 45.64 minutes   (readyState ERROR)
```

The build was killed by the 45-minute wall clock while it was inside Next.js's
`Linting and checking validity of types` phase. Verbatim build-log tail:

```
17:36:06.369  Running build in Washington, D.C., USA (East) – iad1
17:36:06.370  Build machine configuration: 4 cores, 8 GB
17:36:13.571  Warning: Due to "engines": { "node": "24.x" } in your `package.json` file, the
              Node.js Version defined in your Project Settings ("22.x") will not apply,
              Node.js Version "24.x" will be used instead.
17:36:59.150  ✓ Node v24.19.0; npm@11.17.0; lockfile v3          <- preinstall check-toolchain
17:37:02.429  added 1692 packages, and audited 1693 packages in 49s
17:37:03.133  [env-check] Production build environment contract passed.
17:41:33.309  ✓ Compiled successfully in 4.4min
17:41:34.067  Linting and checking validity of types ...        <- last line emitted
```

### Ruling out each candidate cause

- **Real product/build defect — no.** Webpack compilation *succeeded* (`✓ Compiled successfully
  in 4.4min`). The failure is a wall-clock kill during the type/lint phase, not a compile
  error and not a build error message.
- **Misconfigured Vercel project linkage — no, the link is intact.**
  `GET /v9/projects/tourify-beta-k2` returns
  `link: { type: "github", repo: "Tourify", org: "KyleQD", repoId: 1166070718,
  productionBranch: "main", gitCredentialId: "cred_7116bbbe…" }`. The GitHub link resolves and
  the build cloned the correct branch and commit.
- **Missing required environment variable in the preview environment — no, ruled out directly.**
  The build logged `[env-check] Production build environment contract passed.` at
  `17:37:03.133`, i.e. `validateProductionEnvironment("build")` succeeded. The project env
  (names only, no values read) contains all six variables the contract requires:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, `CRON_SECRET`.
- **Quota / plan / permission — no.** The deployment is on the `pro` plan in
  `kyleqdaley-gmailcoms-projects` and the build actually ran for 45 minutes. There is no
  build-minute exhaustion, no seat/permission error, and no paywall message in the log.

### The project binding *is* wrong for this PR — reported, not changed

The brief flags `tourify-beta-k2` as a legacy/archival scratch clone. The live evidence is
more specific and more serious: it is the **production** Vercel project, and it is *still*
receiving Git-triggered preview builds for arbitrary PR branches.

```
GET /v9/projects/tourify-beta-k2?teamId=kyleqdaley-gmailcoms-projects
  id:   prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n
  name: tourify-beta-k2
  framework: nextjs
  nodeVersion: "22.x"
  link: { type: "github", repo: "Tourify", productionBranch: "main" }
  targets.production.alias:
    [ "tourify.live", "demo.tourify.live", "www.tourify.live",
      "tourify-beta-k2-kyleqdaley-gmailcoms-projects.vercel.app",
      "tourify-beta-k2-git-main-kyleqdaley-gmailcoms-projects.vercel.app" ]
```

Three consequences:

1. **RELEASE-007 acceptance criterion 1 is still unmet.** `demo.tourify.live` is an alias on
   the *production* Vercel project. Criterion 1 requires demo to resolve only to isolated
   staging.
2. **PR preview builds land in the production project.** `d2176904` is a `target: preview`
   deployment inside `tourify-beta-k2` / `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`. `docs/DEPLOYMENT_ROUTINE.md`
   §4 requires Vercel's Git integration to be unable to auto-deploy or reassign the production
   domains outside `deploy-production.yml`.
3. **The committed status came from the legacy path.** The failing status is a
   `StatusContext` (not a check run) with
   `target_url: https://vercel.com/kyleqdaley-gmailcoms-projects/tourify-beta-k2/2zPXya6iLnXhdgDPeHu7mX3cbQdY`.

The controlled path already avoids the 45-minute ceiling. `.github/workflows/deploy-demo.yml`
runs `vercel build --prod` **in GitHub Actions** (line 105) and then
`vercel deploy --prebuilt --prod` (line 115), which uploads an artifact and performs no
Vercel-side build. The 45-minute limit therefore only bites the *uncontrolled* auto-preview
path. **The binding was not changed** — that requires owner authorization and is handed off
as `HF-RELEASE-007-VERCEL-HOSTED`.

### Contributing configuration drift found (recorded, not changed)

- **Dual lockfile.** The repository tracks both `package-lock.json` (npm, lockfile v3, the
  contract enforced by `scripts/ci/check-toolchain.mjs` and `.nvmrc`) and a **stale
  `pnpm-lock.yaml`** (332 KB). The hosted build detected it and warned:
  `Detected pnpm-lock.yaml 9 … Using pnpm@10.x based on project creation date`. That is
  exactly the non-determinism RELEASE-006 exists to remove. Vercel still ran `npm ci`
  (confirmed by the log), so this did **not** cause the failure.
- **Node version setting drift.** The hosted project setting is `nodeVersion: "22.x"` while
  `package.json` `engines.node` is `24.x` and `.nvmrc` is `24`. The build actually ran
  Node v24.19.0 because `engines` wins, and the build log emitted the deprecation warning
  above. The hosted setting contradicts the pinned runtime contract and should be aligned.
- **Three different declared heap ceilings for one workload.** `vercel.json` `build.env`
  sets `NODE_OPTIONS: --max-old-space-size=4096`; `package.json` `build:vercel` inlines
  `--max-old-space-size=6144`; `package.json` `typecheck` uses `--max-old-space-size=8192`.
  The Vercel build machine is 4 cores / 8 GB. The effective ceiling for `next build` is
  6144 MB (75% of machine RAM). This was **not** changed: the API reports a *timeout*, not an
  OOM, and raising an unproven heap cap on an 8 GB box can convert a clean timeout into a
  hard OOM kill. Recorded for RELEASE-006 with measurement first.

---

## (ii) `Lint And Build` fails — pipeline half

### Step-level evidence

```
GET /repos/KyleQD/Tourify/actions/jobs/106861310047
  name:   Lint And Build        (workflow: CI, run 35761777731)
  labels: ["ubuntu-latest"]     runner: GitHub Actions 1000000482
  started_at  2026-09-22T17:36:14Z
  completed_at 2026-09-22T18:46:54Z      -> 70m40s total

  step  9  Lint                            17:37:30 -> 17:38:18   success   48 s
  step 10  ESLint warning no-growth budget  17:38:18 -> 17:38:34   success   16 s
  step 11  Typecheck                       17:38:34 -> 18:46:52   FAILURE   68m18s
  steps 12-27 Migration validation lint, Admin API route registry, Legacy tour route
          inventory, Service-role allowlist, Admin workflow registry, Token registry
          regression gate, Dependency audit, Contract tests, Mobile typecheck, Mobile lint,
          Unit tests, Mobile redirect safety, Auth callback redirect smoke, Venue operations
          safeguard, Build                    -> ALL SKIPPED
```

### The typecheck invocation and memory setting are correct, and are not the cause

- `ci.yml` line 125-126 runs `npm run typecheck`, which is
  `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` (`package.json` line 33).
- `ubuntu-latest` is a 4-core / 16 GB runner, so an 8192 MB V8 heap cap leaves ~8 GB of
  machine headroom. The setting is appropriate.
- The step **completed normally**. A search of the full job log for
  `heap out of memory`, `FATAL ERROR`, `JavaScript heap`, `ENOMEM`, `Killed`, and `SIGKILL`
  returns **zero** matches. There was no V8 OOM and no runner kill.
- Node, npm, and lockfile contracts all passed earlier in the same job
  (`Verify runtime and package-manager contract` step 6 = success).

### There is no timeout or instability problem — the 1h10m40s is real work

- The job carries **no `timeout-minutes`**, so GitHub's 360-minute default applied. Nothing
  timed out. The job ended with `conclusion: failure` at step 11, not `cancelled` and not a
  timeout kill.
- 68m18s of the 70m40s wall clock is the single `tsc --noEmit` pass. Setup, `npm ci`, lint,
  and the ESLint budget together took 2m20s.
- The 68-minute typecheck is the known slow-full-typecheck profile already recorded in
  RELEASE-006 ("full typecheck did not complete in a six-minute bounded run"). 1,384
  diagnostics across 407 files is more work for `tsc` than a clean tree, so 68 minutes is a
  plausible deterministic cost, not flakiness.
- **No `timeout-minutes` was added.** A green run of this job would additionally have to pass
  15 more steps plus a full `next build`; any value chosen from today's *failing* run's
  timings would be a guess that either breaks the gate or is meaningless. Measuring a green
  run's duration is a prerequisite, not a guess.

### The failure is an upstream schema/type gap, and the gate is correctly failing

The `Typecheck` step emitted **1,384 primary diagnostics across 407 distinct files**:

| code | count | | code | count |
| --- | --- | --- | --- | --- |
| TS2339 property does not exist | 495 | | TS2322 not assignable | 180 |
| TS2769 no overload matches | 265 | | TS2589 type instantiation too deep | 163 |
| TS2345 argument not assignable | 161 | | TS18047 possibly null | 26 |

File concentration: `lib` 157, `app` 148, `components` 74, `hooks` 18, `contexts` 10;
`lib/services/**` + `lib/venue/**` alone account for 132 files.

The three database objects named in the lane brief are present in the log exactly as
described, as *arguments that do not exist in the generated type surface*:

```
lib/services/staff-job-board.service.ts(491,48): error TS2345:
  Argument of type '"get_staff_dashboard_stats"' is not assignable to parameter of type
  '"_tourify_has_columns" | "accept_org_invite" | … | "write_venue_lifecycle_audit"'.

Argument of type '"venue_crew_members"' is not assignable to parameter of type
  '"accounts" | "profiles" | "achievements" | … | "world_track_places"'.

Argument of type '"venue_team_contractors"' is not assignable to parameter of type … (same union)
```

`venue_crew_members`, `venue_team_contractors`, and `get_staff_dashboard_stats` are absent
from the generated Supabase type union, and the TS2339/TS2345/TS2322 flood across
`lib/services/**`, `lib/venue/**`, `app/api/**`, and `components/**` is the same class of
defect: **a generated database type surface that has drifted from the migration chain.** That
is `database`-lane work (`types/database.types.ts` and `supabase/**` are outside release
ownership), handed off as `HF-RELEASE-DB-TYPECHECK`.

The related `Database Types` job in the same run failed earlier, at `supabase start`, so
`check:migration-chain` and `check:database-types` never ran. The two failures are consistent
with one root cause: the generated type surface is not currently in sync with the migrations.

**The release gate is behaving correctly and must not be bypassed.** Do not add
`continue-on-error`, do not add `if: always()` to the downstream steps, and do not relax
`tsconfig` strictness to make `Lint And Build` green. The only correct fix is the upstream
schema/type correction owned by `database`.

### One consequence worth recording

Because the whole remainder of the release gate is sequenced after `Typecheck`, this PR has
**no production-build evidence at all**: the `Build` step (`npm run build:vercel`) was
skipped. RELEASE-006's "type checking and production build complete deterministically from a
fresh checkout" remains unproven on `d2176904`, and it can only be observed once typecheck
passes. This is deliberate fail-fast and is being left intact.

---

## (iv) `CodeQL` fails but has no retrievable job

### What the check actually is

`106862973938` is a **check-run ID, not a job ID**, which is exactly why
`gh run view --job 106862973938` returns `HTTP 404: Not Found`. There is no workflow run
behind it.

```
GET /repos/KyleQD/Tourify/check-runs/106862973938
  name:          CodeQL
  html_url:      https://github.com/KyleQD/Tourify/runs/106862973938
  app:           { id: 57789, slug: "github-advanced-security",
                   name: "GitHub Advanced Security" }
  check_suite:   96831076767
  started_at:    2026-09-22T17:40:46Z
  completed_at:  2026-09-22T17:40:53Z        (7 s)
  output.title:  "48 new alerts including 1 critical severity security vulnerability"
  output.summary: "New alerts in code changed by this pull request
                    Security Alerts: * 1 critical * 27 high * 20 medium
                    _Alerts not introduced by this pull request might have been detected
                    because the code changes were too large._"
  annotations_count: 48
```

```
GET /repos/KyleQD/Tourify/check-suites/96831076767
  app:  github-advanced-security
  before: 72107cee93ee734edf7725f2fce7936114053d22
  after:  d21769046d517898144ee09a1c7bb4a7d36b068f
  pull_requests: [14]
```

It is the **GitHub Advanced Security code-scanning PR gate**: the platform analyses the PR
head, diffs the result against the base, and fails the check when new alerts appear. The 7-second
duration is the gate evaluation, not an analysis run. It is a distinct surface from the
repository's own workflow job.

### Two different CodeQL surfaces, and only one failed

`.github/workflows/security-scans.yml` runs its own CodeQL job with the **same**
`security-extended` query suite, and that job **passed**:

```
jobs.codeql  (name: "CodeQL (JavaScript/TypeScript)")
  uses: github/codeql-action/init@v4      languages: javascript-typescript
                                          queries: security-extended
  uses: github/codeql-action/analyze@v4   category: /language:javascript-typescript
  -> SUCCESS (run 35761777850, job 106861311612, 17:36:14 -> 17:40:57)
```

They differ in what they assert. The workflow job's conclusion reports whether the analysis
*ran and uploaded its SARIF*; the platform check is the one that asserts *no new alerts*.
`security-scans.yml` is correct and needs no change.

### It is a real alert set and is not being dismissed

96 alerts are open and undispositioned on this PR (`dismissed_reason: null` on all sampled
alerts, 0 dismissed):

| rule | count | | rule | count |
| --- | --- | --- | --- | --- |
| `js/client-side-request-forgery` | 18 | | `js/log-injection` | 2 |
| `js/insecure-randomness` | 15 | | `js/insufficient-password-hash` | 2 |
| `js/user-controlled-bypass` | 14 | | `js/clear-text-storage-of-sensitive-data` | 2 |
| `js/xss-through-dom` | 10 | | `js/clear-text-logging` | 2 |
| `js/incomplete-url-substring-sanitization` | 6 | | `js/request-forgery` | **1** |
| `js/file-system-race` | 6 | | others (1 each) | 6 |

The single **critical** is alert `#16`, `js/request-forgery`, `error` / `critical` severity:

```
app/api/discover/route.ts:351 — "The URL of this request depends on a user-provided value."
```

Other high-severity clusters worth naming: `app/auth/callback/route.ts:37`,
`app/auth/confirm/route.ts:50`, `app/api/social/oauth/callback/route.ts:44`,
`lib/admin/content-hub/oauth-state.ts:96` (insecure password hashing), and
`hooks/use-multi-account.tsx:74` / `lib/services/venue.service.ts:180`
(clear-text storage of credential responses). This is a genuine security backlog and is
handed off as `HF-RELEASE-SEC-CODEQL`.

### Attribution caveat, stated precisely

```
GET /code-scanning/alerts?branch=main&state=open   -> 0
GET /code-scanning/alerts?branch=main&state=dismissed -> 0
GET /code-scanning/alerts?branch=main&state=fixed  -> 0
GET /code-scanning/analyses?ref=refs/heads/main    -> 0
GET /code-scanning/analyses?per_page=100 (5 pages) -> refs only: refs/pull/14/merge (9),
                                                       refs/pull/6/merge (8), refs/pull/5/merge (1),
                                                       refs/pull/4/merge (1)
```

`main` has **0 alerts in any state and 0 recorded analyses**. Every recorded CodeQL analysis in
this repository is against a `refs/pull/*/merge` ref. There is therefore **no `main` baseline**
for the platform gate to diff against, and the platform analysis of `d2176904` was the first
analysis of that tree. Combined with the PR's 900 changed files, the "new alerts in code
changed by this PR" heuristic attributes essentially the entire head tree to this PR — which
the check's own summary admits.

Only one file carrying a high-severity alert is actually in the PR's 900-file diff:
`__tests__/qa/campaign-actor-provisioner.test.ts`
(`js/incomplete-url-substring-sanitization`, #93). The critical
`app/api/discover/route.ts:351` is **not** in the diff, so it is pre-existing code newly
surfaced because this branch was analysed without a `main` baseline.

That caveat explains the *volume*; it does not dismiss any individual finding. All 96 need
owner triage — none is dismissed here.

---

## Branch protection and required checks on `main` (read-only)

```
GET /repos/KyleQD/Tourify/branches/main/protection   -> 200   (not 404)
  required_status_checks: { strict: true, contexts: [ 10 below ] }
  required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true, require_last_push_approval: true,
      require_code_owner_reviews: false }
  required_signatures: { enabled: false }
  enforce_admins: { enabled: true }
  required_linear_history: { enabled: true }
  allow_force_pushes: { enabled: false }
  allow_deletions:    { enabled: false }
  required_conversation_resolution: { enabled: true }
  lock_branch: { enabled: false }
  block_creations: { enabled: false }
```

**This is a material change from the recorded baseline.** STATE.md and RELEASE-005 both record
`GET /branches/main/protection` returning `404 Branch not protected`; that is no longer true.
`main` is now protected with strict required checks, 1 approving review, stale-review
dismissal, last-push approval, admin enforcement, linear history, no force pushes, no
deletions, and conversation resolution.

### Required checks on `main` and their state on PR #14

| Required check | PR #14 state | |
| --- | --- | --- |
| Production Debug Scan | SUCCESS | |
| Vitest | SUCCESS | |
| **Database Types** | **FAILURE** | blocking |
| **Lint And Build** | **FAILURE** | blocking |
| Unit Tests (Vitest) | SUCCESS | |
| **E2E Tests (Playwright)** | **CANCELLED** | blocking |
| Security exception governance | SUCCESS | |
| Secret scan | SUCCESS | |
| CodeQL (JavaScript/TypeScript) | SUCCESS | |
| Generate SBOM | SUCCESS | |

`mergeStateStatus: BLOCKED` is therefore fully explained by three required checks:
`Database Types`, `Lint And Build`, and `E2E Tests (Playwright)`. The `Vercel` and `CodeQL`
failures reported at the top of this record **do not block the merge**, because neither is a
required check.

### Non-required checks present on the PR

`Vercel Preview Comments` (SUCCESS), `Supabase Preview` (SKIPPED), `Dependency review`
(SUCCESS), `Migrations And RLS Matrix` (SUCCESS), `mobile-checks` (SUCCESS), `redirect-safety`
(SUCCESS), `Launch Certification (exact staging SHA)` (SKIPPED), `CodeQL` (Advanced Security,
FAILURE).

### Gaps against RELEASE-005 acceptance criterion 3

RELEASE-005 requires main to enforce "clean install, lint, typecheck, unit/integration tests,
**production build**, **migration checks**, **service-role audit**, security scan, and
critical E2E". Mapping the live configuration:

- **Enforced independently:** unit/integration tests (`Vitest`, `Unit Tests (Vitest)`),
  critical E2E (`E2E Tests (Playwright)`), security scan (`Secret scan`,
  `Security exception governance`, `CodeQL (JavaScript/TypeScript)`, `Generate SBOM`).
- **Enforced only as a step inside `Lint And Build`, not as its own required check:**
  clean install, lint, typecheck, **production build**, **migration checks**
  (`check:migration-validation`), **service-role audit** (`check:service-role-allowlist`),
  `check:admin-audit`, token-registry gate, contract tests, mobile typecheck/lint.
  Any earlier step failing — as `Typecheck` did here — masks all of them, including
  `Build`. This is the same evidence that left this PR with no production-build evidence.
- **Not represented at all:** the GitHub Advanced Security `CodeQL` gate, `Vercel`,
  `Dependency review`, and `Migrations And RLS Matrix` are not required checks.
- `required_signatures.enabled` is `false`, so commits are not required to be signed or
  verified.

**No branch-protection change was made.** The task record says
"Have the repository owner provision branch protection on main and record `e2e.yml` as a
required check; do not change this from the local task", and this lane was dispatched
read-only for this item. The gaps above are handed off as `HF-RELEASE-005-REQUIRED-CHECKS`.

---

## Commands run (all read-only)

| Command | Result |
| --- | --- |
| `gh pr view 14 --json ...statusCheckRollup` | 20 checks, `mergeStateStatus: BLOCKED` |
| `gh api repos/.../commits/d2176904/status` | 1 status: `Vercel` = failure |
| `gh api repos/.../check-runs/106862973938` | app `github-advanced-security`, 48 annotations |
| `gh api repos/.../check-runs/106862973938/annotations` | 48 annotations retrieved |
| `gh api repos/.../check-suites/96831076767` | app `github-advanced-security`, no workflow |
| `gh api repos/.../actions/jobs/106861310047` | step timings, 70m40s total |
| `gh run view --job 106861310047 --log` | 7,271 lines; 1,384 `error TS…` |
| `gh api repos/.../branches/main/protection` | 200; 10 required contexts |
| `gh api repos/.../code-scanning/alerts?pr=14` | 96 open, 1 critical (#16) |
| `gh api repos/.../code-scanning/alerts?branch=main` | 0 in any state |
| `gh api repos/.../code-scanning/analyses?ref=refs/heads/main` | empty |
| `gh api repos/.../pulls/14/files` (9 pages) | 900 changed files |
| `vercel whoami` | `kyleqdaley-4994` |
| `vercel inspect dpl_2zPXya6iLnXhdgDPeHu7mX3cbQdY` | readyState `Error`, `Builds . [0ms]` |
| `vercel inspect … --logs` | log to `Linting and checking validity of types` |
| `GET /v13/deployments/dpl_2zPXya6i…` | `BUILD_EXCEEDED_MAXIMUM_TIME`, 45.64 min |
| `GET /v9/projects/tourify-beta-k2` | `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`, aliases, env names |
| `vercel inspect` on CodeQL job id | `HTTP 404` — confirms 106862973938 is a check-run id |

No env var **value**, DSN, token, or secret was read, printed, or copied. The only Vercel
project response field used was the set of env var **names**.
