import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))
vi.mock("@/lib/venue/venue-access", () => ({
  canManageVenue: vi.fn(),
  getCurrentVenueContext: vi.fn(),
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

import { GET, POST } from "@/app/api/venue/finances/route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

const mockedAuth = vi.mocked(authenticateApiRequest)
const mockedAccess = vi.mocked(canManageVenue)
const mockedService = vi.mocked(createServiceRoleClient)

describe("Venue finance tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: "user-1" },
      supabase: {},
    } as never)
  })

  it("denies reads before privileged finance data is queried", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "Forbidden" })

    const response = await GET(
      new Request(
        "https://tourify.test/api/venue/finances?venue_id=c8026785-e770-4cdd-8f3f-b21931c186cb",
      ) as never,
    )

    expect(response.status).toBe(403)
    expect(mockedService).not.toHaveBeenCalled()
    expect(mockedAccess).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "c8026785-e770-4cdd-8f3f-b21931c186cb",
      "view_finances",
    )
  })

  it("requires the stronger finance mutation capability", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "Forbidden" })

    const response = await POST(
      new Request(
        "https://tourify.test/api/venue/finances?venue_id=c8026785-e770-4cdd-8f3f-b21931c186cb",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expense",
            category: "Security",
            description: "Door staffing",
            amount: 500,
            date: "2026-07-28",
            status: "pending",
          }),
        },
      ) as never,
    )

    expect(response.status).toBe(403)
    expect(mockedService).not.toHaveBeenCalled()
    expect(mockedAccess).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "c8026785-e770-4cdd-8f3f-b21931c186cb",
      "manage_finances",
    )
  })
})
