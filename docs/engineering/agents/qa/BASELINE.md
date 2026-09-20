# QA baseline — what the QA area contains today

Generated: 2026-09-10 | Task: QA-001 | Source SHA: 7cf660ad

## Summary

Tourify has a substantial but unevenly matured test infrastructure: 433 Vitest test files under `__tests__/`, 88 co-located library test files, 13 API test files, one hiring data spec, and five Playwright specs under `tests/e2e/`. The latest recorded full Vitest run is green (4,891 passed, 0 failed, 8 intentional environment-gated skips) in QA-002. Sixteen tracked GitHub workflows exist, including separate CI and E2E workflows, but hosted run status and branch-protection enforcement are not evidenced locally. Transactional E2E, live RLS, rate-limit, XSS, mobile, and visual regression coverage remain incomplete or absent.

## Surface inventory used by QA

The generated maps are navigation aids, not proof of behavior. They establish the breadth of surfaces that QA must eventually cover:

| Surface | Current inventory | Evidence |
|---------|------------------|----------|
| Web routes | 369 pages | `docs/engineering/generated/routes.md` |
| API routes | 939 route handlers | `docs/engineering/generated/api-routes.md` |
| Components | 1,939 TSX/JSX source files | `docs/engineering/generated/components.md` |
| Services | 90 files under `lib/services/` | `lib/services/` |
| Database objects | 693 detected objects across 422 Supabase migrations, including 1,287 policies | `docs/engineering/generated/database-schema.md`, `docs/engineering/generated/database-objects.md` |
| Permission indicators | 939 API sources catalogued with static auth/RBAC indicators or manual-review status | `docs/engineering/generated/permissions.md` |
| External integrations | Supabase, Stripe, Resend, Sentry, Upstash, AWS S3, OpenAI/AI SDK, Vercel, and Twilio | `docs/engineering/generated/integrations.md` |

QA does not own these application surfaces. It consumes them as contracts and records coverage gaps for the owning agents.

---

## 1. Test runners and configs

| Asset | Path | Notes |
|-------|------|-------|
| **Vitest** | `vitest.config.ts` | Primary unit/integration runner. Includes `__tests__/**/*.test.{ts,tsx}`, `tests/hiring/**/*.spec.ts`, `lib/**/__tests__/**/*.test.ts`. 4 excluded files (marketplace/workflow). |
| **Jest** | `jest.config.cjs` | Secondary runner for `lib/**/__tests__/**` and `app/api/**/__tests__/**`. 617 tests green per backlog WS-1.6. Ignores 3 vitest-owned suites. |
| **Playwright** | `playwright.config.ts` | E2E runner. `testDir: ./tests/e2e`, Chromium only, CI retries=2. WebServer auto-starts `npm run dev` locally. |

## 2. Test suites — by location

### 2a. `__tests__/` (Vitest, 433 test files)

50+ subdirectories covering:

| Domain | Directory | Sample coverage |
|--------|-----------|-----------------|
| **Admin** | `__tests__/admin/` | ~50 tests: tour, event, site-map, finance, publication, ticketing, logistics, staff, RBAC, entity-grants, KPI catalog |
| **Security** | `__tests__/security/` | 1 test: `calendar-and-guards.test.ts` (calendar HMAC tokens, cron auth, internal route guards) |
| **Auth** | `__tests__/auth/` | 4 tests: **C1 regression** (`no-unsigned-cookie-fallback.test.ts`), `tourify-session-cookie.test.ts`, `admin-surface-access.test.ts`, `agent-service.test.ts` |
| **Organization** | `__tests__/organization/` | 1 test: **C2 regression** (`org-invite-takeover-guard.test.ts`) |
| **Artist** | `__tests__/artist/` | 6 tests: event-producer, dashboard, social URL, feed-stats, analytics, content-hub |
| **Venue** | `__tests__/venue/` | Route contract and related |
| **Hiring** | `__tests__/hiring/` | Application transitions |
| **Logistics** | `__tests__/logistics/` | 12 tests: travel, flights, site-maps, equipment, backline, plan workspace, dietary |
| **Ticketing** | `__tests__/ticketing/` | Event-level ticketing |
| **Notifications** | `__tests__/notifications/` | 5 tests: account options, venue fanout, center interaction, fetch hydration, account scope |
| **Messaging** | `__tests__/messaging/` | 2 tests: friends/send schema, account scope |
| **Onboarding** | `__tests__/onboarding/` | 2 tests: persona onboarding, unified API |
| **Services** | `__tests__/services/` | 2 tests: admin-onboarding-staff, account management |
| **Events** | `__tests__/events/` | Event providers, search |
| **Feed** | `__tests__/feed/` | Feed behavior |
| **Social** | `__tests__/social/` | Social flows |
| **Search** | `__tests__/search/` | Search |
| **QA** | `__tests__/qa/` | QA-specific tests |
| **World/Geo** | `__tests__/world/`, `__tests__/world-ingestion/`, `__tests__/geo/` | World data |
| Other | accounts, achievements, blog, bookings, ci, config, content, dashboard, epk, general, http, integrations, jobs, news, playback, polls, post-styles, press, profile, public-artist, seo, work-mode | Various |

