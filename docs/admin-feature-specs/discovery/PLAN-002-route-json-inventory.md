# PLAN-002 — Inventory of route JSON / settings

**Status:** Complete  
**Date:** 2026-07-20  
**Spec AC:** Every current field has canonical destination, migration/default rule, compatibility read period, and retirement owner.

## Authority after the current migrations

| Store | Role |
|-------|------|
| `tour_versions` + active `tour_stops` | Canonical versioned plan and ordered show/non-show placements; an empty canonical draft is authoritative |
| `events_v2` | Operational show identity referenced by a show stop; never created for a non-show day |
| `tour_events` | Compatibility projection/link for older event/tour consumers during reconciliation |
| `tours.settings.route` | Derived compatibility projection and legacy backfill input only |
| Request `routing` / `settings.routing` | Legacy aliases; rejected by canonical plan writes and read only when canonical/versioned data is unavailable |

**Created:** `tour_versions`, `tour_stops`, `tour_plan_quarantine`, `tour_route_legs`, `tour_stop_holds`, and hold history.  
**Compatibility cutoff:** per organization, only after PLAN-602 reports zero unexplained differences and the legacy-write flag is disabled. PLAN-603 owns code-path retirement.

## Field map

| Current field | Canonical destination | Migration / default | Compatibility read period | Retirement owner |
|---------------|----------------------|---------------------|-------------|------------------|
| `tours.settings` (jsonb) | Slim compatibility/preferences bag; plan metadata in `tour_versions` | Preserve unknown keys; never use as canonical stop storage | Through org PLAN-602 cutover | PLAN-603 |
| `settings.route[]` | `tour_stops` | Deterministic merge with `tour_events`; conflicts to `tour_plan_quarantine`; never invent org | Through org PLAN-602 cutover | PLAN-603 |
| payload `routing` | Canonical `stops[]` command | Reject independent canonical-plan writes; map only at legacy adapter boundary | Legacy endpoints only until PLAN-603 | PLAN-603 |
| `settings.routing` / `tour.routing` | Retire | No new canonical writes; hydrate only if canonical version and `settings.route` are absent | Through org PLAN-602 cutover | PLAN-603 |
| `settings.route_notes` | `tour_versions.route_notes` | Copy text; null when absent | Through org PLAN-602 cutover | PLAN-603 |
| `settings.markets` | `tour_versions.markets`, later derived from active stops | Normalize string values; empty array when absent | Through org PLAN-602 cutover | PLAN-603 |
| `events[]` / `event_ids[]` | `tour_stops.event_id` → `events_v2.id` | Exact/merge/attach-only reconciliation; same-org existing IDs only | Legacy event/tour consumers through PLAN-602 | PLAN-603 |
| stop `id` / client key | `tour_stops.id` / `client_key` | Preserve UUID identity; client-only keys never become event IDs | Route JSON key read until PLAN-602 | PLAN-603 |
| stop `name` / `city` | `tour_stops.name` | `name`, then legacy `city`, then explicit validation error for canonical writes | Route JSON through PLAN-602 | PLAN-603 |
| stop `stop_type` | `tour_stops.stop_type` | Default `show` only for legacy show/event links; canonical command validates supported type | Route JSON through PLAN-602 | PLAN-603 |
| stop `ordinal` / `order` | `tour_stops.ordinal` | Convert legacy one-based `order` to zero-based ordinal; duplicates quarantine or command failure | `tour_events.ordinal` bridge through PLAN-602 | PLAN-603 |
| stop `date` / `event_date` | `tour_stops.local_date`; show instant on `events_v2.start_at` | Parse ISO local date with stop zone; invalid/missing required show date is not defaulted | Route/event bridge through PLAN-602 | PLAN-603 |
| stop `time` / `event_time` | `tour_stops.local_time`; resolved UTC instant on event | Preserve nullable local time; DST gap/fold requires explicit resolution | Route/event bridge through PLAN-602 | REL-301 / PLAN-603 |
| stop `timezone` | `tour_stops.timezone` and event/venue IANA zone | Preserve valid IANA value; missing zone is a readiness warning, not browser default | Route/event bridge through PLAN-602 | REL-301 / PLAN-603 |
| `window_start`, `window_end` | `tour_stops.window_start`, `window_end` | Nullable; validate ordering when both present | Route JSON through PLAN-602 | PLAN-603 |
| `venue_id` | `tour_stops.venue_id`; operational venue relation on `events_v2` | Same-org/reachable venue only; nullable for free-text planning | Route/event bridge through PLAN-602 | PLAN-603 |
| `venue`, `venue_name` | `tour_stops.venue_label` | Preserve free-text draft; do not invent a venue UUID | Route/event bridge through PLAN-602 | PLAN-603 |
| `market` / legacy `city` | `tour_stops.market` | Copy nullable text; never infer from browser/location | Route/link bridge through PLAN-602 | PLAN-603 |
| `leg_name` | `tour_stops.leg_name`; route segmentation metadata | Copy nullable text; travel computation belongs to `tour_route_legs` | `tour_events` bridge through PLAN-602 | ROUTE-301 / PLAN-603 |
| `capacity` | `tour_stops.capacity` / canonical ticketing config when explicitly provisioned | Nullable integer; never seed ticket inventory or default capacity | Route/event bridge through PLAN-602 | PLAN-603 / TIX-603 |
| `advance_status` | `tour_stops.advance_status`, later advance-domain projection | Default `not_started` for a new canonical stop; preserve migrated values | `tour_events` bridge through ADV cutover | ADV-401 |
| `planning_status` | `tour_stops.planning_status` | Default `draft`; validate draft/confirmed/tentative/held/cancelled | Route JSON through PLAN-602 | PLAN-603 |
| `notes` | `tour_stops.notes` | Copy nullable text; route-leg-specific notes move separately | Route/link bridge through PLAN-602 | PLAN-603 |
| `routing_notes` | `tour_route_legs` notes / stop notes by scope | Copy only after scope classification; unresolved values stay quarantined | `tour_events` bridge through ROUTE cutover | ROUTE-301 |
| `contact_name/email/phone` | `tour_stops.contact_*`; hold contact on `tour_stop_holds` | Normalize blanks to null; protected projection rules apply | Route JSON through PLAN-602 | PLAN-603 |
| `tour_events.is_primary` | Explicit event↔tour assignment metadata | Preserve during multi-tour compatibility; do not infer from row order | Through event assignment cutover | PLAN-603 |
| `events_v2.settings.venue_*` | Event venue/setup fields plus stop venue draft | Keep operational event data; stop snapshot remains version-specific | Supported event compatibility | EVENT-602 |
| `settings.published_at` | `admin_publication_snapshots.published_at` | Historical read only; new publish uses transactional snapshot | Through PUB-604 | PUB-604 |
| Planner ops keys (`artists`, `crew`, `transportation`, `lodging`, `equipment`, ticket types) | Workforce/travel/logistics/ticketing domain commands | Retain as setup intent/legacy read only; never seed operational rows implicitly | Domain-specific migration window | WORK/TRAVEL/LOG/TIX retirement owners |
| Builder free-text keys (`branding`, budget, guarantees, settlements, per diems, documents, credentials, announcements) | Tour metadata/version or owning finance/content/comms domain | Preserve until each destination exists; never treat as route fields | Domain-specific migration window | TOUR/FIN/PUB/COMMS owners |
| Legacy `route_coordinates` | `tour_route_legs` provider result or retire | Do not copy without source/version evidence | Read-only if present until ROUTE-601 | ROUTE-601 |

## Write path (current)

New tour shell: builder → `POST /api/admin/tours`; then reconciliation preview → `PUT /api/admin/tours/:id/plan` → `writeTourPlan` validates acting org, capability, expected version, and full stop schema → reconciles event compatibility links → bumps plan version → persists normalized draft stops → derives `settings.route`.

Existing tour: builder loads tour + canonical plan + event compatibility links in parallel, but canonical plan presence (including zero stops) wins. Save uses only the canonical plan command. Normalization errors are surfaced; they do not silently become an empty legacy plan.

## Reconciliation and retirement gates

- Backfill is deterministic and expand-only; unresolved organization, event, ordinal, or route conflicts are quarantined.
- Per-org counts and field comparisons must report zero unexplained differences before legacy writes are disabled.
- Compatibility reads remain available only while the org has not cut over or canonical tables truly do not exist; dependency errors are not fallbacks.
- PLAN-603 removes aliases/components only after telemetry shows no live use. Historical JSON may remain retained; retirement means no live authority/write path, not destructive data deletion.
