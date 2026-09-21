# Observability: SLO and runbooks

The Tourify web/API surface runs on a **99.9% monthly SLO** for the public
web pages and public/authenticated API endpoints served by this deployment.

This document is the published contract referenced by the RELEASE-003
acceptance gate. It records the measurable target, the error budget, the alert
routing contract, and the runbooks owned by the acknowledged on-call holder.
Values that require hosted/owner provisioning are **recorded as blockers**, not
fabricated here.

## SLO

- **Objective:** 99.9% availability per calendar month for the public web and
  API surface (liveness, readiness, and release-metadata endpoints included).
- **Window:** each calendar month, 99.9% of valid `GET`/`HEAD` requests served
  without `5xx` or timeout, measured against a valid throttled request sample.
- **Error budget:** 0.1% of demand per month (approx. 43 minutes of downtime
  in a 30-day month at full utilization). Budget exhaustion triggers the
  elevated-error-rate runbook, not silence.
- **Measurement:** loopback-only probes (`scripts/ci/smoke-*.mjs`) verify the
  local contract; hosted uptime verification against `/healthz` and `/readyz`
  is an **owner-provisioned blocker** (see below).

### Hosted blockers (not fabricated)

The following values are **not** provisioned or fabricated by the local lane:

- Real Sentry **DSN**, uptime provider (e.g. Better Stack / UptimeRobot), and
  on-call **ack owner** + routing destination — must be supplied by the
  deploy/ops owner. Until then the "alerts route to acknowledged on-call
  owner" acceptance is Open/Blocked.
- Scheduled 24-hour staging soak — required before web launch; not yet run.

## Alert routing contract

All operational alerts funnel to a single acknowledged on-call holder. In the
absence of a provisioned routing destination, alerts are recorded as Pager-duty
style **pending owner assignment** and escalate to the deployment owner after
15 minutes. Alerts cover: service uptime, Redis health, auth, checkout,
webhook delivery, and elevated error rate.

## Runbooks

### 1. Service uptime down (web/API)

1. Confirm from `/readyz` whether the failure is a dependency (`redis`,
   `supabase`) rather than the app shell.
2. If dependency-only, follow the dependency runbook (below) and keep the app
   shell serving `200` on `/healthz`.
3. If app shell: redeploy last-known-good release (see
   `docs/DEPLOYMENT_ROUTINE.md`), then re-run `npm run smoke:healthz` and
   `npm run smoke:readyz` (loopback-only).
4. Escalate to deployment owner if not resolved within 15 minutes.

### 2. Redis unavailable / degraded

1. Check `UPSTASH_REDIS_REST_URL`/token are present and reachable.
2. `/readyz` reports `redis: degraded` (> 500 ms) or `unavailable` — readiness
   returns `503`; liveness stays `200`.
3. Restart/expand the Upstash instance; verify with `smoke:readyz`.
4. Note: Redis is a required service; if truly unavailable for > 5 min,
   announce incident and route to owner.

### 3. Auth unavailable

1. `/readyz` `supabase` degraded/unavailable indicates auth dependency.
2. Verify Supabase project & anon key; re-run `smoke:readyz`.
3. If Supabase is up but auth errors persist, check Sentry/webhook output for a
   release-tagged regression; restore previous release if release-tagged.

### 4. Checkout failure

1. Elevated 5xx or payment-failure rate on `/api/ticketing/**` — treat as P1.
2. Verify webhook signing + order ledger idempotency (see
   `docs/engineering/agents/ticketing/` state).
3. If a code regression: rollback to previous release; do not partially patch a
   live checkout flow under load.

### 5. Webhook delivery failure

1. Confirm OAuth callback / webhook signature validation; retry with backoff.
2. If persisted, route to integration owner; do not drop events.

### 6. Elevated error rate / error budget exhaustion

1. `/readyz` remains loopback-only; real rate is measured in the uptime
   provider (hosted blocker).
2. On budget exhaustion: announce incident, freeze non-essential deploys,
   triage to acknowledged on-call owner, and escalate to the deployment owner
   if unresolved in 15 minutes.
</content>
