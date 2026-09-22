# SEC-107 — Replace logistics RLS

## Acceptance criteria

Travel, flight, passenger, lodging, guest, transport, rental, and child policies prevent parent-ID and child-ID bypasses.

## Migration

`supabase/migrations/20260720075400_admin_logistics_rls_sec107.sql`

### Bypass classes removed

Legacy policies allowed:

1. Any authenticated user when `event_id` and `tour_id` were both null
2. Team membership without org capability checks
3. Child access that only proved a parent row existed under those weak rules

### Replacement model

- `can_logistics(uid, org_id, perm)` — membership + `logistics.view|manage`
- `resolve_logistics_org_id(org_id, event_id, tour_id)` — denormalized org, else tour/event org
- Parent tables use org-capability policies (`sec107_*`)
- Child tables authorize **only** via `EXISTS (parent … AND can_logistics(parent.org…))`

Guessing a child UUID or a foreign parent UUID from another org fails authorization.

### Tables covered

Parents: lodging_bookings, travel_groups, flight_coordination, ground_transportation_coordination, rental_agreements (+ org_id backfill), travel_coordination_timeline, logistics_tasks

Children: lodging guests/payments/calendar, travel_group_members, flight/transport passengers, hotel_room_assignments, rental items/payments, logistics_task_equipment, logistics_activity
