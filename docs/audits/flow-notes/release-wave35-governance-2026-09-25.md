# Wave 35 release-lane governance: CI restructure, required-check decision, `main` code-scanning baseline

- Date: 2026-09-25
- Branch / HEAD: `codex/qa004-staging-campaign` @ `ca3bb0b0` (Waves 32–34 committed)
- Lane: `release`
- Supersedes nothing. Extends `docs/audits/flow-notes/release-pr14-check-triage-2026-09-25.md`
  (Wave 32, `REL-001`), which was read-only.

**What changed:** exactly one code file, `.github/workflows/ci.yml`. Everything else is
records, decisions, and handoffs. **Not changed:** any product file, any hosted
environment, any branch-protection setting, any code-scanning analysis or alert,
any lockfile, and `.github/workflows/e2e.yml`. No git history operation was
performed. No credential, token, DSN, or hosted value was read, printed, or
fabricated; the only environment data touched was the set of variable **names** in
`deployment/*.env`.

---

## 1. The CI restructure

### 1.1 The defect being fixed

On CI run `35761777731` (head `d2176904`) the whole release gate was one job.
Step 11 `Typecheck` failed and GitHub marked every later step `skipped`:

```
job 106861310047  "Lint And Build"  17:36:14Z -> 18:46:54Z  (70m40s, failure)
  step  7 Install dependencies          17:36:48 -> 17:37:29   success   41s
  step  9 Lint                         17:37:30 -> 17:38:18   success   48s
  step 10 ESLint warning no-growth     17:38:18 -> 17:38:34   success   16s
  step 11 Typecheck                    17:38:34 -> 18:46:52   FAILURE  68m18s
  step 12 Migration validation lint    18:46:52               skipped
  step 13 Admin API route registry     18:46:52               skipped
  step 14 Legacy tour route inventory  18:46:52               skipped
  step 15 Service-role allowlist       18:46:52               skipped
  step 16 Admin workflow registry      18:46:52               skipped
  step 17 Token registry gate          18:46:52               skipped
  step 18 Dependency audit (critical)  18:46:52               skipped
  step 19 Contract tests               18:46:52               skipped
  step 20 Install mobile dependencies  18:46:52               skipped
  step 21 Mobile typecheck             18:46:52               skipped
  step 22 Mobile lint                  18:46:52               skipped
  step 23 Unit tests (Jest)            18:46:52               skipped
  step 24 Mobile redirect safety       18:46:52               skipped
  step 25 Auth callback redirect smoke 18:46:52               skipped
  step 26 Venue operations safeguard   18:46:52               skipped
  step 27 Build                        18:46:52               skipped
```

Fifteen release-gate steps **plus the production build** were unobservable. The
production build, `check:migration-validation`, and
`check:service-role-allowlist` — three of the nine things RELEASE-005 acceptance
criterion 3 requires `main` to enforce — existed only as post-`Typecheck` steps in
one job.

### 1.2 Job boundaries after the restructure

`ci.yml` now has **11 independent jobs**. No job has a `needs:` relationship, so a
failure in one never suppresses another.

| # | Job key | Reported context | Evidence class | Was |
| - | - | - | - | - |
| 1 | `production-debug` | `Production Debug Scan` | unsafe-route scan | unchanged |
| 2 | `vitest` | `Vitest` | full Vitest | unchanged |
| 3 | `database-types` | `Database Types` | live chain + generated types | unchanged (cap added) |
| 4 | `checks` | `Lint And Build` | clean install, lint, ESLint budget, critical audit, typecheck | trimmed to one class |
| 5 | `migration-gates` | `Migration Gates` | `check:migration-validation` | **was step 12, masked** |
| 6 | `service-role-audit` | `Service-Role Audit` | `check:service-role-allowlist` + `check:admin-audit` | **was steps 15–16, masked** |
| 7 | `registry-gates` | `Route And Registry Gates` | admin route registry, legacy tour inventory, token registry | **was steps 13–14, 17, masked** |
| 8 | `regression-safeguards` | `Regression Safeguards` | contract tests, mobile redirect, auth callback, venue ops | **was steps 19, 24–26, masked** |
| 9 | `jest-unit` | `Jest Unit Tests` | `npm test` (Jest) | **was step 23, masked** |
| 10 | `mobile-parity` | `Mobile Typecheck And Lint` | mobile install/typecheck/lint | **was steps 20–22, masked** |
| 11 | `build` | `Production Build` | `npm run build:vercel` | **was step 27, masked** |

### 1.3 No gate was weakened — proven, not asserted

A mechanical set-difference of every `npm run …` / `npm test` / `npm ci` /
`npm audit` invocation before and after the change:

```
--- scripts in OLD but not in NEW (must be empty) ---
(none)
--- scripts in NEW not in OLD (additions) ---
(none)
--- gate-weakening scan over the new file ---
  continue-on-error      absent
  if: always             absent
  || true                absent
  || echo                absent
  ignoreDuringBuilds     absent
  --audit-level=high     absent
  ignoreBuildErrors      1 occurrence — inside a comment, quoting next.config.ts
```

