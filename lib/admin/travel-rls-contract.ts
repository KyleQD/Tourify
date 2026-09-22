/**
 * TRAVEL-102 — Travel/lodging/transport RLS contract after permissive policy replace.
 */

export const TRAVEL102_POLICY_PREFIX = "travel102_"

export const TRAVEL102_CATALOG_TABLES = [
  "lodging_providers",
  "lodging_room_types",
  "lodging_availability",
  "rental_clients",
] as const

export const TRAVEL102_CHILD_TABLES = [
  "travel_group_members",
  "flight_passenger_assignments",
  "transportation_passenger_assignments",
  "hotel_room_assignments",
  "lodging_guest_assignments",
  "lodging_payments",
  "lodging_calendar_events",
  "travel_coordination_timeline",
  "rental_agreement_items",
  "rental_payments",
] as const

/** Bypass classes removed by TRAVEL-102 (in addition to SEC-107). */
export const TRAVEL102_REMOVED_BYPASS_PATTERNS = [
  "auth.uid() IS NOT NULL on lodging_providers/room_types/availability/rental_clients",
  "child access via parent EXISTS without child.org_id capability match",
  "timeline resolve_logistics_org_id without denormalized org_id",
] as const

export function isTravel102CatalogTable(tableName: string): boolean {
  return (TRAVEL102_CATALOG_TABLES as readonly string[]).includes(tableName)
}

export function isTravel102HardenedChildTable(tableName: string): boolean {
  return (TRAVEL102_CHILD_TABLES as readonly string[]).includes(tableName)
}

/** Predicate shape documented for reviews/tests. */
export function travel102ChildPolicyRequires(): string[] {
  return [
    "org_id is not null",
    "can_logistics(auth.uid(), org_id, logistics.view|manage)",
    "exists(parent where parent.id = child_fk and parent.org_id is not distinct from child.org_id)",
  ]
}
