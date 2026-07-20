import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildTourMemberWrite,
  buildTourVendorWrite,
  presentTourMember,
  presentTourVendor,
  spreadsheetCsvCell,
  tourMemberInputSchema,
  tourVendorInputSchema,
} from "@/lib/admin/tour-collaboration"
import { LEGACY_CATEGORY_ID_TO_NAME } from "@/lib/artist-jobs/categories"

const TOUR_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"
const TEAM_ID = "33333333-3333-4333-8333-333333333333"

describe("tour collaboration contracts", () => {
  it("round-trips descriptor team members through the canonical database shape", () => {
    const input = tourMemberInputSchema.parse({
      tour_id: TOUR_ID,
      name: "Alex Crew",
      role: "Production Manager",
      email: "alex@example.com",
      status: "confirmed",
      responsibilities: "Advance every venue",
    })
    const write = buildTourMemberWrite(input, USER_ID, TEAM_ID)
    const presented = presentTourMember({ id: "member-1", ...write })

    expect(write.team_id).toBe(TEAM_ID)
    expect(write.assigned_by).toBe(USER_ID)
    expect(presented).toMatchObject({
      name: "Alex Crew",
      role: "Production Manager",
      email: "alex@example.com",
      status: "confirmed",
    })
  })

  it("maps the vendor form to canonical columns and contact JSON", () => {
    const input = tourVendorInputSchema.parse({
      tour_id: TOUR_ID,
      name: "Road Cases LLC",
      type: "Backline",
      contact_name: "Casey",
      contact_email: "casey@example.com",
      services: ["Cases", "Repairs"],
      contract_amount: 1250,
      status: "confirmed",
    })
    const write = buildTourVendorWrite(input, USER_ID)
    const presented = presentTourVendor({ id: "vendor-1", ...write })

    expect(write.vendor_name).toBe("Road Cases LLC")
    expect(write.service_type).toBe("Backline")
    expect(presented.services).toEqual(["Cases", "Repairs"])
    expect(presented.contract_amount).toBe(1250)
  })

  it("rejects incomplete collaboration records", () => {
    expect(() => tourMemberInputSchema.parse({ tour_id: TOUR_ID, role: "Crew" })).toThrow()
    expect(() => tourVendorInputSchema.parse({ tour_id: TOUR_ID, name: "Vendor" })).toThrow()
  })

  it("normalizes an optional blank member email instead of rejecting the form payload", () => {
    const input = tourMemberInputSchema.parse({
      tour_id: TOUR_ID,
      name: "Local stagehand",
      role: "Stage Crew",
      email: "",
    })
    expect(input.email).toBeNull()
  })

  it("neutralizes spreadsheet formulas and quotes CSV fields", () => {
    expect(spreadsheetCsvCell("=HYPERLINK(\"https://bad.test\")")).toBe(
      '"\'=HYPERLINK(""https://bad.test"")"',
    )
    expect(spreadsheetCsvCell("Road, Crew")).toBe('"Road, Crew"')
  })

  it("maps every legacy tour-hiring category to a seeded category", () => {
    expect(Object.keys(LEGACY_CATEGORY_ID_TO_NAME)).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
    ])
    expect(LEGACY_CATEGORY_ID_TO_NAME[1]).toBe("Musicians")
    expect(LEGACY_CATEGORY_ID_TO_NAME[12]).toBe("Accommodation")
  })

})
