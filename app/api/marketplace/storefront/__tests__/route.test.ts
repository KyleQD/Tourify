jest.mock("server-only", () => ({}))

import { NextRequest } from "next/server"
import { GET } from "../route"
import { createClient } from "@/lib/supabase/server"

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe("GET /api/marketplace/storefront", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("normalizes username and includes seller profile fields", async () => {
    const usernameLookup = jest.fn().mockResolvedValue({
      data: { id: "user-kyle" },
      error: null,
    })
    const profileLookup = jest.fn().mockResolvedValue({
      data: {
        id: "user-kyle",
        username: "kyle",
        avatar_url: "https://cdn.example.com/kyle.jpg",
        bio: "Touring artist",
        full_name: "Kyle Daley",
      },
      error: null,
    })
    const storefrontLookup = jest.fn().mockResolvedValue({
      data: {
        seller_user_id: "user-kyle",
        display_name: "Kyle Store",
        tagline: "Merch and music",
        theme_config: { preset: "midnight" },
        sections: ["featured", "merch"],
        rating_average: 4.8,
        rating_count: 12,
      },
      error: null,
    })

    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn((columns: string) => {
              if (columns === "id") {
                return {
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: usernameLookup,
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  maybeSingle: profileLookup,
                }),
              }
            }),
          }
        }
        if (table === "marketplace_storefronts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: storefrontLookup,
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)

    const request = new NextRequest("http://localhost/api/marketplace/storefront?username=Kyle")
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.display_name).toBe("Kyle Store")
    expect(payload.seller).toEqual({
      id: "user-kyle",
      username: "kyle",
      avatarUrl: "https://cdn.example.com/kyle.jpg",
      bio: "Touring artist",
      fullName: "Kyle Daley",
    })
  })

  it("returns seller_not_found for unknown usernames", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
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
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any)

    const request = new NextRequest("http://localhost/api/marketplace/storefront?username=missing-user")
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error.code).toBe("seller_not_found")
  })
})
