import { describe, expect, it } from "vitest"

import {
  isTravel102CatalogTable,
  isTravel102HardenedChildTable,
  TRAVEL102_CATALOG_TABLES,
  TRAVEL102_CHILD_TABLES,
  TRAVEL102_POLICY_PREFIX,
  TRAVEL102_REMOVED_BYPASS_PATTERNS,
  travel102ChildPolicyRequires,
} from "@/lib/admin/travel-rls-contract"

describe("TRAVEL-102 travel RLS contract", () => {
  it("covers catalog tables that had auth.uid blankets", () => {
    expect(TRAVEL102_CATALOG_TABLES).toEqual(
      expect.arrayContaining([
        "lodging_providers",
        "lodging_room_types",
        "lodging_availability",
        "rental_clients",
      ]),
    )
    expect(isTravel102CatalogTable("lodging_providers")).toBe(true)
    expect(isTravel102CatalogTable("travel_groups")).toBe(false)
  })

  it("hardens travel/lodging/transport children with org+parent match", () => {
    expect(TRAVEL102_CHILD_TABLES).toContain("travel_group_members")
    expect(TRAVEL102_CHILD_TABLES).toContain("flight_passenger_assignments")
    expect(TRAVEL102_CHILD_TABLES).toContain("lodging_guest_assignments")
    expect(isTravel102HardenedChildTable("hotel_room_assignments")).toBe(true)
  })

  it("documents removed bypass patterns and policy prefix", () => {
    expect(TRAVEL102_POLICY_PREFIX).toBe("travel102_")
    expect(TRAVEL102_REMOVED_BYPASS_PATTERNS.length).toBeGreaterThanOrEqual(2)
    expect(travel102ChildPolicyRequires().join(" ")).toMatch(/can_logistics/)
    expect(travel102ChildPolicyRequires().join(" ")).toMatch(/parent\.org_id/)
  })
})
