import { requireMarketplaceListingKindEnabled } from "../require-marketplace-enabled"

describe("marketplace launch variant gates", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.FEATURE_MARKETPLACE = "true"
    delete process.env.FEATURE_MARKETPLACE_NATIVE_GOODS
    delete process.env.FEATURE_MARKETPLACE_SERVICES
    delete process.env.FEATURE_MARKETPLACE_EXTERNAL_LISTINGS
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("keeps every listing variant disabled unless its own flag is enabled", () => {
    expect(requireMarketplaceListingKindEnabled("physical")?.status).toBe(503)
    expect(requireMarketplaceListingKindEnabled("service")?.status).toBe(503)
    expect(requireMarketplaceListingKindEnabled("external")?.status).toBe(503)
  })

  it("enables only the explicitly selected launch variant", () => {
    process.env.FEATURE_MARKETPLACE_NATIVE_GOODS = "true"
    expect(requireMarketplaceListingKindEnabled("physical")).toBeNull()
    expect(requireMarketplaceListingKindEnabled("service")?.status).toBe(503)
    expect(requireMarketplaceListingKindEnabled("external")?.status).toBe(503)
  })
})
