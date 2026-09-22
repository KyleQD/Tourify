# Existing Route & UI Map — Event Domain

## Public pages

| Route | File | Notes |
|---|---|---|
| `/events` | `app/events/page.tsx` | landing/listing; has `loading.tsx`, `error.tsx` |
| `/events/[slug]` | `app/events/[slug]/page.tsx`, `layout.tsx` | resolves across `events`, `events_v2`, `artist_events` via `lib/events/resolve-public-event.ts` |
| `/events/[slug]/hq` | `app/events/[slug]/hq/page.tsx` | management HQ |
| `/events/create` | `app/events/create/page.tsx` | creation workflow |
| `/discover` | `app/discover/…` | platform discovery hub (event rail included) |

## API routes (existing)

| Route | Purpose |
|---|---|
| `GET /api/events` | list/create (`app/api/events/route.ts`) |
| `GET /api/events/discover` | merged discovery feed (3 tables, service role) |
| `GET /api/events/[id]` | detail |
| `/api/events/[id]/attendance`, `/participants`, `/guestlist`, `/page`, `/tasks`, `/posts`, `/group-chats`, `/hq/*`, `/job-postings`, `/jobs`, `/staff`, `/finances`, `/incidents`, `/vendors`, `/locations`, `/share-message` | event sub-resources |
| `/api/events/me/attending` | my attendance |
| `/api/events/planner` | planner |
| `/api/cron/event-reminders` | existing event cron |

## New API routes planned

```
app/api/events/search/route.ts            (Phase 2/3 — discovery-index search)
app/api/events/[eventId]/claim/route.ts   (Phase 6)
app/api/integrations/bandsintown/*        (Phase 7)
app/api/admin/event-providers/*           (Phase 8)
app/api/admin/event-sync/*
app/api/admin/event-merges/*
app/api/admin/event-claims/*
app/api/cron/events/sync/route.ts         (Phase 4/8, CRON_SECRET-verified)
```

## Components (existing)

`components/events/`: `event-card.tsx`, `enhanced-event-card.tsx`, `events-filters.tsx`, `events-list.tsx`, `enhanced-discover-events.tsx`, `create-event-dialog.tsx`, `enhanced-event-creator.tsx`, `event-share-menu.tsx`, `event-select.tsx`, `event-analytics-dashboard.tsx`, `events-management.tsx`, `public/` (public page renderers).

## New components planned

```
components/events/discovery/search-bar.tsx
components/events/discovery/filter-sheet.tsx        (mobile)
components/events/discovery/location-picker.tsx
components/events/discovery/date-filter.tsx
components/events/discovery/sort-control.tsx
components/events/discovery/discovery-event-card.tsx
components/events/discovery/empty-state.tsx
components/events/ticket-offers.tsx
components/integrations/bandsintown-connection.tsx
components/events/event-claim-dialog.tsx
components/tours/add-events-to-tour-dialog.tsx
app/admin/dashboard/events/providers/page.tsx
app/admin/dashboard/events/sync/page.tsx
app/admin/dashboard/events/duplicates/page.tsx
app/admin/dashboard/events/claims/page.tsx
```

Admin pages must be added to the admin route registry (`check:admin-route-registry`).

## URL conventions

- Canonical event URL: `/events/[slug]` (slug globally unique on `events`).
- Discovery filters: URL search params persisted (`?q=&loc=&lat=&lng=&radius=&from=&to=&cat=&genre=&free=&sort=`) — pattern already used by `/api/events/discover` (`type`, `location`, `dateFrom`, `dateTo`, `tags`, `sortBy`).
- Merged-event losers get rows in `event_slug_redirects` and 301 to the surviving slug.
