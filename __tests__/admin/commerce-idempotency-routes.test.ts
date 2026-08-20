import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const idempotentCommerceRoutes = [
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts",
  "app/api/marketplace/admin/fee-rules/route.ts",
  "app/api/marketplace/admin/webhook-events/route.ts",
]

describe("COM-038 Commerce high-risk idempotency routes", () => {
  it("requires shared Commerce idempotency keys in high-risk mutation routes", () => {
    for (const route of idempotentCommerceRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("requireCommerceIdempotencyKey")
      expect(source, route).toContain("idempotencyKey")
    }
  })
})
