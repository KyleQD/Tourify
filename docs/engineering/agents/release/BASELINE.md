# Release area baseline (RELEASE-001)

> Read-only audit. SHA reviewed: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (matches task base_sha).
> Working tree: dirty (386 entries); only the release domain directory and this task record were written.
> Every claim is backed by a real path. This answers "what the Release area owns today" for CI, deployment, environment validation, observability, cron, and release readiness, plus the intended direction.

## Scope boundaries

Owner mission (charter `docs/engineering/agents/release/CHARTER.md`): CI, deployment, environment validation, observability, cron, and release readiness. Default working set in `docs/engineering/agents/release/WORKING_SET.json`:
- `.github/workflows/**`
- `vercel.json`
- `docker/**`
- `instrumentation.ts`
- `sentry.*.config.ts`
- `scripts/ci/**`
- `scripts/deploy.sh`
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## 1. CI (`.github/workflows/`)

16 workflow files present.

| Workflow | Path | Purpose |
| --- | --- | --- |
| CI | `.github/workflows/ci.yml` | Lint, typecheck, build, unit+vitest, toolchain/peer-deps, migration validation, security-style checks, admin/legacy/service-role allowlist checks, mobile gates (on path), build with `build:vercel`. |
| E2E | `.github/workflows/e2e.yml` | Playwright E2E + vitest unit; `pull_request` on main/staging + `workflow_dispatch`. |
| Deploy Demo | `.github/workflows/deploy-demo.yml` | Vercel deploy to `demo.tourify.live` after CI success on main (or manual). |
| Deploy Production | `.github/workflows/deploy-production.yml` | Optional 2nd Vercel project; gated by `ENABLE_VERCEL_PRODUCTION_DEPLOY`; post-deploy marketplace + music smoke. |
| Security scans | `.github/workflows/security-scans.yml` | gitleaks secret scan, CodeQL, dependency-review (critical), SBOM, exception governance. Weekly schedule. |
| Supabase migrations (production) | `.github/workflows/supabase-migrations-production.yml` | Gated manual `db push` to prod; requires release_evidence, validated_base_sha, target_confirmation; verifies exact project ref; enforces `staging_validated` migration stage. |
| Supabase migrations (staging) | `.github/workflows/supabase-migrations-staging.yml` | Same gate model for staging; enforces `isolated_validated` migration stage. |
| Admin RLS CI | `.github/workflows/admin-rls-ci.yml` | Ephemeral local Supabase stack; applies migrations; runs RLS persona matrix. |
| Mobile CI | `.github/workflows/mobile-ci.yml` | Contract tests, mobile typecheck/lint/unit on mobile/core paths. |
| Mobile iOS Native Release | `.github/workflows/mobile-ios-release.yml` | EAS iOS build→TestFlight, optional App Store submit. |
| Mobile Preview Release | `.github/workflows/mobile-preview-release.yml` | EAS preview build (tag/manual). |
| Mobile OTA Production | `.github/workflows/mobile-ota-production.yml` | iOS OTA on main path; path-filtered publish. |
| Android Native Release | `.github/workflows/android-native-release.yml` | EAS Android build, optional Play submit. |
| Android OTA Production | `.github/workflows/android-ota-production.yml` | Android OTA after CI, path-filtered. |
| Mobile Redirect Safety | `.github/workflows/mobile-redirect-safety.yml` | Redirect/auth-callback safety tests on auth/redirect changes. |
| Venue catalog import | `.github/workflows/venue-catalog-import.yml` | Scheduled (3rd) + manual; Overture venue import via psql transaction. |

CI toolchain contract enforced by `scripts/ci/check-toolchain.mjs` (Node 20.x, npm 11.5.2, lockfile v3, `engines.node` 20.x, no legacy-peer-deps), wired as `preinstall`.

CI verification tiers: `scripts/verify.mjs` defines `fast` / `feature` / `release`. The **release** tier runs: check:toolchain, check:peer-deps, lint, typecheck, test:unit (vitest), check:migration-validation, check:admin-route-registry, check:service-role-allowlist, check:admin-audit, check:production-debug, and `build:vercel`.

CI helper scripts under `scripts/ci/`: toolchain, peer-deps, eslint-warning-budget, migration-validation (+ history checksum + manifest), active-migration-chain, admin-route-registry, legacy-tour-route-inventory, service-role-allowlist, security-exceptions, verify-supabase-target, validate-production-env, render-migration-checksums. Baseline `scripts/ci/admin-route-registry-baseline.json`.

## 2. Deployment