### 2b. `lib/**/__tests__/` (Vitest, 88 test files)

Co-located domain library tests:

| Area | Count | Key coverage |
|------|-------|-------------|
| `lib/marketplace/__tests__/` | 12 | Checkout, cart, fees, entitlements, order lifecycle, inventory, service state, providers, Printful webhook, feed-attachment, seller analytics |
| `lib/venue/__tests__/` | 13 | RBAC access, provisioning, reservations, shifts, route-registry, identity-bridge, profile contract, completion, bookings-export, staff DTO, duration, settings-shapes, event-id-domain |
| `lib/auth/__tests__/` | 6 | Route guards, admin profile gates, auth errors, session-init, email-redirect, normalize-account-type |
| `lib/discover/__tests__/` | 4 | Location match, ranking, normalize, tours |
| `lib/music/__tests__/` | 5 | Public verification, trust, access, upload helpers |
| `lib/music-right*/__tests__/` | 9 | Passport manifest, agreements, protection adapters, legacy retrospective, rights validation |
| `lib/music/creator-*/__tests__/` | ~12 | Activation gates and launch isolation for cooperative, federation, digital-commons, interoperability, constitution, treaty, cultural-memory |
| `lib/routing/__tests__/` | 2 | Production blocked routes, public share routes |
| `lib/services/__tests__/` | 1 | Hiring eligibility service |
| `lib/workflows/__tests__/` | 2 | Workflow threads, permissions |
| Other | lib/artist, lib/connect, lib/hiring, lib/job-board, lib/appearance, lib/api | Various |

### 2c. `app/api/**/__tests__/` (Jest, 13 test files across route-test directories)

Route-level tests for: artist/public-appearance, auth/signup, cron, marketplace/checkout, marketplace/discover, marketplace/migrations, marketplace/storefront, music/library, onboarding/create-account.

### 2d. E2E — Playwright (`tests/e2e/`, 5 specs)

| Spec | Path | Coverage |
|------|------|----------|
| **01-event-publish-checkin-settle** | `tests/e2e/01-event-publish-checkin-settle.spec.ts` | Login → event planner → publish → check-in page load |
| **02-tour-advancing-daysheet** | `tests/e2e/02-tour-advancing-daysheet.spec.ts` | Tour planner page, tour list, advancing page |
| **03-hire-staff-shift** | `tests/e2e/03-hire-staff-shift.spec.ts` | Staff page, scheduling tab, applications, RBAC |
| **04-multi-persona-clickthrough** | `tests/e2e/04-qa-multi-persona-clickthrough.spec.ts` | Cookie-session auth → dashboard, account switcher, artist, bookings, venue, messages, admin (7 steps) |
| **05-west-coast-tour-flow** | `tests/e2e/05-west-coast-tour-flow.spec.ts` | Multi-user seeded flow: artist1/org/worker1-3/artist2 across dashboard, tour, hiring, onboarding (10 steps) |
The separate `tests/hiring/phase-13-real-data.spec.ts` spec is included by Vitest through `vitest.config.ts`; it is not in Playwright's `testDir`.

### 2e. Test fixtures

| Asset | Path | Notes |
|-------|------|-------|
| Seed script | `tests/fixtures/seed.ts` | Creates test organizer + artist users via Supabase admin API; cleanup helper |
| Provider fixtures | `tests/fixtures/providers/bandsintown/artist-events.json`, `tests/fixtures/providers/ticketmaster/search-las-vegas.json` | External provider mock data |
| Migration source helper | `__tests__/helpers/migration-source.ts` | Resolves quarantined migration ENOENT |

## 3. QA scripts (`scripts/qa/`)

