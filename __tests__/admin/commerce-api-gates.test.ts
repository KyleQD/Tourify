import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const routePermissions: Record<string, readonly string[]> = {
  "app/api/admin/store/route.ts": ["commerce.view", "commerce.manage_listings"],
  "app/api/admin/marketplace/moderation/route.ts": ["commerce.manage_cases"],
  "app/api/admin/marketplace/orders/route.ts": ["commerce.view"],
  "app/api/admin/marketplace/orders/[id]/route.ts": ["commerce.view"],
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts": ["commerce.manage_payouts"],
  "app/api/marketplace/admin/overview/route.ts": ["commerce.view"],
  "app/api/marketplace/admin/fee-rules/route.ts": ["commerce.manage_fees"],
  "app/api/marketplace/admin/webhook-events/route.ts": ["commerce.view_audit"],
  "app/api/marketplace/admin/moderation/route.ts": ["commerce.manage_listings", "commerce.manage_cases"],
}

const highRiskRouteActions: Record<string, readonly string[]> = {
  "app/api/admin/marketplace/payouts/[id]/retry/route.ts": ["payout.retry"],
  "app/api/marketplace/admin/fee-rules/route.ts": ["fee_rule.write"],
  "app/api/marketplace/admin/webhook-events/route.ts": ["provider.webhook_exception_mutate"],
}

const localErrorRoutes = Object.keys(routePermissions).filter((route) =>
  route !== "app/api/marketplace/admin/overview/route.ts"
)

describe("COM-028 commerce API gates", () => {
  it("uses CommerceContext gates instead of broad admin role checks", () => {
    for (const [route, permissions] of Object.entries(routePermissions)) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("resolveCommerceContext")
      expect(source, route).not.toMatch(/profile\?\.role\s*!==\s*["']admin/)
      expect(source, route).not.toContain("userHasAdminSurfaceAccess")
      expect(source, route).not.toContain("withAdminAuth")
      for (const permission of permissions) {
        expect(source, route).toContain(permission)
      }
    }
  })

  it("keeps risky commerce mutations behind high-risk action checks", () => {
    for (const [route, actions] of Object.entries(highRiskRouteActions)) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("requireCommerceHighRiskAction")
      for (const action of actions) {
        expect(source, route).toContain(action)
      }
    }
  })

  it("keeps buyer PII projection behind field-level Commerce helpers", () => {
    const source = readFileSync(join(process.cwd(), "app/api/admin/marketplace/orders/route.ts"), "utf8")
    expect(source).toContain("buildCommercePiiAwareSelect")
    expect(source).toContain("projectCommercePiiValue")
    expect(source).toContain("customer.email")
  })

  it("uses structured Commerce errors instead of loose error bodies or empty failure data", () => {
    for (const route of localErrorRoutes) {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      expect(source, route).toContain("commerceErrorResponse")
      expect(source, route).not.toContain("NextResponse.json({ error")
      expect(source, route).not.toContain("orders: [], total: 0")
      expect(source, route).not.toContain("listings: [], total: 0")
    }
  })
})
