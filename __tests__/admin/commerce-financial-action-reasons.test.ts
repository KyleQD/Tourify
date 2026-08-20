import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS } from "@/lib/admin/commerce/high-risk-actions"

const reasonRequiredRoutes = [
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts",
  "app/api/marketplace/admin/fee-rules/route.ts",
  "app/api/marketplace/admin/webhook-events/route.ts",
]

describe("COM-036 financial action reason requirements", () => {
  it("marks every Commerce high-risk financial action as reason-required", () => {
    for (const requirement of Object.values(COMMERCE_HIGH_RISK_ACTION_REQUIREMENTS)) {
      expect(requirement.reasonRequired, requirement.action).toBe(true)
      expect(requirement.reasonMinLength, requirement.action).toBe(3)
      expect(requirement.reasonMaxLength, requirement.action).toBe(1000)
    }
  })

  it("passes route payload reasons into Commerce high-risk guards", () => {
    for (const route of reasonRequiredRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("requireCommerceHighRiskAction")
      expect(source, route).toContain("reason")
      expect(source, route).toContain("normalizeCommerceFinancialActionReason")
    }
  })
})
