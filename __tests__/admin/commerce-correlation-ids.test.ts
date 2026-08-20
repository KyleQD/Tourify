import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const commerceSuccessRoutes = [
  "app/api/admin/store/route.ts",
  "app/api/admin/marketplace/moderation/route.ts",
  "app/api/admin/marketplace/orders/route.ts",
  "app/api/admin/marketplace/orders/[id]/route.ts",
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts",
  "app/api/marketplace/admin/overview/route.ts",
  "app/api/marketplace/admin/fee-rules/route.ts",
  "app/api/marketplace/admin/webhook-events/route.ts",
  "app/api/marketplace/admin/moderation/route.ts",
]

describe("COM-037 Commerce correlation IDs", () => {
  it("uses shared Commerce response envelopes for successful route responses", () => {
    for (const route of commerceSuccessRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("commerceJsonResponse")
      expect(source, route).toContain("commerce.request.correlationId")
    }
  })
})
