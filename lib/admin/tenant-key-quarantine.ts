/**
 * SEC-105 — Tenant key quarantine contract (schema names + reason codes).
 * Live repair is SQL/service-role only; authenticated clients have no access.
 */

export const ADMIN_TENANT_KEY_QUARANTINE_TABLE = "admin_tenant_key_quarantine"
export const ADMIN_TENANT_KEY_QUARANTINE_VIEW = "admin_tenant_key_quarantine_v"

export const TENANT_KEY_QUARANTINE_REASONS = {
  unresolvableAfterBackfill: "unresolvable_org_id_after_parent_backfill",
  missingOrganizationRow: "org_id_missing_organization_row",
  /** FIN-101: row.org_id does not match event/tour/transaction parent org. */
  parentOrgMismatch: "parent_org_mismatch",
} as const

/** Tables that receive nullable org_id + restrictive null-deny under SEC-105. */
export const SEC105_ORG_KEYED_TABLES = [
  "logistics_tasks",
  "ground_transportation_coordination",
  "flight_coordination",
  "lodging_bookings",
  "travel_groups",
  "logistics_acknowledgements",
  "staff_members",
  "staff_shifts",
  "staff_zones",
  "site_maps",
  "site_map_zones",
  "ticket_types",
  "ticket_sales",
  "tickets",
  "event_ticketing_config",
  "ticket_campaigns",
] as const

export type Sec105OrgKeyedTable = (typeof SEC105_ORG_KEYED_TABLES)[number]

export function isSec105OrgKeyedTable(tableName: string): tableName is Sec105OrgKeyedTable {
  return (SEC105_ORG_KEYED_TABLES as readonly string[]).includes(tableName)
}
