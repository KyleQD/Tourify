# 04 — Ticketmaster Integration

## Purpose

Use Ticketmaster Discovery API to seed broad event discovery without making Tourify dependent on Ticketmaster's data model or availability.

## Supported initial use cases

- Search events around a geographic point.
- Search by date window.
- Search by keyword.
- Search by country, state, city and classification.
- Resolve Ticketmaster venues and attractions.
- Store approved external ticket URLs.
- Create or update canonical Tourify event candidates.

## Configuration

Server-only environment values:

```text
TICKETMASTER_API_KEY
TICKETMASTER_BASE_URL=https://app.ticketmaster.com/discovery/v2
TICKETMASTER_ENABLED=false
TICKETMASTER_REQUESTS_PER_SECOND=2
TICKETMASTER_DAILY_REQUEST_BUDGET=5000
TICKETMASTER_DEFAULT_RADIUS_MILES=50
TICKETMASTER_MAX_RADIUS_MILES=250
TICKETMASTER_CACHE_TTL_MINUTES=<reviewed value>
```

The request-per-second limit must be configurable. Ticketmaster official pages currently show inconsistent per-second defaults in different documentation areas. Use the more conservative configured limit until the application's actual key and response headers confirm its allowance.

## Geographic query translation

Tourify search input:

```ts
{
  lat: number;
  lng: number;
  radiusMiles: number;
  startsAt?: string;
  endsAt?: string;
  keyword?: string;
  categories?: string[];
  pageCursor?: string;
}
```

Adapter responsibilities:

1. Convert latitude/longitude to the provider-supported `geoPoint`.
2. Pass radius and unit.
3. Pass ISO date boundaries.
4. Translate Tourify categories to Ticketmaster classification IDs or names.
5. Enforce provider page-size and pagination limits.
6. Sanitize keyword length and characters.
7. Parse rate-limit headers.
8. Reject unsafe or unsupported combinations before calling the provider.

## Ingestion strategy

Do not crawl every possible location continuously.

### Demand-driven cells

Create normalized search cells based on:

- Active user search locations.
- High-traffic cities.
- Markets with Tourify artists or venues.
- Upcoming Tourify tours.
- Admin-configured launch markets.

A cell can be represented by a geohash or rounded coordinates plus radius and date window.

### Refresh cadence

Suggested policy, subject to provider terms and real quota:

| Event state | Suggested refresh |
|---|---|
| More than 90 days away | Every 24 hours |
| 30–90 days away | Every 12 hours |
| 7–30 days away | Every 6 hours |
| Less than 7 days away | Every 2–4 hours |
| Cancelled/postponed | Daily until reconciled |
| Past event | Stop routine refresh after final reconciliation |

The scheduler must calculate cost before enqueueing jobs and respect a daily reserve for user-triggered searches.

### On-demand searches

If a search cell is stale:

1. Return existing canonical results immediately where possible.
2. Enqueue or perform a bounded provider refresh.
3. Merge new results.
4. Revalidate the search response.
5. Avoid multiple simultaneous refreshes for the same cell by using a lock.

## Normalization

Normalize:

- Provider event ID.
- Name and normalized name.
- Start/end times and timezone.
- Event status.
- Venue and coordinates.
- Attractions/performers.
- Classifications.
- Images.
- Ticket URL.
- On-sale window.
- Price range when present.
- Provider source.
- Last fetched timestamp.

## Data-retention caution

Ticketmaster's terms restrict caching or storing event content beyond reasonable periods needed to provide the service. The implementation must therefore:

- Store only fields needed for Tourify's service.
- Keep provider-specific retention configurable.
- Refresh or expire provider data.
- Preserve Tourify-owned data separately.
- Support removal within the required operational window.
- Avoid using Ticketmaster as generic image hosting.
- Include required source attribution.
- Obtain legal review before monetizing API-derived content outside an approved affiliate or partner structure.

## Failure behavior

- `401`: disable the adapter and alert operations; do not retry repeatedly.
- `429`: honor reset headers, reduce concurrency and pause queued work.
- `5xx`: retry with exponential backoff and jitter.
- Invalid event payload: quarantine the record and log validation details.
- Missing coordinates: ingest only if a location can be safely resolved through an approved process.
- Removed event: mark the source record unavailable; do not automatically delete a claimed native event.

## Acceptance criteria

- API key never reaches the client bundle.
- Search by location and date produces normalized results.
- Duplicate ingestion is idempotent.
- Rate-limit state is visible to admins.
- The provider can be disabled without breaking native events.
- Provider source URLs are preserved.
- Ticket links are tracked as outbound clicks without altering checkout behavior.
- Provider content expiration and removal paths are implemented.
