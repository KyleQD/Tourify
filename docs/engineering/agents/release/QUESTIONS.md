# Release area questions (RELEASE-001)

> Prioritized questions to the product owner (P1 first). For each: build vs fix vs drop + proposed sequencing. These are not blocked now; owner answers become follow-up task records owned by the release agent.

---

## P1 questions

### Q1 — Prod/demo environment split + PITR drill (WS-0.6 / G2) — FIX
Which Supabase project topology should production use, and who owns the following, and are they confirmed present as of today:
1. Are `demo` and `prod` already **separate** Supabase projects, or still shared?
2. Is **PITR/backups** enabled and verified on the prod project?
3. Do you commit to running one **documented restore drill** and recording RPO/RTO in `docs/RECOVERY_AND_CONTINUITY_PLAN.md` (currently missing)?
4. What is the authoritative source for prod secrets — Vercel project env (per `deployment/*.env` header) and are these the "complete Vercel production env (STRIPE_*, RESEND_API_KEY, CRON_SECRET, INTERNAL_API_SECRET, ENCRYPTION_KEY, SITE_URL, Sentry DSNs)"?
- **Decision wanted**: build the restore-drill doc + env completion as the WS-0.6 task; fix placeholder-era templates; confirm project split.
- **Sequencing**: P1 — first release task.

### Q2 — Observability: Sentry DSNs + uptime + alerting + SLOs (WS-1.4 / G4) — BUILD
1. What are the **web** and **mobile** Sentry project DSNs (or should they be provisioned)? `lib/observability/sentry.shared.ts` and `apps/mobile/lib/observability/sentry.ts` already auto-enable when DSNs are present — this is a config/secret provisioning task.
2. Which endpoints/flows must have **uptime monitoring** beyond `/healthz` (auth? checkout? stream?), and which uptime provider do you want (Vercel Monitoring / external)?
3. Define **SLOs** for auth, checkout, and stream (target %, window).
4. Define the **on-call/alert routing** (rotation doc location + paging channel).
- **Decision wanted**: BUILD observability readiness as the WS-1.4 task; owner supplies real DSNs + SLO values + alert routing; agent wires config + instrument checkout/purchase funnel.
- **Sequencing**: P1 — after/parallel to Q1.

### Q3 — e2e as a required check + drives remaining CI failures (WS-1.6 / G3) — FIX
1. Confirm the **27 known vitest failures** remain blocked on open product/schema decisions (event-tour-builder, publication immutability, logistics contracts, music-post-preview, author-feed IDs, url_slug ownership, parity suites) — or are some now unblocked and should be fixed within this domain's CI work?
2. Do you want `e2e.yml` enabled as a **required branch check** for deploys now (it currently exists but is not a merge/required gate), accepting it may block merges until journeys pass?
3. Confirm the **typecheck budget** target (<10 min) and whether scoped tsconfigs are in scope.
- **Decision wanted**: FIX — enable e2e required check + schedule the 27-failure burn-down as follow-up tasks (some cross-domain to schema owners).
- **Sequencing**: P1.

### Q4 — Cron/worker scheduling + monitoring (WS-1.5 / G5) — BUILD
1. `event-reminders` is a **stub** (`app/api/cron/event-reminders/route.ts` "implement your reminder logic") and unscheduled. Should the release agent drive implementation + scheduling for it, or is reminder logic owned by another domain (handoff)?
2. MV refresh `refresh_forum_mviews` pg_cron is **commented out** (`supabase/migrations/20250816130000_scaling_indexes_forum.sql`). Confirm the desired schedule and that the release/database agent registers it via pg_cron.
3. **Worker-count discrepancy**: backlog says **21 music outbox workers** but the repo currently ships **16** `music:*outbox-worker` scripts. Is the target 21 (some not yet written) or 16 (backlog is stale)? And how should these be deployed — Vercel cron routes, a worker host, or pg_cron — with retry/DLQ and health checks?
- **Decision wanted**: BUILD — schedule/monitor all cron routes + register MV refresh; resolve the 21-vs-16 worker count and pick the worker deployment model; release agent (possibly with database/integrations handoff) implements `event-reminders`.
- **Sequencing**: P1.

### Q5 — Rate limiting active in prod (WS-1.3 / G6) — FIX
1. Confirm `RATE_LIMIT_ENFORCE=true` should be set in production and that real **Upstash** credentials exist (currently limiter degrades + `instrumentation.ts` warns "rate limiting is INACTIVE").
2. Which critical endpoints must return 429 under load / document reliance on Supabase built-ins for login/signup/reset?
3. Provide the go-ahead for a **prod load/rate-limit smoke** (G6 accept) once enforcing.
- **Decision wanted**: FIX — enable enforcement + credential provisioning + smoke test.
- **Sequencing**: P1, can parallel Q1.

---

## P2 questions

### Q6 — Migrate/retire legacy deployment surface (G-10) — DROP or ARCHIVE
Is `scripts/deploy.sh` + `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` + `deployment/ci-cd/github-actions.yml` still the intended deployment path (bare-metal/PM2/Docker), or should they be **archived** in favor of the Vercel CLI flows in `.github/workflows/deploy-{demo,production}.yml`? Recommend: drop/archive legacy bare-metal docs and keep Vercel + Docker production stack as the canonical path.
- **Sequencing**: P2 — after P1.

### Q7 — Dedicated Docker CI (G-09) — BUILD
Do you want a Docker workflow that builds/verifies `docker/production/Dockerfile` + compose in CI (since Docker is in the working set and verify:release implies it)? Or is Docker for deployment ops only (not a PR gate)? Recommend: optional workflow_dispatch Docker build+healthcheck, not a required PR gate.
- **Sequencing**: P2.

### Q8 — Observability/perf metric shipping (G-12) — DROP or FIX
Should `route-timing.ts` console logs be shipped to an APM/Sentry and a perf-budget CI gate added (WS-3.x), or is the console path sufficient for now? Recommend: defer to P3 scale work unless SLO work needs it.
- **Sequencing**: P3.

---

## Build vs fix vs drop summary

- **FIX**: Q1 (env/PITR), Q3 (CI/e2e), Q5 (rate limiting).
- **BUILD**: Q2 (observability), Q4 (cron/workers).
- **DROP/ARCHIVE**: Q6 (legacy deploy surface).
- **DEFER**: Q7 (docker CI — optional), Q8 (perf shipping — P3).

## Proposed sequencing

1. Q1 + Q5 (env/PITR + rate limiting) — parallel, unblock the G2/G6 gates.
2. Q2 (observability) — needs DSNs + SLO values from owner.
3. Q4 (cron/workers) — needs worker count + deployment model decision.
4. Q3 (CI/e2e/typecheck) — cross-domain; depends on product/schema decisions.
5. Q6/Q7 — after P1; Q8 — P3.

## Owner decisions — 2026-09-10

- Q1: production/demo split, PITR, restore-drill, and production secret
  evidence remain required before promotion.
- Q2: target web/mobile Sentry, `/healthz` plus auth/session and checkout
  uptime, separate auth/checkout alerts, a 99.9% monthly web/API target, and a
  documented on-call destination; actual provisioning remains open.
- Q3: keep e2e required only after the Vitest baseline is green and use scoped
  typechecks while the full check is resource constrained.
- Q4: use the approved hybrid worker direction; exact count/cadence/DLQ remains
  a follow-up reconciliation.
- Q5: enforce production rate limiting with provisioned Upstash credentials and
  verify a real 429 response.