- **Vercel** config: `vercel.json` — `framework: nextjs`, build `npm run build`, install `npm ci`, functions maxDuration 30 (API), security headers (X-Frame-Options DENY, nosniff, Referrer-Policy), CORS headers on `/api/*`, `healthz` rewrite → `/api/health`, and **7 scheduled crons** (see Cron below).
- **Docker**: `docker/production/Dockerfile` (multi-stage node:20-alpine, standalone output, non-root user, healthcheck) supports `.next/standalone` via `output: standalone` implied by Dockerfile (uses `node server.js`). `docker/production/docker-compose.yml` adds traefik, redis, postgres (legacy, "if not using Supabase"), prometheus, grafana, loki, promtail, postgres backups. `docker/local/docker-compose.yml` + `docker/local/Dockerfile` are the developer parity stack (app, redis, postgres).
- **Deploy script**: `scripts/deploy.sh` — legacy bare-metal demo/prod (build/start/stop/status/logs) using `deployment/production.env` / `deployment/demo.env`; pid-based, not used by Vercel CLI CI.
- **Deployment documentation**:
  - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` — legacy Phase-2 "Onboarding workflow" deployment guide (SMTP/SendGrid/Twilio, VAPID, nextauth era) — **out of date** relative to current stack.
  - `deployment/README.md` — demo/prod domains, env, health checks.
  - `deployment/ci-cd/github-actions.yml` — **legacy reference only** (Node 18, old quality gates) noting live workflows live in `.github/workflows/`.
  - `deployment/infrastructure/terraform/main.tf` — infra-as-code (single file).
  - `deployment/production.env`, `deployment/demo.env` — explicitly **SAMPLE ONLY** templates with placeholder values; header warns not to import directly into Vercel production.
- Mobile store/release docs: `apps/mobile/docs/release-checklist.md`, `apps/mobile/docs/launch/` (launch-runbook, rollback-playbooks, production-rollout-monitoring, compliance-workbook, store metadata, etc.).

## 3. Environment validation

- **Contract**: `lib/config/environment-contract.ts` — `ENVIRONMENT_CONTRACT` array declaring availability/exposure/requirement/purpose per variable; `validateProductionEnvironment(phase, env)` and `assertProductionEnvironment(phase, env)`; enforces HTTPS URL, `ENCRYPTION_KEY` 64-hex, anon≠service-role, and "complete group" validation for optional integrations. Required: NEXT_PUBLIC_SUPABASE_URL, anon key, SITE_URL, SERVICE_ROLE_KEY, ENCRYPTION_KEY, INTERNAL_API_SECRET, CRON_SECRET. Conditional: MARKETPLACE_INTEGRATION_SECRET, EMPLOYEE_CREDENTIALS_SECRET, provider keys. Optional: RESEND, MAPBOX, OPENAI, STRIPE, feature flags.
- **Runtime enforcement**: `instrumentation.ts` — in production asserts the env contract at startup and `warnOnMissingOperationalConfig()` logs when SENTRY_DSN, UPSTASH, or RESEND are missing. Also `onRequestError` → `Sentry.captureRequestError`.
- **CI script**: `scripts/ci/validate-production-env.ts` (loaded via `npm run validate:env:production`, run in both `build` and `build:vercel` npm scripts).
- Build-time: the `build` / `build:vercel` npm scripts call `validate:env:production` before `next build`.

## 4. Observability (Sentry / instrumentation / health)

- **Sentry config**:
  - `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts` → all delegate to `lib/observability/sentry.shared.ts` `initSentryForRuntime()`, which no-ops if `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` unset, sets `environment` from `VERCEL_ENV`, traces sample rate from `SENTRY_TRACES_SAMPLE_RATE` (default 0.05).
  - `lib/observability/route-timing.ts` — additive `[perf:route]` console timing with production sample rate (`PERF_LOG_SAMPLE_RATE` default 0.1); logs only, does not ship to Sentry backend.
  - Mobile: `apps/mobile/lib/observability/sentry.ts` uses `EXPO_PUBLIC_SENTRY_DSN`, release tags (`appVersion`, `runtimeVersion`, `releaseChannel`, `buildEnvironment`), env-specific traces sample rate. Plugin registered in `apps/mobile/app.config.ts`.
- **Health/readiness**: `app/api/health/route.ts` — unauthenticated probe returns `{status:'ok',...}`; internal (`isAuthorizedInternalRequest`) returns full health incl. database/redis/supabase service checks + memory/cpu, plus `HEAD` readiness probe. Rewritten to `/healthz` in `vercel.json`.
- **Ops-readiness warning**: `instrumentation.ts` `warnOnMissingOperationalConfig`.
- **SLO/uptime/alert routing**: Not present in repo. Backlog WS-1.4 (observability on) is open (see GAPS). Mobile rollout monitors in `apps/mobile/docs/launch/production-rollout-monitoring.md` define some crash/error SLO thresholds and rollout triggers, but no dedicated uptime/SLO doc or on-call rotation in the web repo.

## 5. Cron scheduling (`vercel.json`)

`vercel.json` `crons` currently schedules **7** cron paths:

1. `/api/cron/contract-sign-reminders` — `0 11 * * *`
2. `/api/cron/social-analytics` — `0 3 * * *`
3. `/api/cron/events/sync` — `17 */6 * * *`
4. `/api/cron/staffing-overview-refresh` — `*/5 * * * *`
5. `/api/cron/workflow-automations` — `*/10 * * * *`
6. `/api/cron/admin-publication-outbox` — `*/5 * * * *`
7. `/api/cron/ticket-invite-expiry` — `*/15 * * * *`

There are **8** cron route directories under `app/api/cron/`: the 7 above plus `/api/cron/event-reminders` which is **not scheduled** in `vercel.json` and is a **stub** (`app/api/cron/event-reminders/route.ts` line 57: `// Process reminders here (implement your reminder logic)`).

