# Qa decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## QA-032 — PR E2E gate: budget the measured build cost, attribute hangs, and close two fail-open holes

- Date: 2026-09-25
- Status: accepted
- Task: QA-003
- Decision: The failing `E2E Tests (Playwright)` check on PR #14 is a CI configuration defect, not a test or product defect. Three changes were made inside QA ownership (`.github/workflows/e2e.yml`, `playwright.config.ts`, QA test helpers). No product code was edited.

  1. **Budget and attribution.** The job cap moves from `30` to `115` minutes, with named step caps: `Build app` 80, `Wait for app` 5, `Run E2E tests` 25. The numbers are measured, not guessed: `next build` performs a full-repo ESLint and a full `tsc --noEmit` inline because `next.config.ts` sets `eslint.ignoreDuringBuilds: false` and `typescript.ignoreBuildErrors: false`, and the `ci.yml` `Lint And Build` job on the same SHA measured `Lint` at 48s and `Typecheck` at 68m18s. A 30m budget can never reach `npm run test:e2e`. A hung build now fails as `Build app` with a retained `build-app.log` instead of an ambiguous cancelled job.
  2. **No hidden hosted target.** `PLAYWRIGHT_BASE_URL` is pinned to `http://localhost:3000` and a `Refuse a hosted E2E target (fail closed)` step rejects a configured `STAGING_URL` before the expensive build. The old `${{ secrets.STAGING_URL || 'http://localhost:3000' }}` fallback let a pull-request run silently retarget its mutating specs at a hosted environment while `environment: staging` secrets stayed loaded.
  3. **A skip is not a pass.** `playwright.config.ts` gains `globalTimeout`, an explicit per-test `timeout`, a `list` reporter, and `tests/e2e/helpers/fail-on-skipped-reporter.ts`. Playwright exits 0 on an all-skipped run, so `05-west-coast-tour-flow.spec.ts` reported green while never executing, because its seed fixtures `docs/audits/qa-flow-{accounts,scenario}.json` are not tracked. QA-003 requires no accidental skips.

  A fourth defect was found and fixed: `playwright.config.ts` used `testDir: "./tests/e2e"`, which collected `tests/e2e/launch-certification/`. That spec loads its protected `QA_CERT_*` fixture at module scope, so `npm run test:e2e` aborted during collection with `Total: 0 tests in 0 files` in any environment without launch secrets. `testIgnore: ["**/launch-certification/**"]` separates the two suites; the launch suite keeps its own config and still enumerates 33 tests.
- Evidence: run `35761778422` job `106862321148` (build step cancelled after 28m38s; E2E steps 8-11 skipped; annotations `The job has exceeded the maximum execution time of 30m0s` and `The operation was canceled.`); last build log line `Linting and checking validity of types ...` at 17:43:47Z followed by 25m31s of silence; run `35761777731` job `106861310047` step 11 `Typecheck` 68m18s failure with 1384 TS errors across 189 files; local `npx playwright test --list` reproduced `Total: 0 tests in 0 files` before the `testIgnore` fix and `Total: 11 tests in 5 files` after.
- Consequences:
  - The gate is now fail-closed and attributable, but it is **not green and cannot be green from QA-owned files**. `next build` must fail while `typescript.ignoreBuildErrors` is false and the typecheck fails, so the E2E job will still report failure, now with the real cause visible. QA-003 stays `in_progress`; no certification is claimed.
  - The 1384-error typecheck failure and the `Database Types` failure (SQLSTATE 42501 while applying `20260413200000_port_missing_tables.sql`) are handed to `database` as `HF-QA-003-TYPECHECK-BLOCKER`. `venue_team_contractors` and `venue_crew_members` are defined only in the archived `supabase/migrations/archive/enhanced_staff_management_schema.sql` and are absent from the generated types, which is the same class of gap as `DB-010`.
  - Recommended but deliberately not implemented, because it edits shared build or release files outside QA ownership: (a) decouple the production build from the pull-request E2E job, since a ~73m build inside an E2E job is poor design and `ci.yml` already runs `Lint`, `Typecheck` and `Build` as independent steps; (b) re-scope `environment: staging` on the pull-request E2E job, which still exposes staging secrets to every same-repository PR while the specs mutate data with hardcoded fallback credentials such as `test-organizer@tourify.test`; (c) have `deploy-production.yml` assert the `Launch Certification` job conclusion rather than the run conclusion, which is equivalent today only because the PR jobs are skipped on `workflow_dispatch`.
