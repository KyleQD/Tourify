import { describe, expect, it } from "vitest"
import {
  isSec107LogisticsTable,
  SEC107_CHILD_TABLES,
  SEC107_PARENT_TABLES,
  SEC107_POLICY_PREFIX,
  SEC107_REMOVED_BYPASS_PATTERNS,
} from "@/lib/admin/logistics-rls-contract"

describe("SEC-107 logistics RLS contract", () => {
  it("covers travel/flight/lodging/transport/rental parents", () => {
    expect(SEC107_PARENT_TABLES).toContain("flight_coordination")
    expect(SEC107_PARENT_TABLES).toContain("lodging_bookings")
    expect(SEC107_PARENT_TABLES).toContain("ground_transportation_coordination")
    expect(SEC107_PARENT_TABLES).toContain("rental_agreements")
    expect(SEC107_PARENT_TABLES).toContain("logistics_plan_state")
    expect(SEC107_PARENT_TABLES).toContain("logistics_issues")
  })

  it("covers passenger/guest/child tables", () => {
    expect(SEC107_CHILD_TABLES).toContain("flight_passenger_assignments")
    expect(SEC107_CHILD_TABLES).toContain("lodging_guest_assignments")
    expect(SEC107_CHILD_TABLES).toContain("transportation_passenger_assignments")
  })

  it("documents removed bypass patterns", () => {
    expect(SEC107_REMOVED_BYPASS_PATTERNS.some((p) => p.includes("event_id IS NULL"))).toBe(true)
    expect(SEC107_POLICY_PREFIX).toBe("sec107_")
  })

  it("guards table membership helper", () => {
    expect(isSec107LogisticsTable("logistics_tasks")).toBe(true)
    expect(isSec107LogisticsTable("budgets")).toBe(false)
  })
})