| Script | Path | Purpose |
|--------|------|---------|
| Multi-persona seed | `scripts/qa/seed-multi-persona-qa.ts` | Idempotent seed for QA users A/B (artist+venue+org personas) |
| Flow cast seed | `scripts/qa/seed-tour-flow-cast.ts` | Seeds 7-account West Coast tour cast |
| Flow scenario seed | `scripts/qa/seed-tour-flow-scenario.ts` | Bootstraps tour + 3 jobs + hire tokens → `docs/audits/qa-flow-scenario.json` |
| Admin UX seed | `scripts/qa/admin-ux-seed.ts` | Admin UX testing seed |
| Auth interaction audit | `scripts/qa/authenticated-interaction-audit.ts` | API-level multi-persona interaction audit |
| QA env loader | `scripts/qa/load-qa-env.ts` | Shared env loading for QA scripts |
| Agent scripts | `scripts/qa/agents/` (5 files) | UI multi-agent flow orchestration (persona content, platform fill, flow repair, flow final) |

## 4. Verification tiers (`scripts/verify.mjs`)

| Tier | When | Checks |
|------|------|--------|
| **Fast** | During implementation | Changed-file lint, focused tests, migration validation, admin route registry |
| **Feature** | Before handoff | Fast + typecheck, supabase target, admin audit, vitest admin suite, mobile verify |
| **Release** | Before merge/release | Full typecheck, lint, all unit tests, migration validation, admin route registry, service-role allowlist, admin audit, production debug check, Vercel build |

## 5. QA documentation

| Document | Path | Content |
|----------|------|---------|
| Account matrix | `docs/qa-account-matrix.md` | Account types × routes expected behavior; integration smoke commands; last verified 2026-07-18 |
| Artist store checklist | `docs/qa-artist-store-completion.md` | 7-step smoke checklist for artist store feature |

## 6. Regression evidence (backlog-referenced)

| Backlog item | Test file | Status |
|-------------|-----------|--------|
| WS-0.1 C1 (unsigned cookies) | `__tests__/auth/no-unsigned-cookie-fallback.test.ts` | ✅ Exists, 3 assertions |
| WS-0.2 C2 (org invite takeover) | `__tests__/organization/org-invite-takeover-guard.test.ts` | ✅ Exists, 2 assertions |
| WS-1.6 Jest green | 617/617 recorded in `docs/engineering/tasks/completed/QA-002.json` | ✅ Green |
| QA-002 Vitest gate | 4,891 passed / 0 failed / 8 intentional skips across 512 files and 1,881 suites; `/tmp/tourify-qa-002-final.json` | ✅ Green |
| Migration checks | `check:migration-chain` and `check:migration-validation` recorded in `docs/engineering/tasks/completed/QA-002.json` | ✅ Pass |

## 7. What is NOT in the QA area today

- **Hosted CI/branch-protection evidence is not present locally** — 16 workflows are tracked, including `.github/workflows/ci.yml` and `.github/workflows/e2e.yml`; required-check enforcement still needs repository-level verification.
- **No Playwright coverage for money flows** — e2e sell→check-in→settle is skeletal (navigation-only, no transaction assertions).
- **No RLS/security regression suite** — No systematic `__tests__/rls/` directory testing policy enforcement.
- **No mobile E2E** — No Expo/Playwright mobile harness.
- **No snapshot/visual regression** — No Chromatic, Percy, or Playwright visual comparison.
- **No load/rate-limit smoke tests** — WS-1.3 acceptance requires "load/rate-limit smoke demonstrates 429s".
- **No migration-aware test seeding** — Tests don't verify migration chain integrity.
- **No test coverage reporting in CI** — `vitest.config.ts` has V8/LCOV coverage configured, but `.github/workflows/ci.yml` and `.github/workflows/e2e.yml` do not invoke a coverage command.

---

## Intended direction (from backlog)

| Reference | Direction |
|-----------|-----------|
| WS-1.6 | Make e2e.yml required and extend Playwright to complete real transactions; the Vitest failure queue was resolved by QA-002 |
| WS-0.7 | Add e2e XSS-payload test |
| WS-0.1/C1 | Forged-cookie 401 regression on every listed route |
| WS-0.2/C2 | Integration test: non-member cannot mint invites |
| WS-0.3 | Regression tests for ticket transfer both paths |
| WS-0.4 | Clamp unit tests |
| WS-1.3 | Rate-limit smoke tests in real Upstash env |
| WS-2.6 | A11y scan of core flows (axe) |
| Launch-Readiness Gates G3, G6 | CI fully green incl. e2e blocking; rate limiting active with evidence |