Every check that ran before still runs. `npm audit --audit-level=critical`
(deliberately *not* raised to `high`) **moved up** from step 18 to step 9, ahead
of `Typecheck`, so it is no longer maskable — strictly more coverage than before.

### 1.4 Required context names are contract, not style

`main` requires ten status-check contexts. GitHub matches them by the check's
reported **name**. Renaming or removing any of them makes the required context
stop reporting and blocks every future merge of `main`. The four that live in
`ci.yml` are reproduced byte-for-byte in the new file, and that is asserted
mechanically, not by eye:

```
Production Debug Scan  PRESENT
Vitest                 PRESENT
Database Types         PRESENT
Lint And Build         PRESENT
```

The other six come from `e2e.yml` (`Unit Tests (Vitest)`, `E2E Tests
(Playwright)`) and `security-scans.yml` (`Security exception governance`,
`Secret scan`, `CodeQL (JavaScript/TypeScript)`, `Generate SBOM`). Neither file
was modified.

### 1.5 Timeouts — measured versus provisional

Every cap is annotated in the file itself. Sources: CI run `35761777731` job
`106861310047`, E2E run `35761778422` job `106862321148` (both `d2176904`,
`ubuntu-latest`, 4 cores / 16 GB), and Vercel deployment
`dpl_2zPXya6iLnXhdgDPeHu7mX3cbQdY` (4 cores / 8 GB).

| Job / step | Cap | Basis | Status |
| - | - | - | - |
| `Production Debug Scan` | 15 min job | 56 s whole job, green | measured, 16× headroom |
| `Vitest` | 20 min job | 119 s whole job, green (5 317 tests) | measured, 10× |
| `Database Types` | 25 min job | **no green run** (failed at `supabase start`, 129 s). Derived from green `Migrations And RLS Matrix` = 172 s with a full chain apply, scaled for a full `supabase start` + 2 checks | **provisional** |
| `Lint And Build` | 125 min job | 76 s setup+install, 48 s lint, 16 s budget, 4098 s typecheck | mixed |
| └ `Typecheck` step | 115 min | **68 m 18 s measured on a FAILING tree** (1 384 diagnostics / 407 files). 115 min = 1.69× the only observation | **provisional** |
| `Migration Gates` | 15 min job | no isolated green run; nearest green neighbour does strictly more work in 172 s | **provisional** |
| `Service-Role Audit` | 15 min job | no job-level green run; last local `check:service-role-allowlist` exit 0 over 195 files | **provisional** |
| `Route And Registry Gates` | 15 min job | green `redirect-safety` = 57 s for install + 2 of these 3 scripts | **provisional** |
| `Regression Safeguards` | 15 min job | green `redirect-safety` = 57 s bounds 2 of the 4 steps | **provisional** |
| `Jest Unit Tests` | 20 min job | suite measured 4.199 s / 109 suites / 681 tests locally (RELEASE-005, 2026-09-21); cost is the install | **provisional** |
| `Mobile Typecheck And Lint` | 15 min job | green `mobile-checks` = 85 s, a strict superset of these steps | measured, 10× |
| `Production Build` | 150 min job / 140 min step | see 1.6 | **provisional** |

Also added: a workflow-level `defaults.run.timeout-minutes: 30`, so no `run`
step can silently consume GitHub's 360-minute default. Only two steps are raised
above it (`Typecheck` 115, `Build` 140) and both overrides are visible on the step.

**Every "provisional" row names the single green run that would replace it.**
After the first green run of that job, set the job cap to `ceil(1.25 × green
whole-job duration)` and stop. Until then no claim is made that any of these
jobs *completes* inside its budget — only that the budget is not the thing that
fails first.

### 1.6 The `Production Build` cost model, stated with its unmeasured part visible

| Phase | Value | Source |
| - | - | - |
| clean install + toolchain + env contract | 76 s | **measured** (job `106861310047` steps 1–8) |
| webpack compile | 264 s | **measured**, and on Vercel's *slower* 4-core/8 GB box (`✓ Compiled successfully in 4.4min`). A 4-core/16 GB `ubuntu-latest` is not slower |
| inline typecheck | 4 098 s | **measured** (68 m 18 s). Unavoidable: `next build` runs a full-repo `tsc` because `next.config.ts` sets `typescript.ignoreBuildErrors: false` |
| static generation / prerender | 2 700 s budgeted | **UNMEASURED.** The `Build` step has never once completed on this repository. 45 min is deliberately over-generous; the lane will not present a guess as a measurement |
| total | 7 138 s ≈ 119 min | step cap 140, job cap 150 |

### 1.7 The PR E2E job: read, coordinated, not overwritten

`.github/workflows/e2e.yml` is QA-owned (QA-032). Its current state, read at
`ca3bb0b0`:

- job cap 115 min; `Build app` 80, `Wait for app` 5, `Run E2E tests` 25
- `PLAYWRIGHT_BASE_URL: http://localhost:3000` pinned to the artifact this job builds
- a `Refuse a hosted E2E target (fail closed)` step that exits 1 if `STAGING_URL` is set

