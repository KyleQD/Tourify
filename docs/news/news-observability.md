# News Feed Observability

## Implemented Telemetry
- Feed served event emitted from `app/api/news/feed/route.ts`
- Helper: `lib/news/telemetry.ts`
- Captures:
  - facet
  - user context (`anonymous` fallback)
  - item count
  - latency in ms
  - cache hit/miss

## Dashboard KPIs
- p95 feed latency
- cache hit ratio
- item diversity by source
- moderation label distribution
- facet usage distribution

## Recommended Alerts
- p95 latency above SLO threshold
- error rate spike on `/api/news/feed`
- sustained cache hit drop
- moderation backlog growth for `review_pending`

## Test Coverage
- Ranking and cursor behavior tests:
  - `lib/news/ranking.test.ts`
