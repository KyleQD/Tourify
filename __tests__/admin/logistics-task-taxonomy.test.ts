import { describe, expect, it } from "vitest"

import {
  assertLogisticsTaskTaxonomy,
  countTasksByDomain,
  LOGISTICS_DOMAIN_CATEGORIES,
  LOGISTICS_STRUCTURED_AUTHORITY,
  LOGISTICS_TASK_DOMAINS,
} from "@/lib/admin/logistics-task-taxonomy"

describe("LOG-102 logistics task taxonomy", () => {
  it("keeps domains non-overlapping and category sets disjoint within a domain", () => {
    expect(new Set(LOGISTICS_TASK_DOMAINS).size).toBe(LOGISTICS_TASK_DOMAINS.length)
    for (const domain of LOGISTICS_TASK_DOMAINS) {
      const cats = LOGISTICS_DOMAIN_CATEGORIES[domain]
      expect(new Set(cats).size).toBe(cats.length)
      expect(LOGISTICS_STRUCTURED_AUTHORITY[domain].taskResponsibility).toBe("work_tracking_only")
    }
  })

  it("accepts a valid domain + category + source link", () => {
    const result = assertLogisticsTaskTaxonomy({
      type: "catering",
      category: "meal_service",
      source_type: "catering_services",
      source_id: "11111111-1111-4111-8111-111111111111",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.domain).toBe("catering")
  })

  it("rejects unknown domains and cross-domain source types", () => {
    expect(assertLogisticsTaskTaxonomy({ type: "travel" }).ok).toBe(false)
    expect(
      assertLogisticsTaskTaxonomy({
        type: "catering",
        source_type: "lodging_bookings",
        source_id: "11111111-1111-4111-8111-111111111111",
      }).ok,
    ).toBe(false)
  })

  it("rejects tasks that claim structured authority", () => {
    const result = assertLogisticsTaskTaxonomy({
      type: "equipment",
      is_authoritative: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/work-tracking only/i)
  })

  it("counts unique tasks by domain without inventing overlap buckets", () => {
    const counts = countTasksByDomain([
      { type: "transportation" },
      { type: "transportation" },
      { type: "equipment" },
      { type: "unknown" },
    ])
    expect(counts.transportation).toBe(2)
    expect(counts.equipment).toBe(1)
    expect(counts.catering).toBe(0)
  })
})
