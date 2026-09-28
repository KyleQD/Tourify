import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertMarketplaceOwnedCommerceConcern,
  assertMusicOwnedCommerceConcern,
  buildMarketplaceMusicPurchaseReference,
  buildMusicCatalogCommerceReference,
  isMarketplaceOwnedCommerceConcern,
  isMusicOwnedCommerceConcern,
  MUSIC_COMMERCE_ROUTE_BOUNDARIES,
  resolveMusicCommerceRouteBoundary,
} from "../music-commerce-boundary"

describe("music commerce ownership boundary", () => {
  it("keeps catalog, rights, and royalties in Music", () => {
    expect(isMusicOwnedCommerceConcern("catalog")).toBe(true)
    expect(isMusicOwnedCommerceConcern("rights")).toBe(true)
    expect(isMusicOwnedCommerceConcern("royalties")).toBe(true)
    expect(isMusicOwnedCommerceConcern("orders")).toBe(false)
    expect(() => assertMusicOwnedCommerceConcern("checkout")).toThrow(
      "music_commerce_concern_owned_by_marketplace:checkout",
    )
  })

  it("assigns checkout, orders, transfers, portfolios, and music-marketplace operations to Marketplace", () => {
    for (const concern of ["checkout", "orders", "transfers", "portfolios", "marketplace_operations"] as const) {
      expect(isMarketplaceOwnedCommerceConcern(concern)).toBe(true)
      expect(() => assertMarketplaceOwnedCommerceConcern(concern)).not.toThrow()
    }
    expect(() => assertMarketplaceOwnedCommerceConcern("royalties")).toThrow(
      "music_commerce_concern_owned_by_music:royalties",
    )
  })

  it("resolves specific artist boundaries before the root route", () => {
    expect(resolveMusicCommerceRouteBoundary("/api/artist/music/rights/claims")).toMatchObject({
      concern: "rights",
      owner: "music",
      authContract: "artist_profile",
    })
    expect(resolveMusicCommerceRouteBoundary("/api/artist/music/royalties/statements")).toMatchObject({
      concern: "royalties",
      owner: "music",
    })
    expect(resolveMusicCommerceRouteBoundary("/api/artist/music/upload-url")).toMatchObject({
      concern: "catalog",
      owner: "music",
    })
  })

  it("marks financial music routes as marketplace-owned and account-scoped", () => {
    for (const path of [
      "/api/marketplace/checkout",
      "/api/marketplace/orders",
      "/api/music-marketplace/catalog-links",
      "/api/music-marketplace/disclosures",
      "/api/music-marketplace/documents",
      "/api/music-marketplace/flags",
      "/api/music-marketplace/investor-account",
      "/api/music-marketplace/issuers",
      "/api/music-marketplace/market-data",
      "/api/music-marketplace/offerings",
      "/api/music-marketplace/orders",
      "/api/music-marketplace/pathway",
      "/api/music-marketplace/portfolio",
      "/api/music-marketplace/subscriptions",
      "/api/music-marketplace/transfers",
    ]) {
      expect(resolveMusicCommerceRouteBoundary(path), path).toMatchObject({
        owner: "marketplace",
        authContract: "marketplace_account",
      })
    }
  })

  it("does not classify lookalike paths outside the route boundary", () => {
    expect(resolveMusicCommerceRouteBoundary("/api/marketplace/checkout-preview")).toBeNull()
    expect(resolveMusicCommerceRouteBoundary("/api/music-marketplace-public")).toBeNull()
    expect(resolveMusicCommerceRouteBoundary("/api/music/stream")).toBeNull()
  })

  it("keeps every registered route aligned with its concern owner and auth contract", () => {
    const prefixes = MUSIC_COMMERCE_ROUTE_BOUNDARIES.map((boundary) => boundary.routePrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)

    for (const boundary of MUSIC_COMMERCE_ROUTE_BOUNDARIES) {
      const musicOwned = isMusicOwnedCommerceConcern(boundary.concern)
      const marketplaceOwned = isMarketplaceOwnedCommerceConcern(boundary.concern)
      expect(musicOwned).not.toBe(marketplaceOwned)
      expect(boundary.owner).toBe(musicOwned ? "music" : "marketplace")
      expect(boundary.authContract).toBe(musicOwned ? "artist_profile" : "marketplace_account")
    }
  })

  it("projects catalog data without financial or storage fields", () => {
    const reference = buildMusicCatalogCommerceReference({
      id: "track-1",
      user_id: "artist-1",
      title: "Song",
      rights_confirmed: true,
      access_mode: "paid",
      preview_mode: "clip",
    })

    expect(reference).toEqual({
      source: "music",
      trackId: "track-1",
      artistUserId: "artist-1",
      title: "Song",
      rightsStatus: "confirmed",
      accessMode: "paid",
      previewMode: "clip",
    })
    expect(reference).not.toHaveProperty("price")
    expect(reference).not.toHaveProperty("storage_path")
  })

  it("accepts only the minimum marketplace fulfillment reference", () => {
    expect(
      buildMarketplaceMusicPurchaseReference({
        orderId: "order-1",
        orderItemId: "item-1",
        trackId: "track-1",
        buyerUserId: "buyer-1",
        sellerUserId: "artist-1",
      }),
    ).toEqual({
      source: "marketplace",
      orderId: "order-1",
      orderItemId: "item-1",
      trackId: "track-1",
      buyerUserId: "buyer-1",
      sellerUserId: "artist-1",
    })
  })

  it("adopts the shared ARTIST-002 auth contract through the Music boundary", () => {
    const source = readFileSync(join(process.cwd(), "lib/music/music-commerce-auth.ts"), "utf8")
    expect(source).toContain('import "server-only"')
    expect(source).toContain("@/lib/artist/artist-music-auth")
    expect(source).toContain("requireArtistMusicUser")
  })
})
