import { describe, expect, it } from "vitest"

import {
  assertTravelOrgKeyVerification,
  isTravel101ChildTable,
  isTravel101ParentTable,
  TRAVEL101_CHILD_TABLES,
  TRAVEL101_PARENT_CHILD_LINKS,
  TRAVEL101_PARENT_TABLES,
  TRAVEL101_QUARANTINE_REASON,
  TRAVEL101_VERIFY_RPC,
} from "@/lib/admin/travel-tenant-keys"

describe("TRAVEL-101 travel tenant keys", () => {
  it("lists parents and children for travel/lodging/transport", () => {
    expect(TRAVEL101_PARENT_TABLES).toEqual(
      expect.arrayContaining([
        "travel_groups",
        "flight_coordination",
        "ground_transportation_coordination",
        "lodging_bookings",
      ]),
    )
    expect(TRAVEL101_CHILD_TABLES).toContain("travel_group_members")
    expect(TRAVEL101_CHILD_TABLES).toContain("flight_passenger_assignments")
    expect(TRAVEL101_CHILD_TABLES).toContain("lodging_guest_assignments")
    expect(TRAVEL101_CHILD_TABLES).toContain("travel_coordination_timeline")
  })

  it("maps every child to a parent FK for backfill", () => {
    const linked = new Set(TRAVEL101_PARENT_CHILD_LINKS.map((link) => link.childTable))
    for (const child of TRAVEL101_CHILD_TABLES) expect(linked.has(child)).toBe(true)
    for (const link of TRAVEL101_PARENT_CHILD_LINKS) {
      expect(link.childFk.trim().length).toBeGreaterThan(0)
      expect(link.parentTable).toBeTruthy()
    }
  })

  it("exposes quarantine reason and verify RPC name", () => {
    expect(TRAVEL101_QUARANTINE_REASON).toMatch(/unresolvable/)
    expect(TRAVEL101_VERIFY_RPC).toBe("admin_verify_travel_org_keys")
  })

  it("guards typed membership helpers", () => {
    expect(isTravel101ChildTable("hotel_room_assignments")).toBe(true)
    expect(isTravel101ChildTable("staff_shifts")).toBe(false)
    expect(isTravel101ParentTable("lodging_bookings")).toBe(true)
    expect(isTravel101ParentTable("lodging_payments")).toBe(false)
  })

  it("verifies null org rows match quarantine and parent mismatches are zero", () => {
    const ok = assertTravelOrgKeyVerification([
      {
        table_name: "travel_group_members",
        total_rows: 10,
        keyed_rows: 9,
        null_org_rows: 1,
        quarantine_open: 1,
        parent_mismatch_rows: 0,
      },
      {
        table_name: "flight_passenger_assignments",
        total_rows: 5,
        keyed_rows: 5,
        null_org_rows: 0,
        quarantine_open: 0,
        parent_mismatch_rows: 0,
      },
    ])
    expect(ok.ok).toBe(true)

    const bad = assertTravelOrgKeyVerification([
      {
        table_name: "travel_group_members",
        total_rows: 10,
        keyed_rows: 8,
        null_org_rows: 2,
        quarantine_open: 1,
        parent_mismatch_rows: 1,
      },
    ])
    expect(bad.ok).toBe(false)
    expect(bad.failures.length).toBeGreaterThanOrEqual(2)
  })
})
