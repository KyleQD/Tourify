import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const concurrencyRoutes = [
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts",
  "app/api/marketplace/admin/fee-rules/route.ts",
]

describe("COM-039 Commerce optimistic concurrency routes", () => {
  it("requires expected updated_at preconditions on targeted high-risk updates", () => {
    for (const route of concurrencyRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("requireCommerceExpectedUpdatedAt")
      expect(source, route).toContain("assertCommerceUpdatedAtMatches")
      expect(source, route).toContain("expectedUpdatedAt")
    }
  })
})
