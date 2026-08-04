jest.mock("server-only", () => ({}))

import { NextRequest } from "next/server"
import { GET } from "../route"
import { createClient } from "@/lib/supabase/server"

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>

function createListingsQuery({
  data = [],
  error = null,
}: {
  data?: unknown[]
  error?: unknown
} = {}) {
  const query: any = {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    then: undefined as any,
  }
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }))
  return query
}

describe("GET /api/marketplace/discover", () => {
  const originalMarketplace = process.env.FEATURE_MARKETPLACE
  const originalDiscovery = process.env.FEATURE_MARKETPLACE_PUBLIC_DISCOVERY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FEATURE_MARKETPLACE = "true"
    process.env.FEATURE_MARKETPLACE_PUBLIC_DISCOVERY = "true"
  })

  afterAll(() => {
    if (originalMarketplace === undefined) delete process.env.FEATURE_MARKETPLACE
    else process.env.FEATURE_MARKETPLACE = originalMarketplace
    if (originalDiscovery === undefined) delete process.env.FEATURE_MARKETPLACE_PUBLIC_DISCOVERY
    else process.env.FEATURE_MARKETPLACE_PUBLIC_DISCOVERY = originalDiscovery
  })

  it("normalizes sellerUsername and scopes listings to the resolved seller", async () => {
    const listingsQuery = createListingsQuery({
      data: [
        {
          id: "listing-1",
          seller_user_id: "user-kyle",
          title: "Kyle Merch",
          description: "Hoodie",
          product_type: "physical_good",
          category: "merch",
          currency: "USD",
          base_price: 40,
          cover_image_url: null,
          tags: [],
          metadata: {},
          featured_rank: null,
          marketplace_listing_variants: [],
        },
      ],
    })

    const profilesMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "user-kyle", username: "kyle" },
      error: null,
    })

    mockedCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: profilesMaybeSingle,
              }),
            }),
          }
        }
        if (table === "marketplace_listings") {
          return {
            select: jest.fn().mockReturnValue(listingsQuery),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)

    const request = new NextRequest("http://localhost/api/marketplace/discover?sellerUsername=Kyle&limit=10")
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(profilesMaybeSingle).toHaveBeenCalled()
    expect(listingsQuery.eq).toHaveBeenCalledWith("seller_user_id", "user-kyle")
    expect(payload.seller).toEqual({ id: "user-kyle", username: "kyle" })
    expect(payload.data).toHaveLength(1)
    expect(payload.data[0].title).toBe("Kyle Merch")
  })

  it("returns seller_not_found instead of unscoped global listings", async () => {
    const listingsSelect = jest.fn()

    mockedCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === "marketplace_listings") {
          return {
            select: listingsSelect,
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)

    const request = new NextRequest("http://localhost/api/marketplace/discover?sellerUsername=nobody-here")
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error.code).toBe("seller_not_found")
    expect(listingsSelect).not.toHaveBeenCalled()
  })
})
