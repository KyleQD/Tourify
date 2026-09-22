# Event Discovery — Architecture

## Model

Tourify owns the product model. Providers contribute source records.

```
Ticketmaster API ─┐
Bandsintown API ──┼─> Provider adapters (lib/events/providers/*)
                  │      │ zod validation at the boundary
                  │      ▼
                  │   NormalizedExternalEvent
                  │      │
                  │      ▼
                  │  canonical-event-service.ingestExternalEvent()
                  │   1. upsert event_external_sources (provider, provider_event_id)
                  │   2. event-matcher: exact source identity → deterministic match → fuzzy review
                  │   3. create/refresh public.events (authority-aware)
                  │   4. upsert event_ticket_offers
                  ▼
        public.events (canonical, native-authoritative)
                  │
                  ▼
        event_discovery_index (PostGIS projection, trigger-maintained tsvector)
                  │
        event_discovery_nearby / event_discovery_upcoming (SQL RPCs)
                  │
        lib/events/search-service.ts → GET /api/events/search
                  │
        DiscoveryExplorer UI (/events, flag EVENT_DISCOVERY_V2)
```

## Data tables (all additive, RLS-enabled)

| Table | Purpose | Client access |
|---|---|---|
| `event_external_sources` | one row per provider event identity | public read via published events |
| `event_ticket_offers` | provider checkout links | public read via published events |
| `event_provider_connections` | artist/venue/org provider connections | owner only |
| `event_sync_jobs` | durable work queue | service role only |
| `event_sync_runs` | sync telemetry | service role only |
| `event_merge_candidates` / `event_merge_decisions` | dedup review | service role only |
| `event_slug_redirects` | merged URL 301s | public read |
| `event_claims` | ownership claims | self read/insert |
| `event_field_overrides` | field-level authority locks | authenticated read |
| `event_discovery_index` | search projection | public read (published+public only) |
| `user_event_discovery_preferences` | opt-in saved location | self only |

## Authority hierarchy (field-aware)

1. Verified owner / authorized Tourify editor (`event_field_overrides`, `locked`)
2. Native operational data (`events`, `events_v2`, `artist_events`)
3. Connected verified venue/organizer
4. Connected verified artist tour source (Bandsintown)
5. Primary ticketing provider (Ticketmaster)
6. Secondary catalog provider
7. Community submission

`applyProviderRefresh` skips any field locked by an override. Cancellation
status always reconciles from the provider. Provider source URLs and
checkout data are never editable by claimants.

## Flags (all default off)

`EVENT_DISCOVERY_V2` (+`NEXT_PUBLIC_` twin), `EVENT_PROVIDER_TICKETMASTER`,
`EVENT_PROVIDER_BANDSINTOWN`, `EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE`
(or explicit `BANDSINTOWN_MODE`), `EVENT_EXTERNAL_CLAIMS`, `EVENT_MAP_VIEW`,
`EVENT_RECOMMENDED_SORT`, `EVENT_PROVIDER_ADMIN_TOOLS`.

## Resilience

- Token-bucket rate limiter (4 rps, conservative) + daily budget with a
  500-request reserve for user-triggered searches.
- One 429 retry with Retry-After backoff + jitter; jobs back off
  exponentially (max 30 min) and go `dead` after max attempts — no retry storms.
- Stale job locks recover after 5 min.
- Native events are untouched by provider disable/failure.
