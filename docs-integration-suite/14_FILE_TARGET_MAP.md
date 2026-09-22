# 14 — Provisional File Target Map

Kimi must replace this map with exact repository paths after the audit. Do not create duplicate architecture when equivalent modules already exist.

## Types and provider contracts

```text
app/types/events/*
lib/events/types.ts
lib/events/providers/types.ts
lib/events/providers/registry.ts
```

## Provider adapters

```text
lib/events/providers/ticketmaster/client.ts
lib/events/providers/ticketmaster/adapter.ts
lib/events/providers/ticketmaster/schema.ts
lib/events/providers/ticketmaster/normalizer.ts
lib/events/providers/bandsintown/client.ts
lib/events/providers/bandsintown/adapter.ts
lib/events/providers/bandsintown/schema.ts
lib/events/providers/bandsintown/normalizer.ts
```

## Canonical services

```text
lib/events/canonical-event-service.ts
lib/events/event-matcher.ts
lib/events/source-authority.ts
lib/events/ticket-offers.ts
lib/events/discovery-index.ts
lib/events/search-service.ts
lib/events/location.ts
lib/events/filters.ts
lib/events/cursors.ts
```

## API routes

```text
app/api/events/search/route.ts
app/api/events/[eventId]/route.ts
app/api/events/[eventId]/claim/route.ts
app/api/integrations/bandsintown/*
app/api/admin/event-providers/*
app/api/admin/event-sync/*
app/api/admin/event-merges/*
app/api/cron/events/*
```

## Public UI

```text
app/events/page.tsx
app/events/loading.tsx
app/events/error.tsx
app/events/[slug]/page.tsx
components/events/event-search.tsx
components/events/event-filters.tsx
components/events/location-picker.tsx
components/events/date-filter.tsx
components/events/event-card.tsx
components/events/event-list.tsx
components/events/event-detail.tsx
components/events/ticket-offers.tsx
components/events/empty-state.tsx
```

## Account UI

```text
components/integrations/bandsintown-connection.tsx
components/events/event-claim-dialog.tsx
components/tours/add-events-to-tour-dialog.tsx
```

## Admin UI

```text
app/admin/dashboard/events/providers/page.tsx
app/admin/dashboard/events/sync/page.tsx
app/admin/dashboard/events/duplicates/page.tsx
app/admin/dashboard/events/claims/page.tsx
components/admin/events/provider-health-card.tsx
components/admin/events/sync-run-table.tsx
components/admin/events/merge-review.tsx
```

## Database

```text
supabase/migrations/<generated>_event_provider_foundation.sql
supabase/migrations/<generated>_event_discovery_postgis.sql
supabase/migrations/<generated>_event_provider_rls.sql
supabase/migrations/<generated>_event_discovery_backfill.sql
```

Create migration filenames using the repository's Supabase CLI workflow. Do not invent timestamps manually.

## Tests

```text
tests/unit/events/*
tests/integration/events/*
tests/e2e/events/*
tests/fixtures/providers/ticketmaster/*
tests/fixtures/providers/bandsintown/*
```

## Documentation and tracking

```text
docs/event-discovery/AUDIT.md
docs/event-discovery/ARCHITECTURE.md
docs/event-discovery/OPERATIONS.md
docs/event-discovery/PROVIDER_TERMS_CHECKLIST.md
docs/event-discovery/IMPLEMENTATION_PROGRESS.json
```

## Configuration

Potential files:

```text
.env.example
vercel.json
middleware or route security configuration
feature flag configuration
analytics event registry
```

Kimi must not add a second environment-loading system or second feature-flag system if one already exists.
