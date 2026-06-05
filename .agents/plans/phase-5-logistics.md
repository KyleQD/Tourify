# Phase 5 — Logistics & Production

> **Goal:** Surface all the already-built site map subsystems in the editor UI, replace the mock communication tab, fix broken metrics, and complete the travel/equipment tracking so logistics coordinators have a genuinely useful production management tool.

---

## 5.1 Expose zones in the site map editor

**Current state:** `GET /api/admin/logistics/site-maps/[id]/zones/route.ts` exists and returns zone data. The `simcity-site-map-viewer.tsx` editor likely doesn't expose zone creation/editing in the UI panel.

**Tasks:**

1. Add a "Zones" panel tab in the site map editor sidebar. Show all zones for this site map.
2. **Add zone:** Click "+" → dialog: name, color, capacity. Calls `POST /api/admin/logistics/site-maps/[id]/zones`. Zone appears as a labeled polygon overlay on the map.
3. **Edit zone:** Click a zone → inline name/color/capacity edit. Calls `PATCH /api/admin/logistics/site-maps/[id]/zones/[zoneId]`.
4. **Delete zone:** Confirmation dialog → `DELETE /api/admin/logistics/site-maps/[id]/zones/[zoneId]`.
5. Zone polygons must be draggable/resizable on the canvas. Store `{ points: [{x, y}] }` in the zone record.
6. Zone capacities sum to show "Total zone capacity" vs site map overall capacity.

**Done when:** Zones can be created, positioned, and labelled on a site map.

---

## 5.2 Expose tents in the site map editor

**Current state:** `GET /api/admin/logistics/site-maps/[id]/tents/route.ts` exists. Tents are not exposed in the editor UI.

**Tasks:**

1. Add a "Structures" panel tab showing tents/stages/booths.
2. **Add tent:** Form: name, type (tent/stage/booth/trailer), width_ft, depth_ft, capacity. Calls `POST /api/admin/logistics/site-maps/[id]/tents`. Renders as a labeled rectangle on the canvas.
3. **Edit/delete:** Same pattern as zones.
4. **Drag to position:** Tent position stored as `{x, y}` on the record.

**Done when:** Tents/stages can be added and positioned on the site map canvas.

---

## 5.3 Expose layers in the site map editor

**Current state:** `GET /api/admin/logistics/site-maps/layers/route.ts` exists. Layer switching is not exposed in the editor.

**Tasks:**

1. Add a layer switcher panel in the editor. Show all layers for this site map.
2. Each layer has a toggle (show/hide) and an "active layer" selector — new elements added to the active layer.
3. **Add layer:** Name + color. Calls `POST /api/admin/logistics/site-maps/layers` with `{ site_map_id, name, color, order }`.
4. **Reorder layers:** Drag-to-reorder. Calls `PATCH /api/admin/logistics/site-maps/layers/[id]` with new `order`.
5. Toggling layer visibility hides/shows all elements on that layer on the canvas.

**Done when:** Multiple layers can be created and toggled independently.

---

## 5.4 Expose measurements in the site map editor

**Current state:** `GET /api/admin/logistics/site-maps/measurements/route.ts` and `measurements/[id]/route.ts` exist.

**Tasks:**

1. Add a "Measurements" tool to the editor toolbar (ruler icon).
2. Click-drag on canvas to draw a measurement line. On release, input a label and actual distance (ft/m). Saves via `POST /api/admin/logistics/site-maps/measurements`.
3. Measurements render as dashed lines with distance labels on the canvas.
4. Measurement list in the side panel. Click to highlight on canvas. Delete to remove.

**Done when:** Distances can be marked on a site map and persist.

---

## 5.5 Import/export site maps

**Current state:** `GET /api/admin/logistics/site-maps/import/route.ts` and `site-maps/[id]/export/route.ts` exist.

**Tasks:**

1. **Export:** "Export" button in editor → `GET /api/admin/logistics/site-maps/[id]/export`. Return JSON of the complete site map (elements, zones, tents, layers, measurements). File downloads as `<site-map-name>.sitemapjson`.
2. **Import:** On the site maps list page, add "Import from file" button. File picker accepts `.sitemapjson`. Calls `POST /api/admin/logistics/site-maps/import` with the JSON body. Creates a new site map with all elements.
3. **PNG/image export:** Add "Export as image" option. Use `html-to-image` or `dom-to-image` library to capture the canvas as PNG and trigger download.
4. **Save as template:** "Save as template" button → calls `POST /api/admin/logistics/site-maps/[id]/save-template`. Templates appear in a "Templates" tab on the site maps list and can be duplicated.

**Done when:** A site map can be exported as JSON and re-imported; PNG download works.

---

## 5.6 Replace mock communication tab in logistics

**Current state:** `components/admin/logistics-collaboration.tsx` is wired to mock/stub data. The logistics page's communication tab renders this component.

**Tasks:**

1. Open `logistics-collaboration.tsx`. Find the mock data and replace with calls to the real messages API.
2. The logistics communication context is venue/production team. Wire to `GET /api/admin/communications?entity_type=logistics&entity_id=<site_map_id>` — returns team messages scoped to the logistics context.
3. Use the same `TeamMessage` interface already defined in `app/admin/dashboard/communications/page.tsx`.
4. "Send update" button → `POST /api/admin/communications` with `{ entity_type: 'logistics', entity_id: <site_map_id>, content, recipient_type: 'production_team' }`.
5. Show message list with sender name, content, timestamp. Mark unread messages.
6. Real-time: subscribe to `supabase.channel('logistics-comms-<site_map_id>')`.

