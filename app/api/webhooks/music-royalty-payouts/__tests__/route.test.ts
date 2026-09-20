import { createHmac } from "crypto"
import { NextRequest } from "next/server"

jest.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: jest.fn(),
}))

import { POST } from "../route"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>

function signedRequest(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex")
  return new NextRequest("https://tourify.local/api/webhooks/music-royalty-payouts", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
    body: payload,
  })
}

describe("POST /api/webhooks/music-royalty-payouts", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES
    process.env.MUSIC_ROYALTY_PAYOUTS_WEBHOOK_ALLOW_UNSIGNED = "true"
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("does not accept the retired unsigned fallback, even when it is enabled", async () => {
    const response = await POST(new NextRequest("https://tourify.local/api/webhooks/music-royalty-payouts", {
      method: "POST",
      body: JSON.stringify({ id: "evt_unsigned", type: "transfer.created" }),
    }))

    expect(response.status).toBe(503)
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled()
  })

  it("does not accept the generic Stripe webhook secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec-generic"
    const payload = JSON.stringify({ id: "evt_generic", type: "transfer.created" })

    const response = await POST(signedRequest(payload, "whsec-generic"))

    expect(response.status).toBe(503)
    expect(mockedCreateServiceRoleClient).not.toHaveBeenCalled()
  })

  it("accepts a valid signature from the music royalties endpoint secret", async () => {
    const secret = "whsec-music-royalties"
    process.env.FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED = "true"
    process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES = secret
    const insert = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    }))
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn((table: string) => ({
        insert: table === "music_royalties_payout_provider_events" ? insert : undefined,
        update,
      })),
    } as any)

    const response = await POST(signedRequest(
      JSON.stringify({ id: "evt_music_1", type: "transfer.created", data: { object: {} } }),
      secret,
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, event_id: "evt_music_1" })
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it("acknowledges duplicate claims without processing", async () => {
    const secret = "whsec-music-royalties"
    process.env.FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED = "true"
    process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES = secret
    const insert = jest.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } })
    const from = jest.fn(() => ({ insert }))
    mockedCreateServiceRoleClient.mockReturnValue({ from } as any)

    const response = await POST(signedRequest(
      JSON.stringify({ id: "evt_duplicate", type: "transfer.created", data: { object: {} } }),
      secret,
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it("fails closed when the event claim cannot be persisted", async () => {
    const secret = "whsec-music-royalties"
    process.env.FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED = "true"
    process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES = secret
    const insert = jest.fn().mockResolvedValue({ error: { code: "42501", message: "permission denied" } })
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn(() => ({ insert })),
    } as any)

    const response = await POST(signedRequest(
      JSON.stringify({ id: "evt_claim_error", type: "transfer.created", data: { object: {} } }),
      secret,
    ))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Event persistence failed" })
  })
})
