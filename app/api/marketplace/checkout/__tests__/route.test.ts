import { POST } from "../route"
import { requireApiUser } from "@/lib/api/route-helpers"

jest.mock("@/lib/api/route-helpers", () => ({
  ...jest.requireActual("@/lib/api/route-helpers"),
  requireApiUser: jest.fn(),
}))

const mockedRequireApiUser = requireApiUser as jest.MockedFunction<typeof requireApiUser>

describe("POST /api/marketplace/checkout", () => {
  it("returns structured validation errors for invalid payloads", async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase: {},
      },
    } as any)

    const request = {
      json: async () => ({ lines: [] }),
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe("invalid_request")
    expect(Array.isArray(payload.error.issues)).toBe(true)
  })

  it("blocks self-purchase attempts with contract error envelope", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table !== "marketplace_listings") throw new Error(`Unexpected table ${table}`)
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "11111111-1111-1111-1111-111111111111",
                  seller_user_id: "buyer-1",
                  title: "Track",
                  status: "published",
                  product_type: "digital_asset",
                  currency: "USD",
                  base_price: 5,
                  cover_image_url: null,
                  metadata: {},
                  music_track_id: null,
                },
              ],
              error: null,
            }),
          }),
        }
      }),
    }

    mockedRequireApiUser.mockResolvedValueOnce({
      success: true,
      auth: {
        user: { id: "buyer-1", email: "buyer@example.com" },
        supabase,
      },
    } as any)

    const request = {
      json: async () => ({
        lines: [
          {
            listingId: "11111111-1111-1111-1111-111111111111",
            quantity: 1,
          },
        ],
      }),
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe("self_purchase_not_allowed")
  })
})
