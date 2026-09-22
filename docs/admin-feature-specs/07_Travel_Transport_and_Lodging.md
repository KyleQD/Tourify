# Travel, transportation, vehicles, and lodging

## Outcome

Create a structured tour-party itinerary connected to canonical route legs. Managers must be able to determine where every traveler is supposed to be, how they move, where they sleep, which capacity/confirmation/detail is missing, what changed, and who must be notified—without relying on arbitrary payloads or generic tasks.

## Current baseline and gaps

- Travel groups/members, flights/passengers, ground transport, timeline, lodging providers/rooms/bookings/guests/payments/calendar, rentals, and broad UI/API surfaces already exist.
- Multiple logistics tables are unscoped or permissively accessible in audited RLS.
- Travel endpoints accept broad arbitrary payloads and depend on RLS for record authority.
- “Auto-coordinate” creates a review timeline item while UI copy can imply booking/arrangement completion.
- Travel groups are not a route-leg-complete party manifest.
- Missing vehicle/driver schedules, seat/berth assignment, hours-of-service, live delay/impact, border/customs, room blocks, nightly rooming matrix, roommate rules, deadlines, incidentals, and reconciliation.

## Domain boundaries

Tourify should be an operational planning and record system. Provider booking may be manual initially. States must distinguish `proposed`, `requested`, `held`, `confirmed`, `ticketed/vouchered`, `changed`, `cancelled`, `completed`, and `reconciled`. Never label a review task or recommendation as a confirmed reservation.

## Data model

### Party manifest and travel segments

- `tour_party_members` is the traveler source.
- `travel_segments`: org/tour/route leg, type (air/rail/bus/van/car/ferry/other), origin/destination, local/UTC times, provider, reference, status, owner, cost/contract references, baggage/cargo limits.
- `travel_passenger_assignments`: segment, party member, seat/berth, ticket/reference, status, special-assistance flags with restricted detail, check-in state.
- `travel_change_events`: before/after, source, impact, acknowledgement/publication.

### Vehicles and drivers

- `vehicles`: owned/rented/vendor, capacity, seats/berths, plate/fleet reference, class, accessibility, active/maintenance state.
- `vehicle_movements`: route leg/segment, vehicle, planned/actual timing, origin/destination, mileage, fuel/toll, status.
- `driver_assignments`: driver, movement, role, hours/rest window, acknowledgement.

### Lodging

- `lodging_properties/providers` with contacts and commercial link.
- `lodging_blocks`: property, tour, date range, room types/counts/rates/tax/cutoff/terms/status/confirmation.
- `lodging_nights`: block/date/type inventory and pickup.
- `room_assignments`: night(s), room/placeholder, guests, roommate preferences/restrictions, confirmation, check-in/out, incidentals/payment owner.
- Restricted guest notes store minimum necessary accessibility/safety detail with explicit access.

## Detailed task plan

### Phase 1 — tenant and API safety

| ID | Task | Acceptance criteria |
|---|---|---|
| TRAVEL-101 | Add/backfill non-null organization keys | Every travel/lodging/transport parent and child is scoped; unresolved rows are quarantined; counts and referential consistency are verified. |
| TRAVEL-102 | Replace permissive RLS | Direct clients cannot list or mutate another organization through parent or child IDs; legitimate tour/logistics roles pass. |
| TRAVEL-103 | Replace arbitrary CRUD payloads | Per-command schemas allow explicit fields and state transitions; record and parent belong to acting org; unknown fields are rejected. |
| TRAVEL-104 | Correct coordination language/state | UI distinguishes suggestion/review/request/hold/confirmed; existing “auto-coordinate” action truthfully reports only records/tasks actually created. |

### Phase 3 — manifest and itinerary

| ID | Task | Acceptance criteria |
|---|---|---|
| TRAVEL-301 | Connect party manifest to route legs | Matrix shows every active member versus every required leg/night and identifies not traveling, self-arranged, assigned, or missing. |
| TRAVEL-302 | Build travel-segment commands | Create/request/hold/confirm/change/cancel/complete with validation, idempotency, confirmation evidence, and audit. |
| TRAVEL-303 | Build passenger assignment workflow | Bulk assign by party group with preview; capacity, duplicate/overlap, accessibility, and missing-ticket conflicts are actionable. |
| TRAVEL-304 | Build itinerary timeline | Per person/group/tour timeline merges route, transport, hotel, calls, and events in local time with gaps/overlaps and data freshness. |
| TRAVEL-305 | Add change impact engine | Segment time/status changes identify affected passengers, connections, rooms, calls/shifts, equipment moves, costs, and publications before commit. |
| TRAVEL-306 | Publish traveler-specific itinerary | Uses audience projection so each person receives their details and approved group context, with version/diff/acknowledgement and offline access. |

