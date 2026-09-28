import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  MARKETPLACE_MUSIC_COMMERCE_CONCERNS,
  MARKETPLACE_MUSIC_COMMERCE_ROUTE_ADOPTION_TARGETS,
  assertMarketplaceMusicCommerceConcern,
  isMarketplaceMusicCommerceConcern,
  requiresMarketplaceAccountAuth,
  resolveMarketplaceMusicCommerceRouteAdoptionTarget,
  resolveMarketplaceMusicCommerceRouteBoundary,
} from "../music-commerce-boundary"

const { resolveActingContext } = vi.hoisted(() => ({
  resolveActingContext: vi.fn(),
}))

vi.mock("@/lib/auth/acting-context", () => ({
  resolveActingContext,
}))

import { requireMarketplaceAccount } from "../music-commerce-auth"

describe("Marketplace music commerce ownership boundary", () => {
  it("owns the financial music-commerce concerns", () => {
    expect(MARKETPLACE_MUSIC_COMMERCE_CONCERNS).toEqual([
      "checkout",
      "orders",
      "transfers",
      "portfolios",
      "marketplace_operations",
    ])

    for (const concern of MARKETPLACE_MUSIC_COMMERCE_CONCERNS) {
      expect(isMarketplaceMusicCommerceConcern(concern)).toBe(true)
      expect(() => assertMarketplaceMusicCommerceConcern(concern)).not.toThrow()
    }
    expect(isMarketplaceMusicCommerceConcern("royalties")).toBe(false)
    expect(() => assertMarketplaceMusicCommerceConcern("royalties")).toThrow(
      "marketplace_music_commerce_concern_not_owned:royalties",
    )
  })

  it("resolves specific financial routes before the music-marketplace parent", () => {
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/music-marketplace/transfers")).toMatchObject({
      concern: "transfers",
      owner: "marketplace",
      authContract: "marketplace_account",
    })
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/music-marketplace/portfolio")).toMatchObject({
      concern: "portfolios",
      owner: "marketplace",
    })
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/music-marketplace/offerings")).toMatchObject({
      concern: "marketplace_operations",
      owner: "marketplace",
    })
  })

  it("keeps native checkout's existing guest exception explicit", () => {
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/marketplace/checkout")).toMatchObject({
      concern: "checkout",
      authContract: "optional_marketplace_account",
    })
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/marketplace/orders")).toMatchObject({
      concern: "orders",
      authContract: "marketplace_account",
    })
    expect(resolveMarketplaceMusicCommerceRouteBoundary("/api/marketplace/checkout-public")).toBeNull()
  })

  it("fails closed for route adoption until a required-auth boundary is declared", () => {
    expect(requiresMarketplaceAccountAuth("/api/marketplace/orders")).toBe(true)
    expect(requiresMarketplaceAccountAuth("/api/music-marketplace/transfers")).toBe(true)
    expect(requiresMarketplaceAccountAuth("/api/marketplace/checkout")).toBe(false)
    expect(requiresMarketplaceAccountAuth("/api/music-marketplace/new-financial-route")).toBe(true)
    expect(requiresMarketplaceAccountAuth("/api/unknown-financial-route")).toBe(false)
  })

  it("records the exact API ownership dependency for the adoption batch", () => {
    expect(MARKETPLACE_MUSIC_COMMERCE_ROUTE_ADOPTION_TARGETS).toEqual([
      {
        routePrefix: "/api/marketplace/checkout",
        routeFile: "app/api/marketplace/checkout/route.ts",
        authContract: "optional_marketplace_account",
      },
      {
        routePrefix: "/api/marketplace/orders",
        routeFile: "app/api/marketplace/orders/route.ts",
        authContract: "marketplace_account",
      },
      {
        routePrefix: "/api/music-marketplace/transfers",
        routeFile: "app/api/music-marketplace/transfers/route.ts",
        authContract: "marketplace_account",
      },
      {
        routePrefix: "/api/music-marketplace/portfolio",
        routeFile: "app/api/music-marketplace/portfolio/route.ts",
        authContract: "marketplace_account",
      },
      {
        routePrefix: "/api/music-marketplace/orders",
        routeFile: "app/api/music-marketplace/orders/route.ts",
        authContract: "marketplace_account",
      },
      {
        routePrefix: "/api/music-marketplace",
        routeFile: "app/api/music-marketplace/**/route.ts",
        authContract: "marketplace_account",
      },
    ])
    expect(resolveMarketplaceMusicCommerceRouteAdoptionTarget("/api/music-marketplace/transfers")).toMatchObject({
      routeFile: "app/api/music-marketplace/transfers/route.ts",
      authContract: "marketplace_account",
    })
    expect(resolveMarketplaceMusicCommerceRouteAdoptionTarget("/api/music-marketplace/catalog-links")).toMatchObject({
      routeFile: "app/api/music-marketplace/**/route.ts",
      authContract: "marketplace_account",
    })
    expect(resolveMarketplaceMusicCommerceRouteAdoptionTarget("/api/other/route")).toBeNull()
  })
})

describe("requireMarketplaceAccount", () => {
  beforeEach(() => resolveActingContext.mockReset())

  it("returns the server-verified acting account", async () => {
    const supabase = { from: vi.fn() }
    resolveActingContext.mockResolvedValue({
      userId: "user-1",
      accountType: "artist",
      profileId: "artist-1",
      supabase,
    })

    const result = await requireMarketplaceAccount(new NextRequest("http://localhost/api/music-marketplace/portfolio"))

    expect(result).toEqual({
      success: true,
      account: {
        userId: "user-1",
        accountType: "artist",
        profileId: "artist-1",
        supabase,
      },
    })
    expect(resolveActingContext).toHaveBeenCalledOnce()
  })

  it("preserves the authentication response when no identity is verified", async () => {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    resolveActingContext.mockResolvedValue(response)

    const result = await requireMarketplaceAccount(new NextRequest("http://localhost/api/music-marketplace/orders"))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(401)
  })

  it("rejects an account type outside the route's declared scope", async () => {
    resolveActingContext.mockResolvedValue({
      userId: "user-1",
      accountType: "general",
      profileId: "user-1",
      supabase: {},
    })

    const result = await requireMarketplaceAccount(
      new NextRequest("http://localhost/api/music-marketplace/transfers"),
      { allowedAccountTypes: ["artist", "organization"] },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(403)
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code: "marketplace_account_type_not_allowed" },
      })
    }
  })
})
