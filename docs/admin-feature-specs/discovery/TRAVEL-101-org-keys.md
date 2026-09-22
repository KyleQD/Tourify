# TRAVEL-101 — Add/backfill non-null organization keys

**Date:** 2026-07-20  
**Spec:** `07_Travel_Transport_and_Lodging.md`

## Acceptance criteria

Every travel/lodging/transport parent and child is scoped; unresolved rows are quarantined; counts and referential consistency are verified.

## What shipped

### Migration `20260720175000_travel_org_keys_travel101.sql`

Children + timeline receive nullable `org_id`, backfilled from parents only:

| Child | Parent FK |
|---|---|
| `travel_group_members` | `travel_groups.group_id` |
| `flight_passenger_assignments` | `flight_coordination.flight_id` |
| `transportation_passenger_assignments` | `ground_transportation_coordination.transportation_id` |
| `hotel_room_assignments` | `lodging_bookings.lodging_booking_id` |
| `lodging_guest_assignments` / `lodging_payments` / `lodging_calendar_events` | `booking_id` |
| `travel_coordination_timeline` | tour → event → group |
| `rental_agreement_items` / `rental_payments` | `rental_agreements` |

Unresolved nulls → `admin_tenant_key_quarantine` (`unresolvable_org_id_after_parent_backfill`).  
RESTRICTIVE `travel101_require_org_id` denies authenticated access to null-org rows.

### Verification

- RPC `admin_verify_travel_org_keys()` — total / keyed / null / quarantine / parent mismatch
- TS: `lib/admin/travel-tenant-keys.ts` + `assertTravelOrgKeyVerification`

### App writes

Travel coordination, lodging child creates, and transport passenger inserts stamp `org_id` from parent/scope when known.

## Out of scope

- Catalog tables (`lodging_providers`, `rental_clients`) without tour/event parents — deferred (never invent)
- Canonical `travel_segments` / vehicles / lodging_blocks (Phase 3)

## Follow-ups

- `TRAVEL-102` — replace remaining permissive RLS with capability-gated org policies
