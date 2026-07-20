# Admin Logistics Audit

**Date:** 2026-07-19  
**Hub:** `/admin/dashboard/logistics` → [`app/admin/dashboard/logistics/logistics-page-client.tsx`](../../app/admin/dashboard/logistics/logistics-page-client.tsx)  
**Scripts:** `npm run lint` | `npm run typecheck` | `npm test` (Jest) | `npm run test:unit` (Vitest)  
**Migrations:** additive under `supabase/migrations/`

## Platform conventions confirmed

| Concern | Convention |
|---------|------------|
| Auth | `withAdminAuth` / `withAuth` in `lib/auth/api-auth.ts` |
| Org scope | `resolveAuthorizedOrgLogisticsScope` in `lib/admin/resolve-authorized-org.ts` |
| Money | USD major-unit `DECIMAL(10,2)` + `formatSafeCurrency` — **not** cents |
| Site Map ACL | `lib/site-map/access.ts` |
| Tests | Vitest under `__tests__/logistics/`; Jest elsewhere |

---

## Per-tab audit

### Transport

| Field | Evidence |
|-------|----------|
| Route | `?tab=transportation` |
| Intended | Plan people/cargo moves with manifests, conflicts, ack, cost |
| Current | `LogisticsDynamicManager type=transportation` → `logistics_tasks` only |
| Data source | `logistics_tasks`; domain `ground_transportation_coordination` unused by this tab |
| Roles | Org admin via items API; assignees via `assigned_to_user_id` |
| Integrations | Task notifications on assign/status; **not** calendar flights/hotels |
| Missing | Domain segment UI, passenger manifests, conflict engine, TZ, vehicle capacity |
| Severity | **Blocker** |
| Fix | Canonicalize Transport on `ground_transportation_coordination`; tasks as linked checklists |
| Verification | Create segment → assign passenger → other org denied; calendar shows pickup |

### Hotels & Flights

| Field | Evidence |
|-------|----------|
| Route | `?tab=accommodations` |
| Intended | Hotels, flights, traveler matrix, private itineraries |
| Current | `TravelCoordinationHub` over real APIs; mock Recent Activity; `window.prompt` creates |
| Data source | `flight_coordination`, `lodging_*`, `ground_transportation_*`, `travel_groups` |
| Roles | Admin auth; RLS team/assignee helpers (partial) |
| Integrations | Lodging calendar table unused; no travel notifications |
| Missing | Passenger/rooming UI, privacy-filtered traveler view, real auto-coordinate |
| Severity | **High** |
| Fix | Forms + matrix; LodgingManagement patterns; timeline from DB; scope parent hooks |
| Verification | Traveler matrix gaps; private room details |

### Equipment

| Field | Evidence |
|-------|----------|
| Route | `?tab=equipment` |
| Intended | Catalog, inventory, reservations, manifests, custody |
| Current | Task manager only; orphan mock catalog/inventory/tracker |
| Data source | `logistics_tasks` + `equipment_assets` attach; `equipment_catalog` API unused by tab |
| Missing | Reservations, load manifests, real catalog UI |
| Severity | **High** |
| Fix | Wire catalog/assets; additive reservations; remove mock paths from mounted UI |

### Backline

| Field | Evidence |
|-------|----------|
| Route | `?tab=backline` |
| Intended | Artist requirements → fulfillment → approvals |
| Current | Tasks `type=backline` + rentals overlay; overview metrics wrong (equipment category filter) |
| Data source | `logistics_tasks`, `rental_*`; advancing `backline_*` unlinked |
| Missing | Requirement/fulfillment domain, substitution approvals |
| Severity | **High** |
| Fix | Additive `backline_requirements` / `backline_fulfillments`; keep separate from Equipment |

### Catering

| Field | Evidence |
|-------|----------|
| Route | `?tab=catering` |
| Intended | Services, headcount freeze, dietary privacy, orders |
| Current | Task manager only |
| Data source | `logistics_tasks`; advancing/day-sheet catering notes unlinked |
| Missing | Entire catering domain schema |
| Severity | **Blocker** |
| Fix | Additive catering tables + privacy-safe dietary aggregates |

### Comms

| Field | Evidence |
|-------|----------|
| Route | `?tab=communication` |
| Intended | Comms plans, channels, targeted ack updates |
| Current | `LogisticsCollaboration` + tasks; persists `team_communications` |
| Missing | `siteMapId` from page; org-scope on GET; notification fan-out; plan versioning |
| Severity | **Medium** |
| Fix | Scope + notify + ack + plan records |

### Site Map (integration only)

| Field | Evidence |
|-------|----------|
| Route | `?tab=site-maps` |
| Intended | Versioned publish, share/revoke, task/note anchors |
| Current | Strong CRUD/access/publish/share/tasks; `site_maps.version++`; `map_versions` unused in app |
| Missing | Immutable published snapshots in app; collaborators GET access check; ack on publish |
| Severity | **Medium** |
| Fix | Wire `map_versions` on publish; access fix; deep-link tasks — **no builder changes** |

---

## Shared foundation gaps

- Overview metrics: transport/equipment/backline computed client-side incorrectly; catering/comms use `apiMetrics`
- `useTravelCoordination()` on hub page unscoped (no event/tour)
- Readiness (`operations-readiness.ts`) used by builders, not logistics overview
- No `lib/logistics/*` adapters; conflict checks client-only for site-map placement
- Calendar aggregate reads only `logistics_tasks`

## Mock / orphan inventory

| Asset | Status |
|-------|--------|
| `real-time-equipment-tracker.tsx` | Mock data, unmounted |
| `automated-setup-workflows.tsx` | Mock data, unmounted |
| `vendor-management.tsx` | Ignores API, mock vendors |
| `equipment-catalog.tsx` | Response key mismatch + local create |
| `lodging-management.tsx` | Real API capable, unmounted |
| Dead rows in logistics-page-client | `TransportationRow`, `CateringCard`, `BacklineRow`, etc. |
| `auto_coordinate_group` | Stub: timeline meeting + status flip only |

## Tests today

- `__tests__/logistics/logistics-route-contract.test.ts`
- `__tests__/logistics/site-map-*.test.ts`
- Smoke: `docs/implementation/logistics-tab-smoke-checklist.md`
- Gap: no integration for travel/lodging/catering/backline domains
