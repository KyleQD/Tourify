/**
 * REL-101 — RLS persona matrix contract for Admin feature CI.
 * Executable DB tests consume this matrix; structural tests assert coverage.
 */

import { ADMIN_FEATURE_FIXTURE } from "@/lib/testing/admin-feature-factory"

export type RlsPersona =
  | "anonymous"
  | "org_a_owner"
  | "org_a_manager"
  | "org_a_viewer"
  | "org_a_worker"
  | "org_b_owner"
  | "multi_org_unselected"
  | "service_role"

export interface RlsMatrixCase {
  id: string
  table: string
  action: "select" | "insert" | "update" | "delete"
  persona: RlsPersona
  /** Target org for the row under test */
  targetOrg: "a" | "b"
  expect: "allow" | "deny"
  notes?: string
}

export const RLS_PERSONAS: RlsPersona[] = [
  "anonymous",
  "org_a_owner",
  "org_a_manager",
  "org_a_viewer",
  "org_a_worker",
  "org_b_owner",
  "multi_org_unselected",
  "service_role",
]

/** Parent/child pairs that must appear in the CI matrix. */
export const RLS_PARENT_CHILD_DOMAINS = [
  { parent: "tours", children: ["tour_stops", "events_v2"] },
  { parent: "events_v2", children: ["tasks", "schedules"] },
  { parent: "travel_groups", children: ["travel_group_members"] },
  { parent: "lodging_bookings", children: ["lodging_guest_assignments"] },
  { parent: "equipment_catalog", children: ["equipment_instances"] },
  { parent: "catering_services", children: ["catering_dietary_summaries"] },
  { parent: "event_ticketing_config", children: ["ticket_inventory_reservations"] },
  { parent: "events_v2", children: ["financial_transactions"] },
  { parent: "vendors", children: ["vendor_documents"] },
  { parent: "contracts", children: ["contract_obligations"] },
  { parent: "site_maps", children: ["site_map_zones"] },
  { parent: "admin_publication_snapshots", children: ["admin_publication_sections"] },
  { parent: "staff_shifts", children: ["staff_shift_assignments"] },
] as const

export function buildCoreTourIsolationCases(): RlsMatrixCase[] {
  const cases: RlsMatrixCase[] = []
  for (const table of ["tours", "events_v2"] as const) {
    cases.push(
      {
        id: `${table}-a-owner-select-a`,
        table,
        action: "select",
        persona: "org_a_owner",
        targetOrg: "a",
        expect: "allow",
      },
      {
        id: `${table}-a-owner-select-b`,
        table,
        action: "select",
        persona: "org_a_owner",
        targetOrg: "b",
        expect: "deny",
        notes: "Cross-org denial",
      },
      {
        id: `${table}-b-owner-select-a`,
        table,
        action: "select",
        persona: "org_b_owner",
        targetOrg: "a",
        expect: "deny",
      },
      {
        id: `${table}-anon-select-a`,
        table,
        action: "select",
        persona: "anonymous",
        targetOrg: "a",
        expect: "deny",
      },
    )
  }
  return cases
}

export function fixtureIdsForOrg(org: "a" | "b") {
  return org === "a"
    ? {
        orgId: ADMIN_FEATURE_FIXTURE.orgs.a.orgId,
        tourId: ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId,
        eventId: ADMIN_FEATURE_FIXTURE.tours.aMultiStop.eventIds[0],
      }
    : {
        orgId: ADMIN_FEATURE_FIXTURE.orgs.b.orgId,
        tourId: ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId,
        eventId: ADMIN_FEATURE_FIXTURE.tours.bCollision.eventIds[0],
      }
}

/** True when CI/local has configured a dedicated RLS test database. */
export function isRlsDatabaseConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_RLS_TEST_URL || process.env.API_URL)
    && (process.env.SUPABASE_RLS_TEST_ANON_KEY || process.env.ANON_KEY)
    && (process.env.SUPABASE_RLS_TEST_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY),
  )
}
