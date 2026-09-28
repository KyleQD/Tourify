import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/venue/venue-access", () => ({
  canManageVenue: vi.fn(),
  getCurrentVenueContext: vi.fn(),
}))

import { PATCH } from "@/app/api/venue/booking-requests/route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const mockedAuth = vi.mocked(authenticateApiRequest)
const mockedServiceClient = vi.mocked(createServiceRoleClient)

describe("Venue booking lifecycle API gate", () => {
  beforeEach(() => {
    delete process.env.FEATURE_VENUE_BOOKING_LIFECYCLE
    mockedAuth.mockResolvedValue({
      user: { id: "00000000-0000-4000-8000-000000000001" },
      supabase: {},
    } as any)
  })

  afterEach(() => {
    delete process.env.FEATURE_VENUE_BOOKING_LIFECYCLE
    vi.clearAllMocks()
  })

  it("fails closed before touching lifecycle tables when the SQL gate is disabled", async () => {
    const request = new Request("http://localhost/api/venue/booking-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "10000000-0000-4000-8000-000000000001",
        lifecycleStatus: "hold",
        expectedRevision: 1,
        clientRequestId: "20000000-0000-4000-8000-000000000001",
      }),
    })

    const response = await PATCH(request as any)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.code).toBe("FEATURE_UNAVAILABLE")
    expect(mockedServiceClient).not.toHaveBeenCalled()
  })
})
