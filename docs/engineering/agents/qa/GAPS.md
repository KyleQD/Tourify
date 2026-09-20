# QA gaps — missing, incomplete, and improve items

Generated: 2026-09-10 | Task: QA-001 | Source SHA: 7cf660ad

## Triage key

- **MISSING** = Does not exist at all
- **INCOMPLETE** = Exists but coverage is partial or skeletal
- **IMPROVE** = Works but needs quality, reliability, or efficiency gains

---

## P0 — Launch blockers

### GAP-001 (CORRECTED) INCOMPLETE: CI pipeline exists; verifying it covers all tests
- **Location**: `.github/workflows/` — 16 real, git-tracked workflows (ci.yml, e2e.yml, security-scans.yml, mobile-*, supabase-migrations-*, etc.)
- **Correction (2026-09-09, orchestrator CP-010)**: The original audit finding that `.github/workflows/` was empty was a FALSE NEGATIVE. The directory contains 16 tracked workflows; ci.yml runs lint/typecheck/unit/contracts/build, e2e.yml runs Playwright. This entry is re-triaged from MISSING to INCOMPLETE.
- **Evidence**: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `git ls-files .github/workflows/` (16 files).
- **Remaining**: Verify workflows are green and fully cover the verification tiers; ensure every required CI check is actually enforced on merges. Launch gate G3 depends on green + e2e required, not on creating a pipeline.

### GAP-002 INCOMPLETE: Playwright E2E money-flow journey
- **Location**: `tests/e2e/01-event-publish-checkin-settle.spec.ts`
- **Evidence**: Spec navigates to event planner and publishes, but does NOT assert ticket purchase, check-in completion, or settlement. Test 2 ("check-in page loads") only verifies heading visibility.
- **Backlog ref**: WS-1.6 "extend Playwright journeys to complete real transactions (sell→check-in→settle)"
- **Impact**: No E2E proof that the money flow works end-to-end.
- **Triage**: INCOMPLETE

### GAP-003 INCOMPLETE: e2e.yml as required check
- **Location**: `.github/workflows/e2e.yml` (workflow exists)
- **Evidence**: WS-1.6 acceptance: "Make `e2e.yml` a required check for deploys". The workflow file exists; it must be enforced as a required check on the repo.
- **Impact**: Deploys cannot be blocked on E2E pass.
- **Triage**: INCOMPLETE (workflow exists; needs to be made required)

### GAP-004 MISSING: XSS E2E test
- **Location**: `tests/e2e/` — no XSS payload test exists
- **Evidence**: WS-0.7 lists "e2e XSS-payload test" as remaining. `formatContent` escape-before-linkify is in production code but no automated E2E asserts it.
- **Impact**: XSS regression could ship undetected.
- **Triage**: MISSING

---

## P1 — Must-fix before public scale

### GAP-005 RESOLVED (originally IMPROVE): Vitest failure queue
- **Location**: `__tests__/`, `lib/**/__tests__/`, and the QA-002 task record
- **Evidence**: `docs/engineering/tasks/completed/QA-002.json` records the final full-suite run at 4,891 passed, 0 failed, 8 intentional environment-gated skips across 512 files and 1,881 suites. The final report is `/tmp/tourify-qa-002-final.json`.
- **Impact**: No known local Vitest assertion failures remain at the reviewed SHA. The eight skipped tests require opt-in live database environments and are not accidental skips.
- **Triage**: IMPROVE; resolved by QA-002, retained as a historical gap ID for traceability.

### GAP-006 INCOMPLETE: Forged-cookie 401 regression on ALL listed routes
- **Location**: `__tests__/auth/no-unsigned-cookie-fallback.test.ts` — tests `authenticateApiRequest` and `checkAuth` only
- **Evidence**: WS-0.1 acceptance: "forged cookie JSON returns 401 on every listed route (test pending)". Currently only the generic auth helpers are tested, not the 9+ individual consumer routes (messages, social, groups).
- **Impact**: Individual routes could re-introduce cookie fallback.
- **Triage**: INCOMPLETE

### GAP-007 INCOMPLETE: Non-member invite rejection integration test
- **Location**: `__tests__/organization/org-invite-takeover-guard.test.ts` — mocks Supabase, does NOT hit real DB
- **Evidence**: WS-0.2 acceptance: "integration test proving non-member cannot mint invites". Current test is a unit test with mocked Supabase client.
- **Impact**: RLS-level invite rejection is not verified against real database policies.
- **Triage**: INCOMPLETE

### GAP-008 MISSING: Ticket transfer regression tests
- **Location**: No test file found for WS-0.3 ticket transfer paths
- **Evidence**: WS-0.3 acceptance: "regression tests for both paths" (email-addressed transfer, ownership claim). No `__tests__/ticketing/transfer*.test.ts` exists.
- **Impact**: Two critical money-flow paths have no automated regression.
- **Triage**: MISSING

### GAP-009 MISSING: Rate-limit smoke tests
- **Location**: No test exercising rate-limiter behavior under load
- **Evidence**: WS-1.3 acceptance: "load/rate-limit smoke demonstrates 429s in an env with real Upstash". No `__tests__/security/rate-limit*.test.ts` exists.
- **Impact**: Rate-limiting effectiveness is unverified.
- **Triage**: MISSING

