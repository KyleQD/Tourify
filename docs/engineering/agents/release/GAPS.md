# Release area gaps (RELEASE-001)

> Triage key: **MISSING** (does not exist) / **INCOMPLETE** (partial) / **IMPROVE** (exists, should be better).
> Each item lists evidence (real path) + location. Prioritized P1→P3.

---

## P1 — launch-blocking (map to launch gates)

### G-01 [MISSING] Production Sentry DSNs not set / observability not live (WS-1.4, G4)
- `lib/observability/sentry.shared.ts` no-ops when `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are unset; `instrumentation.ts` `warnOnMissingOperationalConfig()` explicitly warns "error tracking is OFF". `deployment/production.env`/`demo.env` leave SENTRY commented out; mobile `EXPO_PUBLIC_SENTRY_DSN` unset (`apps/mobile/lib/observability/sentry.ts` disables crash reporting without it). Backlog WS-1.4/G4 open.
- **Location**: `deployment/*.env`, `instrumentation.ts`, `lib/observability/sentry.shared.ts`, `apps/mobile/lib/observability/sentry.ts`, `apps/mobile/app.config.ts`.

### G-02 [MISSING] Uptime monitoring, SLOs, and alert/on-call routing (WS-1.4, G4)
- No uptime check on `/healthz`, no SLO doc for auth/checkout/stream, no on-call rotation doc in the web repo. Only mobile `production-rollout-monitoring.md` defines ad-hoc rollout thresholds.
- **Location**: health route `app/api/health/route.ts` (exists but no external uptime config); no `docs/` SLO/on-call file; `apps/mobile/docs/launch/production-rollout-monitoring.md`.

### G-03 [INCOMPLETE] Prod/demo environment split + PITR + restore drill (WS-0.6, G2)
- `deployment/production.env` and `demo.env` are "SAMPLE ONLY" templates with placeholder/nextauth-era vars; no `RECOVERY_AND_CONTINUITY_PLAN.md` (file missing) and no restore-drill evidence. `/etc/healthz` exists but no runtime prod-env boot evidence.
- **Location**: `deployment/production.env`, `deployment/demo.env`, absence of `docs/RECOVERY_AND_CONTINUITY_PLAN.md`, `lib/config/environment-contract.ts`, `scripts/ci/validate-production-env.ts`.

### G-04 [INCOMPLETE] e2e.yml not a required check for deploys / CI not fully green (WS-1.6, G3)
- `e2e.yml` exists but not wired as a merge-required branch check; vitest still has 27 documented failures (backlog WS-1.6) driven by open product/schema decisions; full typecheck not in the <10 min budget.
- **Location**: `.github/workflows/e2e.yml`, `.github/workflows/ci.yml`, `docs/DEVELOPMENT_BACKLOG.md` WS-1.6.

### G-05 [INCOMPLETE] Rate limiting not active in production (WS-1.3, G6)
- Limiter degrades by design in production and requires `RATE_LIMIT_ENFORCE=true` + real Upstash; `instrumentation.ts` warns "rate limiting is INACTIVE" when Upstash unset. No prod load-test 429 evidence.
- **Location**: `instrumentation.ts`, `lib/` limiter, env contract optional group `UPSTASH`/`KV`, `docs/DEVELOPMENT_BACKLOG.md` WS-1.3/G6.

### G-06 [INCOMPLETE] event-reminders cron is an unscheduled stub (WS-1.5, G5)
- `app/api/cron/event-reminders/route.ts` line 57 "implement your reminder logic"; not present in `vercel.json` `crons`. Deliberately deferred until implemented.
- **Location**: `app/api/cron/event-reminders/route.ts`, `vercel.json` (7 crons, no event-reminders).

### G-07 [MISSING] MV refresh not scheduled via pg_cron (WS-1.5, G5)
- `refresh_forum_mviews` pg_cron registration is **commented out** in `supabase/migrations/20250816130000_scaling_indexes_forum.sql` line 65. `refresh_venue_analytics_daily` is scheduled; `social-analytics-nightly` is commented.
- **Location**: `supabase/migrations/20250816130000_scaling_indexes_forum.sql` (line 65), `supabase/migrations/20250905003000_schedule_social_analytics.sql`.

### G-08 [INCOMPLETE] Music outbox workers not deployed as scheduled jobs (WS-1.5, G5)
- Backlog says "21 music outbox workers"; repo currently has **16** `music:*outbox-worker` npm scripts / `scripts/music-*-outbox-worker.ts` files. None are surfaced in `vercel.json` crons or a worker deployment; no retry/DLQ/health-check wiring. Count discrepancy itself is a gap to resolve (16 shipped vs 21 target).
- **Location**: `package.json` (`music:*outbox-worker`), `scripts/music-*-outbox-worker.ts`, `vercel.json`, `docs/DEVELOPMENT_BACKLOG.md` WS-1.5.

---

## P2

### G-09 [MISSING] No Docker CI workflow despite Docker in working set
- `WORKING_SET.json` and `DEVELOPMENT_WORKFLOW.md` list `docker/**` and Docker/build verification (verify:release), but no `.github/workflows/` file builds or verifies the Docker images; production compose stack is unvalidated in CI. No `docker-compose` GitHub action present.
- **Location**: `.github/workflows/**` (none for docker), `docker/production/Dockerfile`, `docker/production/docker-compose.yml`, `docs/DEVELOPMENT_WORKFLOW.md` "Docker" §.

### G-10 [INCOMPLETE] Legacy `scripts/deploy.sh` + deployment docs drift from Vercel-first reality
- `scripts/deploy.sh` (397 lines, pid-based bare-metal deploy) and `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` (Phase-2 onboarding workflow, SMTP/SendGrid/Twilio/VAPID/nextauth era) are stale vs current Vercel/Supabase stack. `deployment/ci-cd/github-actions.yml` is marked "Legacy reference only". Three parallel deployment surfaces cause drift.
- **Location**: `scripts/deploy.sh`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, `deployment/README.md`, `deployment/ci-cd/github-actions.yml`, `deployment/infrastructure/terraform/main.tf`.

### G-11 [MISSING] No release-domain work packets / architecture + decisions not yet populated
- `docs/engineering/agents/release/ARCHITECTURE.md` is a boundary stub; `DECISIONS.md` has template only (no release decisions); `BACKLOG.md` has no release task line items; `WORKING_SET` has no `docs/work-packets/` entry specific to release.
- **Location**: `docs/engineering/agents/release/ARCHITECTURE.md`, `DECISIONS.md`, `BACKLOG.md`, `docs/work-packets/`.

### G-12 [INCOMPLETE] Route-timing/perf observability logs only; no metric shipping or dashboard
- `lib/observability/route-timing.ts` writes `[perf:route]` to console only; not sent to Sentry/APM; no performance-budget CI gate for web pages (telmetry in `docs/performance-baseline.md`).
- **Location**: `lib/observability/route-timing.ts`, `docs/performance-baseline.md`.

---

## P3 — improve

### G-13 [IMPROVE] Migration gating is strong but manual/dual-path
- Two Supabase migration workflows require manual `release_evidence`/`validated_base_sha`/`target_confirmation` inputs and enforce staged validation; robust but relies on human discipline + separate staging/prod secrets. Could add a `staging→prod` promotion guard. Low risk.
- **Location**: `.github/workflows/supabase-migrations-production.yml`, `supabase-migrations-staging.yml`, `scripts/ci/check-migration-validation.mjs`.

### G-14 [IMPROVE] vercel.json cron schedules fixed; no single registry tying routes↔schedules↔owners
- 8 cron routes exist, 7 scheduled in `vercel.json`; no central registry validating "every cron route is scheduled" or alerting drift (backlog WS-1.5 accept is a manual map). Could add a CI check that diffs `app/api/cron/**` against `vercel.json`.
- **Location**: `vercel.json`, `app/api/cron/**`, `docs/DEVELOPMENT_BACKLOG.md` WS-1.5.

### G-15 [IMPROVE] Release verification tier not wired to e2e/mobile/load in a single command
- `scripts/verify.mjs` `release` tier runs web checks + `build:vercel` but not `test:e2e`, mobile OTA/native, or load smoke; those live in separate workflows. A single `verify:release` cannot gate everything.
- **Location**: `scripts/verify.mjs`, `.github/workflows/*.yml`.

### G-16 [IMPROVE] `.env*` / sample semantics could be tightened (secret hygiene)
- `deployment/production.env`/`demo.env` are committed SAMPLE templates; correctness depends on not importing them. Env contract already enforces required vars. Could add a CI check that the committed templates never contain real secrets.
- **Location**: `deployment/production.env`, `deployment/demo.env`, `lib/config/environment-contract.ts`.

---

## Triage tally

- **MISSING**: G-01, G-02, G-07, G-09, G-11 (5)
- **INCOMPLETE**: G-03, G-04, G-05, G-06, G-08, G-10, G-12 (7)
- **IMPROVE**: G-13, G-14, G-15, G-16 (4)

**Total: 16 gaps** (5 P1-launch-blocking grouping, plus the others). Note: G-01/G-02/G-06/G-07/G-08 all contribute to the G4/G5 launch gates.
