# 10 — Backend APIs, Jobs, Caching and Observability

## Public API routes

Kimi must reuse established Tourify route conventions.

Suggested endpoints:

```text
GET  /api/events/search
GET  /api/events/[eventId]
GET  /api/events/[eventId]/ticket-offers
POST /api/events/[eventId]/save
DELETE /api/events/[eventId]/save
POST /api/events/[eventId]/claim
GET  /api/artists/[artistId]/events
GET  /api/venues/[venueId]/events
GET  /api/tours/[tourId]/events
```

## Account integration routes

```text
GET    /api/integrations/events
POST   /api/integrations/bandsintown/connect
POST   /api/integrations/bandsintown/verify
POST   /api/integrations/bandsintown/sync
DELETE /api/integrations/bandsintown/disconnect
```

All mutation routes require authorization and ownership checks.

## Internal/admin routes

```text
GET  /api/admin/event-providers/health
GET  /api/admin/event-sync/runs
POST /api/admin/event-sync/enqueue
POST /api/admin/event-merges/[id]/approve
POST /api/admin/event-merges/[id]/reject
POST /api/admin/event-claims/[id]/approve
POST /api/admin/event-claims/[id]/reject
POST /api/admin/event-sources/[id]/disable
```

## Cron routes

```text
GET /api/cron/events/enqueue-refreshes
GET /api/cron/events/process-sync-jobs
GET /api/cron/events/expire-provider-data
GET /api/cron/events/rebuild-index
```

Every cron route must verify:

```http
Authorization: Bearer ${CRON_SECRET}
```

Do not depend on obscurity of the route.

## Job claiming

Use atomic claiming:

1. Select eligible jobs.
2. Lock with `FOR UPDATE SKIP LOCKED` or an equivalent safe function.
3. Set `locked_at` and `locked_by`.
4. Process within a bounded batch.
5. Commit success or retry state.
6. Release stale locks through a recovery job.

## Job priority

Suggested order:

1. Cancellation/status verification.
2. User-triggered connection sync.
3. User search cell refresh.
4. Events within seven days.
5. Active artist sync.
6. High-traffic market refresh.
7. Long-range catalog refresh.
8. Backfill.

## Rate limiting

Implement a provider-level token bucket or leaky bucket.

Track:

- Requests in current second/minute.
- Daily request count.
- Remaining quota from headers.
- Reset time.
- Reserved user-triggered budget.
- Backoff state.

Do not rely only on in-memory counters because serverless instances are distributed. Persist critical daily budget state or use an existing shared rate limiter.

## Caching layers

### Search response cache

Keyed by normalized:

```text
location cell
radius
date window
filters
sort
cursor
visibility scope
```

Do not include user-specific personalization in a shared cache key.

### Provider response cache

Provider-specific, short-lived and terms-aware.

### Canonical event cache

Cache public event DTOs with tag-based invalidation if the current Next.js architecture supports it.

### Negative cache

Cache:

- Missing provider artist.
- Missing provider event.
- Invalid external identity.
- Geocoding failure.

Use bounded TTLs.

## Revalidation

Invalidate event caches when:

- Canonical event changes.
- Ticket offer changes.
- Claim is approved.
- Merge occurs.
- Status changes.
- Source is disabled.
- Tour association changes.

## Observability

### Structured log fields

```text
timestamp
level
service
route
provider
job_id
sync_run_id
event_id
provider_event_id
correlation_id
duration_ms
request_count
records_received
records_changed
error_code
retryable
```

Never log API keys, access tokens or precise user device coordinates.

### Metrics

- Search latency p50/p95/p99.
- Search errors.
- Events returned.
- Cache hit rate.
- Provider requests.
- Provider errors by code.
- Rate-limit remaining.
- Jobs queued/running/failed.
- Sync duration.
- New canonical events.
- Auto matches.
- Review candidates.
- Duplicate rate.
- Stale record count.
- Index lag.

### Alerts

- API key unauthorized.
- Quota under threshold.
- Sustained provider errors.
- Job queue age too high.
- Index rebuild failure.
- Duplicate spike.
- Stale event spike.
- Search latency regression.
- Cron route unauthorized attempts.

## Admin health dashboard

Display:

- Provider enabled state.
- Last successful call.
- Current rate-limit status.
- Last sync.
- Queue depth.
- Oldest queued job.
- Error rate.
- Records created/updated.
- Merge candidate count.
- Claim backlog.
- Feature flag state.
