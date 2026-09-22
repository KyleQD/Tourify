/**
 * SEC-107 — Logistics RLS contract (policy prefix + tables).
 */

export const SEC107_POLICY_PREFIX = "sec107_"

export const SEC107_PARENT_TABLES = [
  "lodging_bookings",
  "travel_groups",
  "flight_coordination",
  "ground_transportation_coordination",
  "rental_agreements",
  "travel_coordination_timeline",
  "logistics_tasks",
  "logistics_plan_state",
  "logistics_hydration_runs",
  "logistics_stop_overrides",
  "logistics_issues",
] as const

export const SEC107_CHILD_TABLES = [
  "lodging_guest_assignments",
  "lodging_payments",
  "lodging_calendar_events",
  "travel_group_members",
  "flight_passenger_assignments",
  "transportation_passenger_assignments",
  "hotel_room_assignments",
  "rental_agreement_items",
  "rental_payments",
  "logistics_task_equipment",
  "logistics_activity",
] as const

export const SEC107_REMOVED_BYPASS_PATTERNS = [
  "event_id IS NULL AND tour_id IS NULL",
  "is_event_team_member without org capability",
  "is_tour_team_member without org capability",
] as const

export function isSec107LogisticsTable(tableName: string): boolean {
  return (
    (SEC107_PARENT_TABLES as readonly string[]).includes(tableName)
    || (SEC107_CHILD_TABLES as readonly string[]).includes(tableName)
  )
}
