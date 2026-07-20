# Logistics Functional Spec (Tourify-mapped)

Maps the product prompt to repository reality. Status vocabulary is a **UI map** over native domain columns.

## Shared operational model

### Scope
Every logistics surface retains: owning organization, selected tour and/or event, venue TZ when known, date/status filters. Deep links use `?tab=&eventId=&tourId=&siteMapId=`.

### Status maps (`lib/logistics/status.ts`)

| UI operational | Example native values |
|----------------|----------------------|
| draft | draft, pending |
| planned | scheduled, reserved |
| confirmed | confirmed, booked |
| in_progress | en_route, boarding, checked_in |
| completed | completed, landed, checked_out, returned |
| cancelled | cancelled |
| issue | delayed, damaged, no_show |

| UI approval | Values |
|-------------|--------|
| not_required / pending / approved / changes_requested / rejected | used by backline substitutions & catering orders |

| UI assignment | Values |
|---------------|--------|
| unassigned / pending / acknowledged / declined / completed | passenger ack, map tasks, critical change ack |

### Money
Store projected/approved/committed/actual as USD major-unit numbers. Display via `formatSafeCurrency`.

### Time
Persist `timestamptz`; retain IANA `timezone` on itinerary/timeline rows when present (default UTC).

---

## Tab specs (acceptance)

### 1. Transport
- CRUD ground segments on `ground_transportation_coordination`
- Passenger assignments; optional cargo via equipment link / notes
- Linked `logistics_tasks` with `source_type=transport_segment`
- Conflicts: capacity, double-booked driver (name/plate), impossible transfer vs flight arrival
- Publish → notification + calendar entry; ack on passenger assignment

### 2. Hotels & Flights
Views: Overview | Hotels | Flights | Travelers | Issues  
- Hotels: lodging bookings + guest/room assignments; rooming list admin-only  
- Flights: segments + passenger assignments; no live GDS required  
- Travelers matrix: gaps for flight / lodging / ground by member  
- Private: traveler APIs filter to own assignments  

### 3. Equipment
- Catalog templates + asset instances  
- Reservations by event/tour window  
- Tasks for pick/pack/return  
- Conflicts: overlapping serial reservations  

### 4. Backline
- Requirements per artist/event; fulfillment links to assets/vendors  
- Substitutions require approval when flagged  
- Rider change → impact list (no silent mutate of approved requirement)  

### 5. Catering
- Service periods; headcount snapshot; dietary **counts** for kitchen  
- Individual dietary PII only to authorized roles  
- Link advancing notes as import source  

### 6. Comms
- Scoped communications with event/tour/site_map  
- Fan-out notifications; critical ack  
- Channel plan records (additive)  

### 7. Site Map integration
- Publish writes immutable `map_versions` snapshot  
- Share/revoke via collaborators + live ACL  
- Tasks/notes reference `map_version_id` + optional `anchor_id` (zone/element id)  
- **No builder edits**