**This lane did not modify it.** QA-032 explicitly recommended decoupling the
production build from the PR E2E job and recorded that it edits shared release
files. The decoupling this lane can deliver, and did, is at the release-gate
level: the production build, the migration gates and the service-role audit are
independent jobs, so a PR now gets production-build evidence even while
typecheck is red. The E2E job no longer depends on any release-gate step and never
did.

**What could not be decoupled from release-owned files, and why.** The
`~74 min` cost inside the E2E job is `next build`'s *inline* typecheck. It can
only be removed by one of four things, and all four are rejected here:

1. Set `typescript.ignoreBuildErrors: true` in `next.config.ts` — **weakens a
   gate** and is not release-owned. Rejected.
2. Let the E2E job download the `Production Build` artifact via `workflow_run`.
   A `workflow_run`-triggered workflow runs the default branch's workflow file
   with repository secrets attached, which is the well-known privilege-escalation
   pattern for pull-request code. Introducing it as a *time-budget* fix trades a
   scheduling problem for a security one. Rejected.
3. Drop the E2E job's build and point it at a hosted target — destroys QA-032's
   fail-closed design, which exists precisely because the old
   `secrets.STAGING_URL || localhost` fallback let a pull request retarget its
   mutating specs at a hosted environment. Rejected.
4. Raise the E2E job's caps. Legitimate, but it is QA's file.