### GAP-010 MISSING: RLS/security regression test suite
- **Location**: `__tests__/security/` — only 1 test (calendar-and-guards)
- **Evidence**: No systematic RLS testing exists. The database agent owns migrations, but QA should verify that critical tables enforce correct policies under different user contexts.
- **Impact**: RLS regressions could ship silently.
- **Triage**: MISSING

### GAP-011 IMPROVE: Typecheck tractability
- **Location**: `tsconfig.json`, `npm run typecheck`
- **Evidence**: WS-1.6: "Make full typecheck tractable: project references / scoped tsconfigs, burn down worst `any` files; target <10 min full check". Currently `typecheck` uses `--max-old-space-size=8192`, indicating memory pressure.
- **Impact**: Slow typecheck blocks fast iteration and CI.
- **Triage**: IMPROVE (cross-domain with release agent)

---

## P2 — Product completion

### GAP-012 MISSING: Accessibility (axe) scan of core flows
- **Location**: No axe integration in Playwright or standalone
- **Evidence**: WS-2.6: "A11y pass on core flows (auth, feed, ticket purchase, messaging): axe scan of core flows clean of criticals"
- **Impact**: Accessibility regressions undetected.
- **Triage**: MISSING

### GAP-013 INCOMPLETE: Hire→assign shift E2E journey
- **Location**: `tests/e2e/03-hire-staff-shift.spec.ts` — checks page loads only
- **Evidence**: WS-1.6: "complete real transactions (sell→check-in→settle; hire→assign shift)". Current spec only asserts no 500 errors and heading visibility.
- **Impact**: Hiring flow has no E2E proof of completion.
- **Triage**: INCOMPLETE

### GAP-014 IMPROVE: Test coverage reporting
- **Location**: `vitest.config.ts` — coverage configured but never run in CI
- **Evidence**: `coverage: { provider: "v8", reporter: ["text", "lcov"], include: ["lib/services/**/*.ts"] }` exists but no script or CI step invokes `vitest --coverage`.
- **Impact**: No visibility into coverage trends.
- **Triage**: IMPROVE

### GAP-015 IMPROVE: Migration-aware test seeding
- **Location**: `tests/fixtures/seed.ts` — minimal (creates 2 users)
- **Evidence**: Current seed creates organizer + artist via admin API. No verification that migration chain is intact before tests run. `__tests__/helpers/migration-source.ts` exists but is only for ENOENT resolution.
- **Impact**: Tests may pass against stale schema.
- **Triage**: IMPROVE

---

## P3 — Scale/quality debt

### GAP-016 MISSING: Mobile E2E tests
- **Location**: No `apps/mobile/` test harness
- **Evidence**: No Playwright or Detox tests for the Expo client.
- **Impact**: Mobile regressions only caught by manual testing.
- **Triage**: MISSING

### GAP-017 MISSING: Visual/snapshot regression
- **Location**: No Chromatic, Percy, or Playwright `toHaveScreenshot()`
- **Evidence**: No visual regression tooling installed.
- **Impact**: UI breakage only caught visually by humans.
- **Triage**: MISSING

### GAP-018 IMPROVE: E2E auth helper duplication
- **Location**: `tests/e2e/helpers/qa-flow-auth.ts` (injectFlowSession) and `tests/e2e/04-qa-multi-persona-clickthrough.spec.ts` (injectQaSession)
- **Evidence**: Two separate implementations of cookie injection; 04-spec reimplements inline instead of using the shared helper.
- **Impact**: Maintenance burden, divergence risk.
- **Triage**: IMPROVE

### GAP-019 RESOLVED (originally IMPROVE): QA script npm run aliases
- **Location**: `package.json`, `docs/qa-account-matrix.md`, and `docs/qa-artist-store-completion.md`
- **Evidence**: Every command referenced by the two QA documents is present in `package.json`, including `check:integration-env`, `qa:*`, `lint`, and `verify:ci`.
- **Impact**: The documented QA command aliases are internally consistent at the reviewed SHA.
- **Triage**: IMPROVE; resolved by this audit, retained as a historical gap ID for traceability.

### GAP-020 MISSING: Debugger/debug-route security tests
- **Location**: No tests for `/api/debug/*` routes in production mode
- **Evidence**: `check:production-debug` script exists but no test asserts debug routes are blocked in production. Routes like `/api/debug/db-schema`, `/api/debug/profiles` use service role — no test confirms production-mode guard.
- **Impact**: Debug endpoints could leak in prod.
- **Triage**: MISSING

---

## Counts by triage

| Triage | Count |
|--------|-------|
| MISSING | 8 |
| INCOMPLETE | 6 |
| IMPROVE | 4 |
| **Active** | **18** |

GAP-005 and GAP-019 are resolved and excluded from the active count; they remain listed above so the QA-002 follow-up and this audit's alias verification are traceable.

## Counts by priority

| Priority | Count |
|----------|-------|
| P0 (launch blocker) | 4 |
| P1 (must-fix) | 7 |
| P2 (product completion) | 4 |
| P3 (scale/debt) | 5 |
| **Total findings including resolved GAP-005 and GAP-019** | **20** |
