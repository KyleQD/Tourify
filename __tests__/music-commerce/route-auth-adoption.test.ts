import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const musicMarketplaceRoutes = [
  "catalog-links",
  "disclosures",
  "documents",
  "flags",
  "investor-account",
  "issuers",
  "market-data",
  "offerings",
  "orders",
  "pathway",
  "portfolio",
  "subscriptions",
  "transfers",
]

function readRoute(routeFile: string): string {
  return readFileSync(resolve(process.cwd(), routeFile), "utf8")
}

describe("music commerce route auth adoption", () => {
  it("uses the Marketplace account contract across every music-marketplace handler", () => {
    for (const route of musicMarketplaceRoutes) {
      const source = readRoute(`app/api/music-marketplace/${route}/route.ts`)

      expect(source, route).toContain("requireMarketplaceAccount")
      expect(source, route).toContain("authResult.account")
      expect(source, route).toContain("userId")
      expect(source, route).not.toContain("requireApiUser")
      expect(source, route).not.toContain("authResult.auth")
    }
  })

  it("uses the Marketplace account contract for native order reads while preserving row ownership", () => {
    const source = readRoute("app/api/marketplace/orders/route.ts")

    expect(source).toContain("requireMarketplaceAccount")
    expect(source).toContain('.eq("seller_user_id", userId)')
    expect(source).toContain('.eq("buyer_user_id", userId)')
    expect(source).not.toContain("requireApiUser")
    expect(source).not.toContain("authResult.auth")
  })

  it("keeps native checkout's explicit optional-auth guest contract", () => {
    const source = readRoute("app/api/marketplace/checkout/route.ts")

    expect(source).toContain("authenticateApiRequest")
    expect(source).toContain("guest checkout")
    expect(source).not.toContain("requireApiUser")
  })
})
