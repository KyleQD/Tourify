# Staffing Deployment Runbook

This runbook covers production operations for staffing APIs, dashboard cache behavior, and incident controls.

## Required migrations

Apply these in order:

1. `20260409130000_staffing_performance_indexes.sql`
2. `20260409133000_staffing_overview_rpc.sql`
3. `20260409134500_staffing_overview_cache.sql`
4. `20260409140000_staffing_api_telemetry.sql`
5. `20260409142000_staffing_alert_events.sql`
6. `20260409150000_unified_workflow_threads.sql`

## Cron jobs

- `GET/POST /api/cron/staffing-overview-refresh`
  - cadence: every 2-5 minutes
  - auth: cron secret required via existing route guard
  - query param: `limit` (default `200`, max `1000`)
  - optional query param: `stale_only=1` for targeted refresh set
  - optional query param: `venue_id=<uuid>` for single-venue refresh
- `GET /api/cron/workflow-automations`
  - cadence: every 5-10 minutes
  - auth: cron secret required via bearer token when `CRON_SECRET` is set
  - purpose: reminders, blocked-task escalations, approval nudges

## Key staffing endpoints

- `/api/staffing/permissions`
- `/api/staffing/employees`
- `/api/staffing/employee-overview`
- `/api/staffing/health`
- `/api/staffing/ops-actions` (authenticated manual ops actions)

These now emit:

- `x-request-id`
- `x-response-time-ms`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`

And overview additionally emits:

- `x-data-source` (`cache`, `rpc`, `live`)
- `x-cache-bypass-reason` (when auto-bypass engages)

## Feature flags and tuning

- `FEATURE_STAFFING_OVERVIEW_CACHE`
  - `1`/unset: use cache read/write path
  - `0`: disable cache path and serve live/rpc only

- `FEATURE_STAFFING_OVERVIEW_CACHE_AUTO_BYPASS`
  - `1`/unset: auto-bypass cache during high server error windows
  - `0`: never auto-bypass cache

- `STAFFING_OVERVIEW_CACHE_BYPASS_ERROR_RATE`
  - default: `0.2` (20% server errors)

- `STAFFING_OVERVIEW_CACHE_BYPASS_WINDOW_MINUTES`
  - default: `5`

- `STAFFING_CACHE_STALE_THRESHOLD_SEC`
  - default: `120`

- `STAFFING_ERROR_RATE_WARN_THRESHOLD`
  - default: `0.05`

- `STAFFING_P95_WARN_THRESHOLD_MS`
  - default: `1200`

- `STAFFING_ALERT_WEBHOOK_URL`
  - if set, warning/critical health alerts are posted to this webhook

- `STAFFING_ALERT_MIN_SEVERITY`
  - `info | warning | critical` (default `critical`)

- `STAFFING_ALERT_COOLDOWN_SEC`
  - cooldown per venue + alert key (default `900`)

- `FEATURE_STAFFING_SELF_HEAL`
  - `1`: allows health endpoint to trigger self-heal cache refresh on critical stale-cache alerts
  - default off

- `FEATURE_STAFFING_OVERVIEW_CACHE_AUTO_BYPASS`
  - `1`/unset: bypass cache automatically when server error rate is high
  - `0`: disable auto-bypass

- `STAFFING_OVERVIEW_CACHE_BYPASS_ERROR_RATE`
  - default `0.2`

- `STAFFING_OVERVIEW_CACHE_BYPASS_WINDOW_MINUTES`
  - default `5`

- `STAFFING_SELF_HEAL_COOLDOWN_SEC`
  - default `300`

- `FEATURE_UNIFIED_WORKFLOW_THREADS`
  - `1`: enables `/api/workflows/threads*` and workflow health telemetry
  - `0`/unset: workflow APIs disabled

- `FEATURE_WORKFLOW_TASK_BRIDGE`
  - `1`: `/api/events/[id]/tasks` reads/writes via `workflow_tasks`
  - `0`/unset: legacy `tasks` table path remains active

- `WORKFLOW_ALERTS_WEBHOOK_URL`
  - if set, cron workflow automations post critical SLA payloads

## Incident playbook

### 1) Elevated 5xx or unstable cache behavior

1. Set `FEATURE_STAFFING_OVERVIEW_CACHE=0`
2. Redeploy API
3. Verify `/api/staffing/employee-overview` returns `x-data-source=rpc|live`
4. Keep cron running for warm cache restoration

### 2) Stale cache alerts

1. Check staffing health panel (`/admin/dashboard/staff` or venue staff page)
2. Trigger cron manually:
   - `/api/cron/staffing-overview-refresh?limit=200`
3. Confirm `staffing_overview_cache.refreshed_at` advances

### 3) High latency (p95)

1. Confirm index migration applied
2. Confirm cache is enabled and fresh
3. Increase cron frequency temporarily
4. Inspect telemetry table for worst endpoints:
   - `staffing_api_telemetry` grouped by endpoint

### 4) Alerting and self-heal behavior

1. Confirm health API reports alerts:
   - `/api/staffing/health?venue_id=<uuid>`
2. Confirm webhook dispatch status appears in response (`alert_dispatch`)
3. If self-heal is enabled, confirm `self_heal` object reflects attempts and outcome
4. For manual intervention, call:
   - `/api/cron/staffing-overview-refresh?venue_id=<uuid>`
5. Authenticated operators can trigger actions from UI or API:
   - `POST /api/staffing/ops-actions`
   - body: `{ "venue_id": "<uuid>", "action": "refresh_cache" | "self_heal" }`

### 5) Unified workflow rollout

1. Deploy migration `20260409150000_unified_workflow_threads.sql`
2. Set `FEATURE_UNIFIED_WORKFLOW_THREADS=1` for internal staff only
3. Run backfill once:
   - `npx tsx scripts/backfill-workflow-threads.ts`
4. Enable bridge gradually:
   - `FEATURE_WORKFLOW_TASK_BRIDGE=1` for selected venues/events
5. Verify workflow telemetry in health endpoint:
   - `/api/staffing/health?venue_id=<uuid>` (`data.workflow`)

## Verification checklist

- Health endpoint returns fresh cache and low error rate:
  - `/api/staffing/health?venue_id=<uuid>`
- Employees endpoint paginates correctly:
  - `/api/staffing/employees?venue_id=<uuid>&page=1&limit=20`
- Overview source mostly `cache` during normal operation.