Cron route authorization via `isAuthorizedCronRequest` / `isAuthorizedInternalRequest` guards (`lib/auth/route-guards`); service-role clients (`createServiceRoleClient`).

DB-side scheduled work:
- `refresh_forum_mviews` pg_cron registration in `supabase/migrations/20250816130000_scaling_indexes_forum.sql` is **commented out** (`-- select cron.schedule('refresh_forum_mviews_every_min', ...)`), not active.
- `refresh_venue_analytics_daily` pg_cron IS scheduled in `supabase/migrations/20260825030000_analytics_truth.sql` (line 205, `cron_available` guard).
- `social-analytics-nightly` pg_cron in `supabase/migrations/20250905003000_schedule_social_analytics.sql` is **commented out** (relies on Vercel cron instead).

## 6. Release readiness

- **Launch gates**: `docs/DEVELOPMENT_BACKLOG.md` defines G1–G10 launch gates. Release-relevant gates:
  - G2 separate demo/prod DBs + PITR + restore drill (open — WS-0.6).
  - G3 CI fully green incl. e2e blocking + typecheck in budget (open — WS-1.6; e2e.yml not yet a required check).
  - G4 Sentry + uptime + alerting live (open — WS-1.4; Sentry wiring exists but DSNs unset).
  - G5 all crons/workers scheduled with monitoring (partial — WS-1.5).
  - G6 rate limiting active in prod (open — WS-1.3; currently degraded/enforce-flag behavior).
- **Release verification tier** exists in `scripts/verify.mjs` and runs the release checks listed in §1.
- **Work packets**: `docs/work-packets/TA-PH0.md` (test entry + five-city E2E, in_progress). `docs/work-packets/TEMPLATE.md` template. No release-domain work packets yet.
- **Legacy plans**: `.agents/plans/phase-9-hardening.md` (release/hardening admin), `phase-6-finance-commerce.md`, etc.

---

## Intended direction (cites backlog)

From `docs/DEVELOPMENT_BACKLOG.md`:

- **WS-0.6 — Prod env & data safety**: Split demo/prod into separate Supabase projects; complete Vercel production env (STRIPE_*, RESEND_API_KEY, CRON_SECRET, INTERNAL_API_SECRET, ENCRYPTION_KEY, correct SITE_URL, **Sentry DSNs**); enable + verify PITR/backups; run one documented restore drill; record RPO/RTO in `RECOVERY_AND_CONTINUITY_PLAN.md` (G2). Placeholder-key fallback already removed (stripe HMAC no-key verification).
- **WS-1.4 — Observability on (G4)**: Set Sentry DSNs (web+mobile), enable traces; uptime monitoring on `/healthz` + key flows; alert routing (on-call rotation doc); SLOs for auth/checkout/stream; instrument checkout/purchase funnel.
- **WS-1.5 — Scheduled work actually scheduled**: 3 of 4 unscheduled crons now scheduled (staffing-overview-refresh, workflow-automations, admin-publication-outbox) ✓; `event-reminders` remains unscheduled (stub — implement then schedule); register MV refresh (`refresh_forum_mviews`) via pg_cron; deploy the 21 music outbox workers as scheduled jobs with retry+DLQ; require vercel.json maps every cron route; workers have health checks and are monitored (G5).
- **WS-1.6 — Restore green CI**: jest green (617), vitest 27 failures remain; typecheck-in-budget; **make `e2e.yml` a required check for deploys** (G3).
- **G1–G6**: launch gates list (G1 all Phase 0 closed, G2–G6 as above).
- **Docker workflows**: DEVELOPMENT_WORKFLOW.md and WORKING_SET reference `docker/` and "Docker/build verification"; no dedicated Docker CI workflow exists today.

**Direction summary**: The release intent is (1) finish the prod/demo environment split + PITR drill (WS-0.6), (2) stand up real observability with Sentry DSNs, uptime, alerting, and SLOs (WS-1.4, G4), (3) schedule and monitor all crons + 21 music outbox workers and the MV refresh (WS-1.5, G5), (4) make CI fully green with e2e as a required gate (G3), and (5) confirm rate limiting active in prod (G6). Several control-plane scaffolds already exist (env contract, Sentry wiring, release verify tier, scheduled migrations gate); the remaining work is predominately configuration, scheduling, monitoring, and documentation, not new systems.
