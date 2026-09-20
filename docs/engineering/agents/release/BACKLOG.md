# Release backlog

The canonical work item is a task JSON under `docs/engineering/tasks/`. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- **RELEASE-001** — Audit Release workspace (baseline, gaps, questions). Status: active → completed (read-only audit). See `BASELINE.md`, `GAPS.md`, `QUESTIONS.md` in this directory.

## Candidate (from RELEASE-001, waiting on owner answers — see `QUESTIONS.md`)

- **WS-0.6 / G2** — Prod/demo env split + PITR + documented restore drill; create `docs/RECOVERY_AND_CONTINUITY_PLAN.md`; complete Vercel production env (STRIPE_*, RESEND, CRON_SECRET, INTERNAL_API_SECRET, ENCRYPTION_KEY, SITE_URL, Sentry DSNs). *(Q1)*
- **WS-1.4 / G4** — Provision web+mobile Sentry DSNs, enable traces; uptime monitoring on `/healthz` + key flows; alert routing; SLOs (auth/checkout/stream); instrument checkout/purchase funnel. *(Q2)*
- **WS-1.6 / G3** — Make `e2e.yml` a required check; burn down 27 vitest failures (cross-domain); typecheck-in-budget. *(Q3)*
- **WS-1.5 / G5** — Schedule `event-reminders` (implement stub, possibly handoff) + register MV refresh via pg_cron + deploy music outbox workers (resolve 16-vs-21) with retry/DLQ/health checks + vercel.json cron registry check. *(Q4)*
- **WS-1.3 / G6** — Enable `RATE_LIMIT_ENFORCE` with real Upstash; prod load/rate-limit smoke. *(Q5)*
- **P2** — Retire/archive legacy bare-metal deploy surface (`scripts/deploy.sh`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`, `deployment/ci-cd/github-actions.yml`) in favor of Vercel CLI + Docker; optional Docker CI workflow. *(Q6, Q7)*
- **P3** — Ship route-timing metrics to an APM + perf-budget gate (defer per Q8).

## Done

- Control-plane bootstrap created.
- RELEASE-001 audit completed (baseline + 16 triaged gaps + 8 prioritized questions; `npm run agents:validate` = 0 errors).

## P0 production launch tasks — 2026-09-16

- **RELEASE-006** — reproducible Node 24.x runtime, secure dependencies, clean install, typecheck, and build.
- **RELEASE-007** — isolated staging/production projects, domains, secrets, protected environments, and controlled promotion.
- **RELEASE-008** — launch capability manifest, production route denylist, security/crawler headers, and public-surface truth.
- **RELEASE-003/004/005** — observability and soak; recovery/PITR drill; required checks and final go/no-go.
- **RELEASE-002** — blocked/P2 until core launch stability and MUSIC-004 re-authorization.

## Batch status — 2026-09-16

- RELEASE-006: partial implementation; dependency audit and clean build gates remain open.
- RELEASE-007: partial workflow implementation; hosted environment provisioning remains required.