### Phase 3 — ground transport, fleet, and drivers

| ID | Task | Acceptance criteria |
|---|---|---|
| TRANS-301 | Create vehicle master and capacity | Owned/rented/vendor vehicles have seat/berth/cargo/accessibility/maintenance status; sensitive driver/document data is protected. |
| TRANS-302 | Create vehicle movements | Movements align to route legs or local transfers; planned/actual time, pickup point, dispatcher/contact, passengers/cargo, status, and costs are complete. |
| TRANS-303 | Add seat/berth assignment | Visual/list assignment respects capacity, restrictions, accessibility and overnight continuity; overbooking is blocked or explicitly overridden. |
| TRANS-304 | Add driver assignment/rest checks | Driver qualifications, availability, planned hours/rest, handoffs, and acknowledgements are validated using configured policy. |
| TRANS-305 | Add pickup/dropoff operations | Precise location/instructions, passenger check state, delay/exception, driver dispatch view, and offline contact fallback are provided. |
| TRANS-306 | Track actual mileage/cost/issue | Fuel, toll, mileage, delay, damage/incident, and vendor issue feed finance/vendor performance and closeout. |

### Phase 3 — lodging and rooming

| ID | Task | Acceptance criteria |
|---|---|---|
| LODGE-301 | Build lodging block workflow | Request/hold/confirm/cancel/close with dates, room type counts, rates/tax, cutoff, attrition/terms, confirmation, owner, contract/cost links. |
| LODGE-302 | Build nightly inventory matrix | Nights × room types show contracted, picked up, assigned, available, waitlisted, and variance; date/time-zone boundaries are correct. |
| LODGE-303 | Build rooming-list assignment | Drag/list/bulk assignment supports roommate rules, single/crew preferences, accessibility, check-in/out differences, and explicit unresolved state. |
| LODGE-304 | Add occupancy/capacity validation | Prevent impossible overlapping properties/rooms, excess guests, missing nights, late-arrival gaps, and unassigned active party members. |
| LODGE-305 | Add confirmation/deadline workflow | Rooming cutoff, provider submission/version, confirmation numbers, changes after cutoff, acknowledgement, and escalation are tracked. |
| LODGE-306 | Add payment/incidentals policy | Master/individual payment, deposit, tax, cancellation, incidentals responsibility, folio/receipt, and reconciliation fields feed finance. |
| LODGE-307 | Publish lodging projections | Travelers receive only their property/room/check-in information and permitted roommate/contact detail; vendor receives authorized rooming list version. |

### Phase 5–6 — provider integration and operations

| ID | Task | Acceptance criteria |
|---|---|---|
| TRAVEL-501 | Add provider adapter boundary | Imported booking updates are verified/idempotent, preserve provider event, map to canonical state, and route unmatched records for review. |
| TRAVEL-502 | Add document storage | Tickets, vouchers, confirmations, manifests, and hotel lists use malware-scanned org-scoped storage with audience-aware access and retention. |
| TRAVEL-601 | Add logistics SLO/alerts | Missing next-72-hour segments/rooms, capacity conflicts, stale confirmations, delay impacts, import failures, and notification failure are monitored. |
| TRAVEL-602 | Complete migration/reconciliation | Legacy groups/flights/lodging records reconcile to canonical parent/child counts; unscoped data is resolved; old writes/policies are retired. |

## Test requirements

- Parent/child RLS, state machine, capacity, connection/overlap, DST/time-zone, change-impact, roommate/accessibility privacy, and cost calculation tests.
- E2E: manifest → proposed segment/block → confirmed assignments → publish → change/delay → acknowledgement → completed/reconciled.
- Provider webhook replay/out-of-order/unmatched/failure tests before any integration is enabled.
- Mobile/offline traveler and dispatcher tests with stale/revoked content.

## Deployment readiness

- Every party member has an explicit state for every required travel leg and lodging night.
- No suggestion/task is represented as a booking or confirmed arrangement.
- Capacity, timing, privacy, confirmation, change impact, and financial handoffs are enforced and tested.
- Travel/lodging records and files cannot be discovered across organizations.
- Upcoming gaps and failed changes are observable with an accountable owner and escalation.
