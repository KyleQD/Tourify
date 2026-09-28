jest.mock("server-only", () => ({}))

import { GET } from "../route"
import { requireApiUser } from "@/lib/api/route-helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

jest.mock("@/lib/api/route-helpers", () => ({ requireApiUser: jest.fn() }))
jest.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: jest.fn() }))

const mockedRequireApiUser = requireApiUser as jest.MockedFunction<typeof requireApiUser>
const mockedService = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>

const ORDER_ITEM_ID = "item-1"
const BUYER_ID = "buyer-1"

function queryResult(result: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock> = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  return query
}

function userSupabase(overrides: {
  order?: Record<string, unknown>
  entitlement?: Record<string, unknown> | null
} = {}) {
  const itemQuery = queryResult({ data: { id: ORDER_ITEM_ID, order_id: "order-1" }, error: null })
  const orderQuery = queryResult({
    data: overrides.order ?? { buyer_user_id: BUYER_ID, seller_user_id: "seller-1" },
    error: null,
  })
  const entitlementQuery = queryResult({
    data:
      overrides.entitlement === undefined
        ? {
            id: "ent-1",
            signed_url: "https://storage.test/signed",
            signed_url_expires_at: new Date(Date.now() + 60_000).toISOString(),
            asset_url: "https://storage.test/asset",
            watermarked_asset_url: null,
            asset_bucket: null,
            asset_path: null,
            max_downloads: 5,
            download_count: 2,
          }
        : overrides.entitlement,
    error: null,
  })

  return {
    from: jest.fn((table: string) => {
      if (table === "marketplace_order_items") return itemQuery
      if (table === "marketplace_orders") return orderQuery
      if (table === "marketplace_entitlements") return entitlementQuery
      throw new Error(`Unexpected table ${table}`)
    }),
    storage: { from: jest.fn() },
    queries: { itemQuery, orderQuery, entitlementQuery },
  }
}

function serviceSupabase(updateResult: { data: unknown; error: unknown }) {
  const selectResult = { maybeSingle: jest.fn().mockResolvedValue(updateResult) }
  const updateFilter: Record<string, jest.Mock> = {
    eq: jest.fn(() => updateFilter),
    lt: jest.fn(() => updateFilter),
    select: jest.fn(() => selectResult),
  }
  const entitlements = {
    update: jest.fn(() => updateFilter),
  }
  return {
    from: jest.fn((table: string) => {
      if (table !== "marketplace_entitlements") throw new Error(`Unexpected table ${table}`)
      return entitlements
    }),
    updateFilter,
    entitlements,
    selectResult,
  }
}

describe("GET /api/marketplace/delivery/[orderItemId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("denies sellers so they cannot consume buyer download counts", async () => {
    const supabase = userSupabase({ order: { buyer_user_id: "buyer-2", seller_user_id: BUYER_ID } })
    mockedRequireApiUser.mockResolvedValue({
      success: true,
      auth: { user: { id: BUYER_ID }, supabase },
    } as any)

    const response = await GET({} as any, { params: Promise.resolve({ orderItemId: ORDER_ITEM_ID }) })

    expect(response.status).toBe(403)
    expect(mockedService).not.toHaveBeenCalled()
  })

  it("records a buyer download with a guarded compare-and-swap update", async () => {
    const supabase = userSupabase()
    const service = serviceSupabase({
      data: {
        id: "ent-1",
        signed_url: "https://storage.test/signed",
        signed_url_expires_at: "2026-09-25T08:00:00.000Z",
        max_downloads: 5,
        download_count: 3,
        last_downloaded_at: "2026-09-25T07:00:00.000Z",
      },
      error: null,
    })
    mockedRequireApiUser.mockResolvedValue({
      success: true,
      auth: { user: { id: BUYER_ID }, supabase },
    } as any)
    mockedService.mockReturnValue(service as any)

    const response = await GET({} as any, { params: Promise.resolve({ orderItemId: ORDER_ITEM_ID }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      downloadUrl: "https://storage.test/signed",
      downloadCount: 3,
      maxDownloads: 5,
    })
    expect(service.entitlements.update).toHaveBeenCalledWith(expect.objectContaining({ download_count: 3 }))
    expect(service.updateFilter.eq).toHaveBeenCalledWith("buyer_user_id", BUYER_ID)
    expect(service.updateFilter.eq).toHaveBeenCalledWith("download_count", 2)
    expect(service.updateFilter.lt).toHaveBeenCalledWith("download_count", 5)
  })

  it("returns a conflict when another request already claimed the count", async () => {
    const supabase = userSupabase()
    const service = serviceSupabase({ data: null, error: null })
    mockedRequireApiUser.mockResolvedValue({
      success: true,
      auth: { user: { id: BUYER_ID }, supabase },
    } as any)
    mockedService.mockReturnValue(service as any)

    const response = await GET({} as any, { params: Promise.resolve({ orderItemId: ORDER_ITEM_ID }) })

    expect(response.status).toBe(409)
    expect((await response.json()).error).toMatch(/already claimed/i)
  })
})
