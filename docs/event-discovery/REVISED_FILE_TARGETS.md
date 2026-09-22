# Revised File Targets (post-audit)

Replaces `14_FILE_TARGET_MAP.md` provisional paths. Existing modules are reused where listed.

## Types & provider contracts (new)

```
lib/events/providers/types.ts            provider enum, adapter interface, normalized contract
lib/events/providers/registry.ts         provider registry (pattern mirrors lib/music/providers/registry.ts)
lib/events/providers/flags.ts            EVENT_* env flags (pattern mirrors lib/config/audit-feature-gates.ts)
lib/events/providers/schemas.ts          zod runtime schemas for normalized payloads
```

## Provider adapters (new)

```
lib/events/providers/ticketmaster/{client,adapter,schema,normalizer,rate-limiter}.ts
lib/events/providers/bandsintown/{client,adapter,schema,normalizer}.ts
```

## Canonical services (new, beside existing lib/events/*)

```
lib/events/canonical-event-service.ts
lib/events/event-matcher.ts
lib/events/source-authority.ts
lib/events/ticket-offers.ts
lib/events/discovery-index.ts            index builders; REUSES lib/discover/normalize.ts + resolve-public-event mapping
lib/events/search-service.ts
lib/events/location.ts                   geo utils (extends lib/discover/location-match.ts, no fork)
lib/events/filters.ts
lib/events/cursors.ts
lib/events/sync/queue.ts                 DB-backed job claim over event_sync_jobs
```

## API routes (new)

```
app/api/events/search/route.ts
app/api/events/[eventId]/claim/route.ts
app/api/integrations/bandsintown/{connect,status,disconnect}/route.ts
app/api/admin/event-providers/route.ts
app/api/admin/event-sync/{runs,jobs}/route.ts
app/api/admin/event-merges/route.ts
app/api/admin/event-claims/route.ts
app/api/cron/events/sync/route.ts
```

## Public UI (extend, not replace)

- Keep `app/events/page.tsx` as shell; mount new `components/events/discovery/*` behind `EVENT_DISCOVERY_V2` (fallback = current `enhanced-discover-events`).
- Keep `/api/events/discover` until parity verified.

```
components/events/discovery/{search-bar,filter-sheet,location-picker,date-filter,sort-control,discovery-event-card,empty-state}.tsx
components/events/ticket-offers.tsx
components/integrations/bandsintown-connection.tsx
components/events/event-claim-dialog.tsx
components/tours/add-events-to-tour-dialog.tsx
```

## Admin UI (register in admin route registry)

```
app/admin/dashboard/events/providers/page.tsx
app/admin/dashboard/events/sync/page.tsx
app/admin/dashboard/events/duplicates/page.tsx
app/admin/dashboard/events/claims/page.tsx
components/admin/events/{provider-health-card,sync-run-table,merge-review}.tsx
```

## Migrations (Supabase CLI naming, generated timestamps)

```
supabase/migrations/<ts>_event_provider_foundation.sql     Phase 1 tables + RLS
supabase/migrations/<ts>_event_discovery_postgis.sql       Phase 2 postgis + index + search fn
supabase/migrations/<ts>_event_discovery_backfill.sql      Phase 2 native backfill (batched)
supabase/migrations/<ts>_event_claims_merges.sql           Phase 5/6 tables
```

## Tests

```
__tests__/events/providers/*.test.ts        (vitest, mirrors __tests__ layout)
__tests__/events/search/*.test.ts
__tests__/events/rls/*.test.ts              (extends rls-matrix pattern)
tests/e2e/events-discovery.spec.ts          (playwright)
tests/fixtures/providers/{ticketmaster,bandsintown}/*.json
```

## Config

- `.env.example` — add EVENT_* flags, TICKETMASTER_API_KEY, BANDSINTOWN_* (placeholders only)
- `lib/config/environment-contract.ts` — register new vars
- `vercel.json` — add `/api/cron/events/sync` at an off-peak minute
- Admin route registry + service-role allowlist — register new routes

## Docs/tracking

```
docs/event-discovery/{AUDIT,EXISTING_DATA_MODEL,EXISTING_ROUTE_AND_UI_MAP,INTEGRATION_CONFLICTS,REVISED_FILE_TARGETS,PROVIDER_TERMS_CHECKLIST}.md
docs/event-discovery/IMPLEMENTATION_PROGRESS.json
docs/event-discovery/ARCHITECTURE.md      (Phase 1 end)
docs/event-discovery/OPERATIONS.md        (Phase 8)
```
