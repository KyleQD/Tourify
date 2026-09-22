import { describe, expect, it } from "vitest"

import {
  assertWorkforceIdentityMapComplete,
  WORKFORCE_DUPLICATE_RISK_REPORT,
  WORKFORCE_IDENTITY_MAPPINGS,
  workforceSurfacesCovered,
} from "@/lib/admin/workforce-identity-map"

describe("WORK-101 workforce identity map", () => {
  it("covers roster/team/participant/staff/employment/Work Mode surfaces", () => {
    expect(workforceSurfacesCovered()).toEqual({
      roster: true,
      team: true,
      participant: true,
      staff: true,
      employment: true,
      work_mode: true,
    })
    expect(() => assertWorkforceIdentityMapComplete()).not.toThrow()
  })

  it("gives every mapping a destination and resolution rule", () => {
    for (const mapping of WORKFORCE_IDENTITY_MAPPINGS) {
      expect(mapping.canonicalDestination).toBeTruthy()
      expect(mapping.identityResolutionRule.trim().length).toBeGreaterThan(10)
      expect(mapping.keyFields.length).toBeGreaterThan(0)
    }
  })

  it("publishes a duplicate risk report with high-severity patterns", () => {
    expect(WORKFORCE_DUPLICATE_RISK_REPORT.length).toBeGreaterThanOrEqual(5)
    expect(WORKFORCE_DUPLICATE_RISK_REPORT.every((row) => row.relatedMappingIds.length > 0)).toBe(true)
    expect(WORKFORCE_DUPLICATE_RISK_REPORT.filter((row) => row.severity === "high").length).toBeGreaterThanOrEqual(4)
  })
})
