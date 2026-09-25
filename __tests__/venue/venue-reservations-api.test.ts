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

vi.mock("@/lib/venue/availability", () => ({
  listVenueReservations: vi.fn(),
}))

import { GET } from "@/app/api/venue/reservations/route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import { listVenueReservations } from "@/lib/venue/availability"

const mockedAuth = vi.mocked(authenticateApiRequest)
const mockedServiceClient = vi.mocked(createServiceRoleClient)
const mockedCanManageVenue = vi.mocked(canManageVenue)
const mockedGetCurrentVenueContext = vi.mocked(getCurrentVenueContext)
const mockedListReservations = vi.mocked(listVenueReservations)

const VENUE_ID = "11111111-1111-4111-8111-111111111111"
const FOREIGN_VENUE_ID = "22222222-2222-4222-8222-222222222222"
const USER_ID = "00000000-0000-4000-8000-000000000001"

const RESERVATION_ROW = {
  id: "33333333-3333-4333-8333-333333333333",
  resource_key: "main-stage",
  starts_at: "2026-10-10T19:00:00.000Z",
  ends_at: "2026-10-10T23:00:00.000Z",
  status: "hold",
}

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
}

describe("VENUE-005 /api/venue/reservations route gate", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: USER_ID }, supabase: {} } as any)
    mockedServiceClient.mockReturnValue({} as any)
    mockedCanManageVenue.mockResolvedValue({ allowed: true })
    mockedGetCurrentVenueContext.mockResolvedValue({ id: VENUE_ID } as any)
    mockedListReservations.mockResolvedValue({ data: [RESERVATION_ROW], error: null } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(false as any)

    const response = await GET(jsonRequest("http://localhost/api/venue/reservations"))
    expect(response.status).toBe(401)
    expect(mockedServiceClient).not.toHaveBeenCalled()
  })

  it("GET requires a resolvable venue", async () => {
    mockedGetCurrentVenueContext.mockResolvedValue(null as any)
    const response = await GET(jsonRequest("http://localhost/api/venue/reservations"))
    expect(response.status).toBe(400)
    expect(mockedCanManageVenue).not.toHaveBeenCalled()
  })

  it("GET denies a user who cannot manage the venue before any read", async () => {
    mockedCanManageVenue.mockResolvedValue({ allowed: false, reason: "Forbidden" })
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/reservations?venue_id=${FOREIGN_VENUE_ID}`),
    )
    expect(response.status).toBe(403)
    expect(mockedListReservations).not.toHaveBeenCalled()
    expect(mockedServiceClient).not.toHaveBeenCalled()
  })

  it("GET lists consuming reservations in a window for an authorized manager", async () => {
    const response = await GET(
      jsonRequest(
        `http://localhost/api/venue/reservations?venue_id=${VENUE_ID}&from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.999Z`,
      ),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([RESERVATION_ROW])
    expect(mockedCanManageVenue).toHaveBeenCalledWith(expect.anything(), USER_ID, VENUE_ID, "manage_bookings")
    expect(mockedListReservations).toHaveBeenCalledWith(expect.anything(), {
      venueId: VENUE_ID,
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.999Z",
    })
  })

  it("GET supports the venue-context resolution path (no venue_id query param)", async () => {
    const response = await GET(jsonRequest("http://localhost/api/venue/reservations"))
    expect(response.status).toBe(200)
    expect(mockedCanManageVenue).toHaveBeenCalledWith(expect.anything(), USER_ID, VENUE_ID, "manage_bookings")
  })

  it("GET rejects from without to", async () => {
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/reservations?venue_id=${VENUE_ID}&from=2026-10-01T00:00:00.000Z`),
    )
    expect(response.status).toBe(400)
    expect(mockedListReservations).not.toHaveBeenCalled()
  })

  it("GET rejects malformed ISO bounds", async () => {
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/reservations?venue_id=${VENUE_ID}&from=not-a-date&to=2026-10-31`),
    )
    expect(response.status).toBe(400)
    expect(mockedListReservations).not.toHaveBeenCalled()
  })

  it("GET rejects an inverted window", async () => {
    const response = await GET(
      jsonRequest(
        `http://localhost/api/venue/reservations?venue_id=${VENUE_ID}&from=2026-11-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z`,
      ),
    )
    expect(response.status).toBe(400)
    expect(mockedListReservations).not.toHaveBeenCalled()
  })

  it("GET lists without a window when no bounds are given", async () => {
    const response = await GET(jsonRequest(`http://localhost/api/venue/reservations?venue_id=${VENUE_ID}`))
    expect(response.status).toBe(200)
    expect(mockedListReservations).toHaveBeenCalledWith(expect.anything(), {
      venueId: VENUE_ID,
      from: undefined,
      to: undefined,
    })
  })

  it("GET fails closed (500) when the service-role read errors", async () => {
    mockedListReservations.mockResolvedValue({ data: null, error: { message: "boom" } } as any)
    const response = await GET(jsonRequest(`http://localhost/api/venue/reservations?venue_id=${VENUE_ID}`))
    expect(response.status).toBe(500)
  })
})