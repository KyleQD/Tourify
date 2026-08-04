# TOUR-106 — Tour access and latency instrumentation

## Acceptance criteria

Metrics capture list/summary latency, denied/failed calls, stale read models, legacy-route usage, and client request fanout.

## Events

| Event | Source |
|---|---|
| `tour.list` | `GET /api/admin/tours` |
| `tour.summary` | `GET /api/admin/tours/[id]` |
| `tour.access_denied` | 401/403 outcomes |
| `tour.request_failed` | other 4xx/5xx |
| `tour.stale_read` | stale flag on list/summary |
| `tour.legacy_route` | `GET /api/tours` (+ beacon) |
| `tour.client_fanout` | portfolio + command-center beacons |

## Persistence

- Structured console log (always)
- Optional insert into `admin_tour_api_telemetry` when service role env is present
- In-process ring buffer for tests (`getRecentTourTelemetry`)

## Client beacon

`POST /api/admin/tours/observability` (`tour.view`)

## Verify

`__tests__/admin/tour-observability.test.ts`