**Declared conflict, item 4, with the arithmetic.** The QA-032 `Build app` cap of
80 min sits against a measured expected build of 75.5 min
(`76 s install + 264 s compile + 4 098 s typecheck` = 4 458 s = 74.3 min, plus the
build's own inline ESLint ≈ 48 s ≈ 75.1 min). That is **~6 % headroom on a
measured estimate derived from a *failing* tree**. It is a plausible cap, not a
false-red guarantee. Recommendation for the QA lane, not applied here: raise
`Build app` to 95 and the job cap to 130, then tighten both to
`ceil(1.25 × measured green build)` after the first green run. Raised as
`HF-QA-035-E2E-BUILD-HEADROOM`.

### 1.8 Verification actually run for the restructure

| Command | Result |
| - | - |
| `js-yaml` parse of all 16 workflows | pass, 0 failures; `ci.yml` = 11 jobs |
| structural check: every job has `runs-on` and a `timeout-minutes` | pass, 0 problems |
| every `npm run X` in the new file exists in `package.json` | pass, 23/23, 0 missing |
| `${{ … }}` expression balance | pass, 11 / 11 |
| old-vs-new script set difference | 0 removed, 0 added |
| `continue-on-error` / `if: always()` / `|| true` / `|| echo` / `ignoreDuringBuilds` / `--audit-level=high` | 0 occurrences |
| required-context name presence assertion | 4/4 present |
| `node --test scripts/ci/release-workflow-contract.test.mjs` | 2/2 pass |
| `git diff --check -- .github/workflows/ci.yml` | exit 0 |

`actionlint` is not installed in this workspace, so no lint-level schema check was
possible. The YAML parses, every referenced script exists, and the job graph has
no `needs:` edges, but a real `actionlint` pass on the first CI run is still
wanted.

---

## 2. Required-check posture — decision and exact procedure

**Nothing below was executed. Every item that touches hosted branch protection
needs owner authorization and owner execution.**

### 2.1 Current enforced set (verified read-only 2026-09-25)

`GET /repos/KyleQD/Tourify/branches/main/protection` → **200**

```
required_status_checks.strict            true
required_status_checks.contexts          10  (listed in §1.4)
required_approving_review_count          1
dismiss_stale_reviews                    true
require_last_push_approval               true
enforce_admins                           true
required_linear_history                  true
allow_force_pushes.enabled               false
allow_deletions.enabled                  false
required_conversation_resolution         true
required_signatures.enabled              false
```

`required_signatures.enabled` is `false`: commits are not required to be signed
or verified. Recorded, not changed.

### 2.2 Decisions

| # | Candidate | Decision | Rationale |
| - | - | - | - |
| D1 | Advanced Security `CodeQL` gate | **Do not require yet. Require in a second, later step.** | It is the only check on the PR carrying a security verdict (96 open alerts, 1 critical) and today it cannot function as a *regression* gate — see §3. Requiring it now would block every merge for a reason that measures PR size, not risk. Requiring it *before* the `main` baseline exists would institutionalise the attribution bug. Sequence: baseline (§3) → alert triage (`HF-RELEASE-SEC-CODEQL`) → then require. |
| D2 | `Dependency review` | **Require.** | Runs on every pull request (`if: github.event_name == 'pull_request'`, no path filter), already green, already `fail-on-severity: critical`. It is the cheapest genuinely new enforcement available and it cannot produce a non-reporting context. |
| D3 | `Migrations And RLS Matrix` | **Do not require as configured.** | `admin-rls-ci.yml` is **path-filtered** to `supabase/migrations/**`, `lib/testing/**`, `__tests__/admin/rls-persona-matrix.test.ts`, and itself. A pull request that changes none of those produces no such context, and a required context that does not report blocks the merge. Requiring it now would brick `main` on the first unrelated PR. Either widen the trigger to unconditional, or do not require it. **Widening the filter is release-owned and is recommended**, but it was not changed in this wave because it would also make a ~3-minute Supabase stack boot run on every PR and that cost decision is the owner's. |
| D4 | `mobile-checks` | **Do not require as configured.** | `mobile-ci.yml` is path-filtered to `apps/mobile/**`, `app/api/**`, `lib/api/**`, `lib/auth/**`, `lib/connect/**`, `packages/api-contracts/**`. A pull request touching only `components/**` reports no such context. Same bricking hazard as D3. |
| D5 | `redirect-safety` | **Do not require as configured.** | `mobile-redirect-safety.yml` is path-filtered to two auth route files, one lib file, two scripts, `package.json`, and itself. Narrowest filter of the three. Same hazard. |
| D6 | New independent jobs (5–11 above) | **Require `Production Build`, `Migration Gates`, `Service-Role Audit`. Require `Jest Unit Tests`, `Route And Registry Gates`, `Regression Safeguards`. Do not require `Mobile Typecheck And Lint` until its path filter is widened.** | These are exactly the release-gate evidence classes RELEASE-005 criterion 3 names and which were masked on 2026-09-22. `Mobile Typecheck And Lint` is excluded for the same non-reporting reason as D4. |
| D7 | `required_signatures` | **Leave `false`; recommend the owner enable it.** | Out of agent authority, and a signing policy is an owner/compliance decision, not a CI decision. |

### 2.3 The exact owner procedure — one atomic `PUT`, no interim gap

GitHub's branch-protection endpoint **replaces** `required_status_checks.contexts`
wholesale; it does not append. So the change below is a single atomic operation
and there is no window in which coverage is weaker than today. Running it as a
sequence of partial edits *would* create such a window, which is why it is
specified as one call.

```bash
# 1. Read the CURRENT set and keep it verbatim. Do not hand-type it.
gh api repos/KyleQD/Tourify/branches/main/protection \
  --jq '.required_status_checks' > /tmp/protection-before.json

# 2. Build the new set = current 10 + the 6 unconditional new jobs.
#    Deliberately EXCLUDED, with reasons recorded in REL-003:
#      - the Advanced Security "CodeQL" gate        (no main baseline yet, §3)
#      - "Migrations And RLS Matrix"                (path-filtered, D3)
#      - "mobile-checks"                            (path-filtered, D4)
#      - "redirect-safety"                          (path-filtered, D5)
#      - "Mobile Typecheck And Lint"                (path-filtered, D6)
node -e '
  const fs = require("fs")
  const before = JSON.parse(fs.readFileSync("/tmp/protection-before.json", "utf8"))
  const add = [
    "Production Build",
    "Migration Gates",
    "Service-Role Audit",
    "Jest Unit Tests",
    "Route And Registry Gates",
    "Regression Safeguards"
  ]
  const contexts = [...new Set([...before.contexts, ...add])]
  const body = {
    required_status_checks: { strict: before.strict, contexts },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_last_push_approval: true
    },
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    required_conversation_resolution: true
  }
  fs.writeFileSync("/tmp/protection-body.json", JSON.stringify(body))
  console.error(`${before.contexts.length} -> ${contexts.length} contexts`)
'

# 3. REVIEW the diff, then apply. This is the only mutating call.
diff <(jq -r '.contexts[]' /tmp/protection-before.json) \
     <(jq -r '.required_status_checks.contexts[]' /tmp/protection-body.json)

gh api -X PUT repos/KyleQD/Tourify/branches/main/protection \
  -H 'Accept: application/vnd.github+json' \
  --input /tmp/protection-body.json

# 4. Read back and confirm all 16 contexts are present.
gh api repos/KyleQD/Tourify/branches/main/protection \
  --jq '.required_status_checks.contexts[]'
```

**Timing constraint.** The six new contexts only start reporting once a
pull request runs the restructured `ci.yml`. Apply the `PUT` in the same window
as the merge of the branch carrying this restructure, or the first merge after it
will be blocked by six required contexts that have not yet reported. If the owner
cannot do both together, land the merge first and apply the `PUT` immediately
after — the interim state is the *old* 10 contexts, which is exactly today's
enforcement, not a weaker one.

**This lane did not execute any of the above.** No branch-protection setting was
read for mutation, no `PUT` was issued, and no protection state was changed.

---

## 3. The missing `refs/heads/main` code-scanning baseline

### 3.1 Symptom

```
GET /code-scanning/analyses?ref=refs/heads/main                  -> 0
GET /code-scanning/alerts?branch=main&state=open                 -> 0
GET /code-scanning/alerts?branch=main&state=dismissed            -> 0
GET /code-scanning/alerts?branch=main&state=fixed                -> 0
```

All 19 recorded analyses, enumerated across five pages, are `refs/pull/*/merge`:

```
refs/pull/14/merge  x9   CodeQL 2.27.0  /language:javascript-typescript
refs/pull/6/merge   x8   CodeQL 2.26.3
refs/pull/5/merge   x1   CodeQL 2.26.2
refs/pull/4/merge   x1   CodeQL 2.26.2
```

There is no baseline for the platform gate to diff against, so the Advanced
Security check's "48 new alerts" figure measures the size of a 900-file
pull request, not introduced risk. 94 of the 96 open alerts sit in files the pull
request never touched, and the single critical (`app/api/discover/route.ts:351`,
`js/request-forgery`) is not in the diff at all.

### 3.2 Root cause — neither of the two hypotheses in the brief

The brief offered two candidates: *main has not been pushed since the workflow was
added*, or *the SARIF upload is not landing*. **Both are false, and the real cause
is a third thing.**

```
$ git ls-tree --name-only origin/main .github/workflows/
.github/workflows/android-native-release.yml
.github/workflows/android-ota-production.yml
.github/workflows/ci.yml
.github/workflows/deploy-demo.yml
.github/workflows/deploy-production.yml
.github/workflows/e2e.yml
.github/workflows/mobile-ci.yml
.github/workflows/mobile-ios-release.yml
.github/workflows/mobile-ota-production.yml
.github/workflows/mobile-preview-release.yml
.github/workflows/mobile-redirect-safety.yml
.github/workflows/supabase-migrations-production.yml
.github/workflows/supabase-migrations-staging.yml
                                <-- 13 files. security-scans.yml is NOT one of them.

$ git log -1 --format='%H %ad' --date=iso origin/main
76d8389ebf939cee70f7070abf74a6bacc46f5de 2026-07-19 21:42:35 -0700

$ gh api repos/KyleQD/Tourify/branches/main --jq '{sha, protected}'
{"sha":"76d8389ebf939cee70f7070abf74a6bacc46f5de","protected":true}
```

**`.github/workflows/security-scans.yml` has never been on `main`.** It was
introduced in commit `be313ca2` (2026-08-04, the event-discovery phase-1 work) on
a feature branch that was never merged. GitHub Actions only runs workflow files
present in the tree of the pushed commit, so the workflow's
`on: push: branches: [main]` trigger **has never existed on the default branch and
has never had an opportunity to fire**. `main` *was* pushed — 2026-07-20, months
after — but with a tree that has no CodeQL workflow in it. The same applies to the
`schedule: cron "23 9 * * 1"` trigger: the run list contains zero `schedule`
events.

**The SARIF upload is working.** The `pull_request` analyses exist, with the right
tool (`CodeQL`), version (`2.27.0`), and category
(`/language:javascript-typescript`). The mechanism is fine; only the *ref* is
wrong. The `Security scans` workflow therefore has only ever run as
`pull_request`, and a `pull_request` run analyses `refs/pull/N/merge`, never
`refs/heads/main`.

### 3.3 A second-order consequence that matters more than the baseline

Four of the ten required contexts on `main` — `Security exception governance`,
`Secret scan`, `CodeQL (JavaScript/TypeScript)`, `Generate SBOM` — are produced
**only** by `security-scans.yml`, which is **not on `main`**. Consequences:

- The required contexts are currently satisfied on pull requests only, because the
  file is present in the pull request. That is why the branch is not already
  bricked.
- There is **zero evidence that those four gates have ever been validated on the
  `push: main` path.** Their `push`/`schedule` triggers are untested in this
  repository.
- The four security contexts are, in the strict sense, satisfiable only while this
  branch exists. Any change that removes `security-scans.yml` from `main` would
  silently make four required contexts unproducible and block all future merges.
  That is a coupling worth recording rather than discovering.

### 3.4 Remediation — exact procedure, owner-executed

No analysis configuration, branch configuration, or alert was changed by this
lane, and **no alert was dismissed**.

1. **Merge a branch that contains `security-scans.yml` to `main`.** That first
   push is what creates the `refs/heads/main` analysis. There is no configuration
   toggle that substitutes for it: a repository's own workflow is the only thing
   that uploads a SARIF against a named ref here.
2. **Confirm the trigger fired** on the `push` event:
   ```bash
   gh run list --repo KyleQD/Tourify --workflow security-scans.yml \
     --event push --branch main --limit 5 \
     --json databaseId,event,headBranch,headSha,conclusion
   ```
   Expect `event: push`, `headBranch: main`. If this list is empty, the workflow
   did not run on `main` and steps 3–5 will not happen either.
3. **Confirm the baseline analysis now exists:**
   ```bash
   gh api "repos/KyleQD/Tourify/code-scanning/analyses?ref=refs/heads/main" \
     --jq '.[] | "\(.ref) \(.tool.name) \(.commit_sha[0:8]) \(.created_at)"'
   ```
   Must be non-empty. This is the single check that proves the defect is closed.
4. **Confirm the repository code-scanning configuration points its default /
   analysis target at `main`** (read-only inspection, no change):
   ```bash
   gh api repos/KyleQD/Tourify/code-scanning --jq '{default_branch, setup:.advanced_security}' 2>/dev/null || \
   gh api repos/KyleQD/Tourify/code-scanning/default-setup
   ```
   If the recorded default branch is not `main`, the platform gate will diff
   against the wrong base regardless of the SARIF.
5. **Re-read the PR gate on the next pull request.** Once a `main` analysis
   exists, the Advanced Security check diffs against it and reports only genuinely
   new alerts. Expect the count to drop sharply and expect the *absolute* open
   count on `main` to be the real pre-existing backlog:
   ```bash
   gh api "repos/KyleQD/Tourify/code-scanning/alerts?branch=main&state=open&per_page=100" \
     --jq 'length'
   ```
   That number, not 96, is the security backlog the owner must triage, and it
   belongs in `HF-RELEASE-SEC-CODEQL`.
6. **Only then** apply decision D1 (require the Advanced Security `CodeQL` gate),
   and only alongside a per-alert fix-or-exception disposition, per CP-060.

**Interim posture, stated plainly.** Until step 3 returns non-empty, the Advanced
Security `CodeQL` gate is **not** a valid regression gate for this repository and
its alert count must not be read as newly introduced risk. That is a governance
fact about the pipeline, not a statement about any individual finding: the one
critical and all 96 alerts remain undispositioned, and the code fixes Wave 33/34
landed for `app/api/discover`, `app/api/hub` and `lib/news/feed-service.ts` are
**not** confirmed closed until GitHub reports a new analysis.

---

## 4. Stale records corrected, with the evidence that proved them stale

| Record | Stale claim | Evidence it is stale | Correction |
| - | - | - | - |
| `agents/release/STATE.md:29` | "GitHub branch-protection lookup for `main` returned 404. No required-check enforcement evidence exists" | `GET /branches/main/protection` → 200 with 10 strict contexts | corrected in place with the live configuration and the date |
| `agents/release/STATE.md:403` | "the main-branch protection endpoint still returns 404 `Branch not protected`" | same | corrected in place, marked superseded |
| `agents/release/STATE.md:436` | "main branch protection is absent" | same | corrected in place |
| `agents/release/STATE.md:521-522` | "STATE.md and RELEASE-005 both still record `404 Branch not protected`; that baseline is obsolete" | the statement was correct; it is now **acted on** | rewritten to record that the correction has been applied |
| `tasks/active/RELEASE-005.json:74` (evidence, dated 2026-09-09) | "returned 404: main is not branch-protected" | was true on that date | **appended** a superseding evidence line; the dated observation is preserved rather than rewritten, because rewriting a dated measurement is falsifying the record |
| `tasks/active/RELEASE-005.json:80` (evidence, dated 2026-09-20) | "still returns 404 Branch not protected" | was true on that date | same treatment |
| `tasks/active/RELEASE-005.json` `progress.blockers[2]` | "main branch protection and the complete required-check set are not verified or enforced" | protection is verified and 10 contexts are enforced | corrected in place |
| `tasks/active/RELEASE-005.json` `progress.checkpoints[5]` summary | ends "main branch protection and the complete required-check set are not verified or enforced" as a *live* blocker list | same | checkpoint's dated evidence left intact; a new checkpoint records the correction |
| `tasks/active/RELEASE-007.json:52` (evidence, dated 2026-09-22) | "main branch protection returned 404" | was true on that date | appended a superseding line |
| `tasks/active/RELEASE-007.json:47` (`audit baseline`) | "main has no branch protection" | superseded | corrected in place as an audit baseline |
| `agents/release/CHARTER.md` | — | grep for `404` / `protect` returns nothing | **verified to carry no stale claim**; nothing to correct |
| `agents/release/{BASELINE,GAPS,QUESTIONS,VERIFICATION,INTERFACES,ARCHITECTURE,BACKLOG}.md` | — | grep returns no branch-protection or Vercel-binding claim | **verified clean** |

### 4.1 The two Vercel facts, reconciled

| Claim | Status |
| - | - |
| `tourify-beta-k2` (`prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`) is the **production** Vercel project | **Confirmed.** `GET /v9/projects/tourify-beta-k2` → `link.type github`, `link.productionBranch main`, `targets.production.alias` = `[tourify.live, demo.tourify.live, www.tourify.live, tourify-beta-k2-….vercel.app, tourify-beta-k2-git-main-….vercel.app]` |
| its aliases include `tourify.live`, `www.tourify.live` **and `demo.tourify.live`** | **Confirmed**, verbatim from the same response |
| therefore RELEASE-007 acceptance criterion 1 ("`demo.tourify.live` resolves only to isolated staging") is **unmet** | **Confirmed.** `demo.tourify.live` is a production alias, not an isolated staging target |
| PR preview builds land inside the production project | **Confirmed.** `d2176904` is a `target: preview` deployment with `projectId prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n` |
| `docs/DEPLOYMENT_ROUTINE.md` §4 forbids that | **Confirmed.** §4: "Vercel's Git integration must be configured so a push cannot auto-deploy or reassign the production domains outside this workflow; this hosted setting cannot be proven from repository code" |

**Remediation — owner-executed, not performed here.** `HF-RELEASE-007-VERCEL-HOSTED`
already carries the procedure. Restated in one place:

1. Disable the Vercel Git integration on `tourify-beta-k2`, **or** reassign the
   repository link to the staging project `tourifydemo`. Until one of these
   happens, any branch — including an untrusted one — can produce a deployment
   inside the production project.
2. Remove `demo.tourify.live` from `tourify-beta-k2`'s production alias list and
   bind it only to the isolated staging project.
3. Re-verify that the two aliases resolve to different `dpl_` IDs:
   ```bash
   vercel inspect demo.tourify.live  --scope kyleqdaley-gmailcoms-projects
   vercel inspect tourify.live      --scope kyleqdaley-gmailcoms-projects
   # The two `dpl_` IDs must differ, and neither may be a PR preview target.
   ```
4. Only then can RELEASE-007 criterion 1 and `DEPLOYMENT_ROUTINE.md` §4 be
   claimed satisfied.

Note the ordering constraint: step 1 must complete before step 2, or removing the
alias while the Git integration is live leaves `demo.tourify.live` unbound with no
way to roll back quickly.

---

## 5. Blocking preconditions recorded as preconditions

Both are operator-gated. Neither was actioned, approximated, or worked around, and
no hosted value was invented for either.

### 5.1 Database type regeneration — `HF-RELEASE-DB-TYPECHECK` is withdrawn, regeneration still cannot run

The database lane withdrew its own blocker: the active chain is now a proven
**superset** of the generated contract (13 relations, 54 columns, 42 callables
**added** by the chain, **zero** contract-only entries), so regeneration would add
coverage and delete none. `lib/database.types.ts` is byte-unchanged.

Regeneration still cannot run from this workspace, and the reason is
**credential-gated, not permission-gated**:

- `supabase/.temp/linked-project.json` exists (keys `ref`, `name`,
  `organization_id`, `organization_slug`).
- `supabase/.temp/pooler-url` exists at 92 bytes and carries **no embedded
  password**.
- Docker is unavailable on this 8 GB machine.

`scripts/ci/database-types-source.mjs` documents three modes, and all three are
blocked:

| Mode | Command | Blocker |
| - | - | - |
| `local` (default) | `npm run generate:database-types` → `supabase gen types typescript --schema public --local` | needs Docker |
| `linked` | `SUPABASE_TYPE_SOURCE=linked npm run generate:database-types` → `--linked` | needs a database password; the pooler URL has none |
| `project-id` | `SUPABASE_TYPE_SOURCE=project-id SUPABASE_TYPE_PROJECT_ID=<ref> npm run generate:database-types` | still needs a database password for that project |

**Operator procedure** (owner, on a machine with Docker or a Supabase DB password):

```bash
# Option A — local stack (needs Docker):
docker compose -f docker/local/docker-compose.yml up -d
SUPABASE_TYPE_SOURCE=local npm run generate:database-types
npm run check:database-types

# Option B — an approved hosted target (needs a DB password the agent lane must
# never hold, copy, or fabricate):
SUPABASE_TYPE_SOURCE=linked npm run generate:database-types
npm run check:database-types
```

After regeneration, the confirming evidence is **not** the local command. It is a
green `Lint And Build` and a green `Database Types` job on the 16 GB CI runner.
This machine cannot measure the type surface at all: a full `tsc --noEmit` OOMs
here regardless of the heap flag, so CI is the only place the 1 384-diagnostic
count can be re-measured.

**What stays unprovable without a live target**, recorded so it is not mistaken
for covered:

- PostgREST schema-cache behaviour after a migration is applied (a stale cache
  yields zero rows and no error — the same failure shape as the search drift
  Wave 34 found in `app/api/search/enhanced/route.ts`).
- Real RLS against real data. The `Migrations And RLS Matrix` job proves the RLS
  matrix against a freshly built *ephemeral* stack; it does not prove the policies
  as applied on a long-lived hosted database with real rows.
- The 13 view relations whose columns are proven by **name occurrence** in the
  chain rather than by replaying the `SELECT` list. A view can reference a column
  name that exists in the chain and still select a different type, an aliased
  expression, or a subquery. Only a live `information_schema`/`pg_get_viewdef`
  read on the approved target resolves that, and this lane will not claim it.

### 5.2 `INTERNAL_API_ORIGIN` — blocking, and the templates do not carry it

`HF-DISC-002-INTERNAL-API-ORIGIN` (to `release`). The guard reads, in precedence
order, `INTERNAL_API_ORIGIN`, `NEXT_PUBLIC_APP_URL`,
`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`; it has **no fallback and no
localhost default**, so an environment with none of them set does not error — it
returns empty sections by design. `DISCOVER_ALLOW_LOCAL_UPSTREAM` must be left
**unset** in every deployed environment.

Affected surfaces: `GET /api/discover` (posts, events, music, suggestions, people,
albums, tours), `GET /api/hub` (discover + news + jobs), and the news feed's
external RSS candidates (`GET /api/news/feed`, `GET /api/feed/for-you`).

**New finding from this lane, read-only:** the committed deployment templates do
not carry any of the four variable names. Keys present in
`deployment/demo.env` and `deployment/production.env` (names only, no value read):

```
NODE_ENV, NEXT_PUBLIC_SITE_URL, DOMAIN, PORT,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
NEXTAUTH_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_DEMO_MODE, NEXT_PUBLIC_DEMO_DATA_ENABLED,
NEXT_PUBLIC_DEMO_BANNER_ENABLED, CACHE_TTL, MAX_CONCURRENT_USERS,
NEXT_TELEMETRY_DISABLED, RATE_LIMIT_REQUESTS_PER_MINUTE, RATE_LIMIT_REQUESTS_PER_HOUR,
SESSION_SECRET, MAX_FILE_SIZE, ALLOWED_FILE_TYPES, ENABLE_REAL_TIME_CHAT,
ENABLE_AI_RECOMMENDATIONS, ENABLE_SOCIAL_SHARING, ENABLE_HEALTH_MONITORING,
ENABLE_DEMO_TOUR, ENABLE_DEMO_RESET, DEMO_SESSION_TIMEOUT, DEMO_MAX_PROFILES,
DEMO_MAX_POSTS, DEMO_MAX_EVENTS
```

Neither `INTERNAL_API_ORIGIN`, nor `NEXT_PUBLIC_APP_URL`, nor
`VERCEL_PROJECT_PRODUCTION_URL`, nor `VERCEL_URL`, nor
`DISCOVER_ALLOW_LOCAL_UPSTREAM` appears. An operator who loads either template
and deploys will get the fail-closed empty response. **No key was added and no
value was written**, because the correct value is environment-specific and a
guessed origin would either be refused (useless) or, worse, allowlist something
that should not be reachable.

**Operator procedure** (owner; values are not supplied here):

```bash
# Production Vercel project (prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n):
vercel env add INTERNAL_API_ORIGIN production --scope kyleqdaley-gmailcoms-projects
# Staging project, after HF-RELEASE-007-VERCEL-HOSTED completes its step 1-2:
vercel env add INTERNAL_API_ORIGIN preview  --scope kyleqdaley-gmailcoms-projects

# GitHub environments, so the promotion workflows carry it too:
gh secret set INTERNAL_API_ORIGIN --env staging
gh secret set INTERNAL_API_ORIGIN --env production

# Then, per deployed environment, confirm:
#   /api/discover  -> sections.for_you non-empty, stats.trending_count > 0
#   /api/hub       -> metrics.headlines > 0
#   /api/news/feed -> at least one item with originType "external"
# An empty result WITHOUT the warning means the origin resolves but the upstream
# rejects. An empty result WITH the warning means the allowlist is still empty.
```

`INTERNAL_API_ORIGIN` must be a bare `scheme://host[:port]`. The guard rejects a
configured origin carrying a path, query, or fragment. Prefer it over
`VERCEL_URL`, which is a per-deployment value and changes on every preview deploy.

---

## 6. Commands run this wave, with results

| Command | Result |
| - | - |
| `gh api repos/KyleQD/Tourify/branches/main/protection` | 200; 10 strict contexts; `required_signatures.enabled` false |
| `gh api repos/KyleQD/Tourify/code-scanning/analyses?ref=refs/heads/main` | 0 |
| `gh api repos/KyleQD/Tourify/code-scanning/alerts?branch=main&state={open,dismissed,fixed}` | 0 / 0 / 0 |
| `gh api repos/KyleQD/Tourify/code-scanning/analyses?per_page=100` ×5 | 19 analyses, all `refs/pull/{14,6,5,4}/merge` |
| `gh api repos/KyleQD/Tourify/branches/main` | `sha 76d8389e…`, `protected true`, 2026-07-20 |
| `git ls-tree --name-only origin/main .github/workflows/` | 13 workflows; `security-scans.yml` absent |
| `git log --follow -- .github/workflows/security-scans.yml` | single commit `be313ca2`, 2026-08-04 |
| `gh run list --workflow security-scans.yml` | 19 runs, **all** `event: pull_request`; zero `push`, zero `schedule` |
| `gh api actions/runs/35761777731/jobs` | 4 jobs with timings |
| `gh api actions/jobs/106861310047` | 27 steps; step 11 failure at 68 m 18 s; steps 12–27 skipped |
| `gh api actions/runs/35761778422/jobs` | E2E job cancelled 17:39:01→18:09:21 (30 m 20 s) |
| `gh api actions/runs/35761777850/jobs` | 5 security jobs with timings |
| `gh api actions/runs/35761777855/jobs` | `Migrations And RLS Matrix` green in 172 s |
| `gh api actions/runs/35761777950/jobs` | `mobile-checks` green in 85 s |
| `gh api actions/runs/35761777909/jobs` | `redirect-safety` green in 57 s |
| `js-yaml` parse of all 16 workflows | 0 failures |
| `node --test scripts/ci/release-workflow-contract.test.mjs` | 2/2 pass |
| npm-script existence check on the new `ci.yml` | 23/23 present |
| `git diff --check` on every changed path | exit 0 |
| `npm run agents:validate` | see the task checkpoints |

Not run, and not claimed: full `tsc --noEmit`, full `next build`, the full test
suite, `npm run agents:generate`, any deployment, any `vercel` write call, any
`PUT` to branch protection, any code-scanning configuration change.