**Done when:** Sending a message in the logistics tab persists and appears on reload.

---

## 5.7 Fix logistics page metrics

**Current state:** `app/admin/dashboard/logistics/page.tsx` shows catering and equipment metrics that may be hardcoded or scoped to the wrong entity.

**Tasks:**

1. Open `app/admin/dashboard/logistics/page.tsx`. Find the metrics cards.
2. Wire `GET /api/admin/logistics/metrics?event_id=<id>` (route exists) and display:
   - Equipment items tracked
   - Active site maps
   - Open vendor requests
   - Pending tasks
3. Add an event/entity scope selector at the top of the page: "Viewing: [All Events ▼]". Changing it re-fetches all metrics and data for that event.
4. Equipment metric should pull from `logistics_items` table scoped to the selected event.
5. Catering metric: if a `catering_orders` or `advancing_documents.meal_count` table is available, show real counts; otherwise hide the catering card until Phase 6 builds it out.

**Done when:** Metrics reflect real counts scoped to the selected event.

---

## 5.8 Complete or delete orphan mock components

**Confirmed mock components** (from codebase audit):

| Component | Mock detail | Real API available? |
|-----------|-------------|-------------------|
| `components/admin/logistics/equipment-catalog.tsx` | `loadEquipmentCatalog()` builds from `EQUIPMENT_SYMBOLS` constant with comment "For now, create mock data" | Yes — `GET /api/admin/logistics/equipment/catalog/route.ts` |
| `components/admin/logistics/equipment-inventory-manager.tsx` | Mock stats/instances/locations | Partially via `logistics/items` |
| `components/admin/logistics/real-time-equipment-tracker.tsx` | Mock tracking, alerts, geofences | No real tracking API |
| `components/admin/logistics/vendor-collaboration-hub.tsx` | Mock vendors, threads, messages, shares | No `/api/admin/logistics/vendors` route |
| `components/admin/logistics/vendor-dashboard.tsx` | Mock stats/equipment/workflows — does NOT call the existing `vendor/dashboard` route | `GET /api/admin/logistics/vendor/dashboard/route.ts` exists |
| `components/admin/logistics/vendor-management.tsx` | Mock vendor list; calls `/api/admin/logistics/vendors` which **doesn't exist** | Need to create route |
| `components/admin/logistics/automated-setup-workflows.tsx` | Mock workflows/templates/executions | No real API |

**Tasks:**

1. **Equipment catalog.** Replace `loadEquipmentCatalog()` mock with `fetch('/api/admin/logistics/equipment/catalog')`. Display real items: name, category, quantity, status.
2. **Vendor dashboard.** Wire `vendor-dashboard.tsx` to call `GET /api/admin/logistics/vendor/dashboard/route.ts` — the route exists but the component ignores it.
3. **Vendor management.** Create `app/api/admin/logistics/vendors/route.ts` (GET list, POST create, querying the `logistics_vendors` table from `20260328160000_logistics_vendor_tables.sql`). Wire `vendor-management.tsx` to it.
4. **Equipment inventory.** Wire to `GET /api/admin/logistics/items` which returns `logistics_tasks` data (the items API uses this table). Map the response to the inventory display format.
5. **Delete or stub remaining mocks.** `real-time-equipment-tracker.tsx` and `automated-setup-workflows.tsx` have no real backend. Either: (a) show `AdminEmptyState` with "Coming soon", or (b) delete and remove from the logistics page.
6. **Remove `/api/admin/logistics/vendors` 404.** Creating the route above resolves this.

**Done when:** No component in logistics renders from a local `const mockData = [...]`; equipment catalog calls the real API.

---

## 5.9 Travel & flight tracking

**Current state:** `components/admin/travel-coordination-hub.tsx` exists. `GET /api/admin/travel-coordination/route.ts` exists.

**Tasks:**

1. Open `travel-coordination-hub.tsx`. Check if it makes real API calls.
2. Wire to `GET /api/admin/travel-coordination?tour_id=<id>` or `?event_id=<id>`.
3. Travel records should include: traveler name, flight number, departure city, arrival city, departure_time, arrival_time, status (on-time/delayed/cancelled), accommodation.
4. **Add travel record:** Dialog with: traveler (staff picker), flight number, origin, destination, departure date/time, arrival date/time, airline. `POST /api/admin/travel-coordination`.
5. **Flight status:** If a `NEXT_PUBLIC_FLIGHT_AWARE_API_KEY` or similar env var exists, attempt live flight status lookup by flight number. Otherwise show "Status: Pending update" and a manual status selector.
6. **Ground transport:** Tab for ground transportation: driver name, vehicle, pickup location/time, dropoff location. `POST /api/admin/travel-coordination?type=ground`.
7. **Lodging:** `GET /api/admin/lodging?event_id=<id>` (route exists). Show hotel name, check-in/out, room block count, rooming list. `POST /api/admin/lodging`.
8. Link the travel hub to both the event detail (Travel tab) and the tour detail (Travel tab).

**Done when:** Travel records can be added and edited; the travel hub shows real data.

---

## Phase 5 Exit Criteria

- [ ] Zones can be created, positioned, and saved on site maps
- [ ] Tents/structures can be added and positioned
- [ ] Layer switching shows/hides elements by layer
- [ ] Measurements draw and persist on canvas
- [ ] Site map exports as JSON and PNG; imports from JSON file
- [ ] Logistics communication tab sends/receives real messages
- [ ] Logistics metrics cards show real counts from DB
- [ ] No logistics component renders from a local mock array
- [ ] Travel records (flights + ground + lodging) can be added
- [ ] `npm run build` passes
