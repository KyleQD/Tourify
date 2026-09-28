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
  parseAvailabilityDate: vi.fn(),
  listVenueAvailability: vi.fn(),
  upsertVenueAvailability: vi.fn(),
  getVenueAvailabilityById: vi.fn(),
  updateVenueAvailabilityById: vi.fn(),
  clearVenueAvailability: vi.fn(),
  clearVenueAvailabilityById: vi.fn(),
}))

import { DELETE, GET, PATCH, POST } from "@/app/api/venue/availability/route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import {
  clearVenueAvailability,
  clearVenueAvailabilityById,
  getVenueAvailabilityById,
  listVenueAvailability,
  parseAvailabilityDate,
  updateVenueAvailabilityById,
  upsertVenueAvailability,
} from "@/lib/venue/availability"

const mockedAuth = vi.mocked(authenticateApiRequest)
const mockedServiceClient = vi.mocked(createServiceRoleClient)
const mockedCanManageVenue = vi.mocked(canManageVenue)
const mockedGetCurrentVenueContext = vi.mocked(getCurrentVenueContext)
const mockedList = vi.mocked(listVenueAvailability)
const mockedUpsert = vi.mocked(upsertVenueAvailability)
const mockedGetById = vi.mocked(getVenueAvailabilityById)
const mockedUpdateById = vi.mocked(updateVenueAvailabilityById)
const mockedClearByDate = vi.mocked(clearVenueAvailability)
const mockedClearById = vi.mocked(clearVenueAvailabilityById)
const mockedParseDate = vi.mocked(parseAvailabilityDate)

const VENUE_ID = "11111111-1111-4111-8111-111111111111"
const FOREIGN_VENUE_ID = "22222222-2222-4222-8222-222222222222"
const ROW_ID = "33333333-3333-4333-8333-333333333333"
const USER_ID = "00000000-0000-4000-8000-000000000001"

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
}

const AVAILABILITY_ROW = {
  id: ROW_ID,
  venue_id: VENUE_ID,
  date: "2026-10-15",
  is_available: false,
  blocked_reason: "Maintenance",
  notes: "HVAC work",
  booking_id: null,
  event_id: null,
  updated_at: "2026-09-23T00:00:00.000Z",
}

describe("VENUE-004 /api/venue/availability route gate", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: USER_ID }, supabase: {} } as any)
    mockedServiceClient.mockReturnValue({} as any)
    mockedCanManageVenue.mockResolvedValue({ allowed: true })
    mockedGetCurrentVenueContext.mockResolvedValue({ id: VENUE_ID } as any)
    mockedParseDate.mockImplementation((value: unknown) =>
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? (value as string) : null,
    )
    mockedList.mockResolvedValue({ data: [AVAILABILITY_ROW], error: null } as any)
    mockedUpsert.mockResolvedValue({ data: AVAILABILITY_ROW, error: null } as any)
    mockedGetById.mockResolvedValue({ data: AVAILABILITY_ROW, error: null } as any)
    mockedUpdateById.mockResolvedValue({ data: AVAILABILITY_ROW, error: null } as any)
    mockedClearByDate.mockResolvedValue({ data: null, error: null, cleared: true } as any)
    mockedClearById.mockResolvedValue({ data: null, error: null, cleared: true } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(false as any)

    for (const handler of [GET, POST, PATCH, DELETE]) {
      const response = await handler(jsonRequest("http://localhost/api/venue/availability"))
      expect(response.status).toBe(401)
    }
    expect(mockedServiceClient).not.toHaveBeenCalled()
  })

  it("GET requires a resolvable venue", async () => {
    mockedGetCurrentVenueContext.mockResolvedValue(null as any)
    const response = await GET(jsonRequest("http://localhost/api/venue/availability"))
    expect(response.status).toBe(400)
    expect(mockedCanManageVenue).not.toHaveBeenCalled()
  })

  it("GET denies a user who cannot manage the venue", async () => {
    mockedCanManageVenue.mockResolvedValue({ allowed: false, reason: "No" })
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/availability?venue_id=${FOREIGN_VENUE_ID}`),
    )
    expect(response.status).toBe(403)
    expect(mockedList).not.toHaveBeenCalled()
  })

  it("GET lists blocks in a date range for an authorized manager", async () => {
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/availability?venue_id=${VENUE_ID}&from=2026-10-01&to=2026-10-31`),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([AVAILABILITY_ROW])
    expect(mockedList).toHaveBeenCalledWith(expect.anything(), {
      venueId: VENUE_ID,
      from: "2026-10-01",
      to: "2026-10-31",
    })
    expect(mockedCanManageVenue).toHaveBeenCalledWith(expect.anything(), USER_ID, VENUE_ID, "manage_bookings")
  })

  it("GET rejects malformed range bounds", async () => {
    const response = await GET(
      jsonRequest(`http://localhost/api/venue/availability?venue_id=${VENUE_ID}&from=not-a-date`),
    )
    expect(response.status).toBe(400)
    expect(mockedList).not.toHaveBeenCalled()
  })

  it("POST blocks a date for an authorized manager", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "POST",
        body: JSON.stringify({
          venueId: VENUE_ID,
          date: "2026-10-15",
          isAvailable: false,
          blockedReason: "Maintenance",
          notes: "HVAC work",
        }),
      }),
    )
    expect(response.status).toBe(201)
    expect(mockedUpsert).toHaveBeenCalledWith(expect.anything(), {
      venueId: VENUE_ID,
      date: "2026-10-15",
      isAvailable: false,
      blockedReason: "Maintenance",
      notes: "HVAC work",
    })
  })

  it("POST defaults to a block (isAvailable false)", async () => {
    const ok = await POST(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "POST",
        body: JSON.stringify({ venueId: VENUE_ID, date: "2026-10-16" }),
      }),
    )
    expect(ok.status).toBe(201)
    expect(mockedUpsert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isAvailable: false }))
  })

  it("POST rejects bad dates before any write", async () => {
    mockedParseDate.mockReturnValue(null)
    const bad = await POST(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "POST",
        body: JSON.stringify({ venueId: VENUE_ID, date: "2026-13-99" }),
      }),
    )
    expect(bad.status).toBe(400)
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("POST enforces the manage_bookings gate before writing", async () => {
    mockedCanManageVenue.mockResolvedValue({ allowed: false, reason: "No" })
    const response = await POST(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "POST",
        body: JSON.stringify({ venueId: FOREIGN_VENUE_ID, date: "2026-10-15" }),
      }),
    )
    expect(response.status).toBe(403)
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("PATCH resolves scope from the row and updates it", async () => {
    const response = await PATCH(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "PATCH",
        body: JSON.stringify({ id: ROW_ID, blockedReason: "Updated reason" }),
      }),
    )
    expect(response.status).toBe(200)
    expect(mockedGetById).toHaveBeenCalledWith(expect.anything(), ROW_ID)
    expect(mockedCanManageVenue).toHaveBeenCalledWith(expect.anything(), USER_ID, VENUE_ID, "manage_bookings")
    expect(mockedUpdateById).toHaveBeenCalledWith(expect.anything(), ROW_ID, {
      isAvailable: undefined,
      blockedReason: "Updated reason",
      notes: undefined,
    })
  })

  it("PATCH rejects updates to a row on a foreign venue", async () => {
    mockedGetById.mockResolvedValue({
      data: { ...AVAILABILITY_ROW, venue_id: FOREIGN_VENUE_ID },
      error: null,
    } as any)
    mockedCanManageVenue.mockResolvedValue({ allowed: false, reason: "No" })
    const response = await PATCH(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "PATCH",
        body: JSON.stringify({ id: ROW_ID, isAvailable: true }),
      }),
    )
    expect(response.status).toBe(403)
    expect(mockedUpdateById).not.toHaveBeenCalled()
  })

  it("PATCH returns 404 for an unknown row", async () => {
    mockedGetById.mockResolvedValue({ data: null, error: null } as any)
    const response = await PATCH(
      jsonRequest("http://localhost/api/venue/availability", {
        method: "PATCH",
        body: JSON.stringify({ id: ROW_ID }),
      }),
    )
    expect(response.status).toBe(404)
  })

  it("DELETE clears a block by date within the resolved venue", async () => {
    const response = await DELETE(
      jsonRequest(`http://localhost/api/venue/availability?date=2026-10-15&venue_id=${VENUE_ID}`),
    )
    expect(response.status).toBe(200)
    expect(mockedCanManageVenue).toHaveBeenCalledWith(expect.anything(), USER_ID, VENUE_ID, "manage_bookings")
    expect(mockedClearByDate).toHaveBeenCalledWith(expect.anything(), {
      venueId: VENUE_ID,
      date: "2026-10-15",
    })
  })

  it("DELETE clears a block by id after checking its venue scope", async () => {
    const response = await DELETE(jsonRequest(`http://localhost/api/venue/availability?id=${ROW_ID}`))
    expect(response.status).toBe(200)
    expect(mockedClearById).toHaveBeenCalledWith(expect.anything(), ROW_ID)
    // The id path resolves the row first so the scope check uses the row venue.
    expect(mockedGetById).toHaveBeenCalledWith(expect.anything(), ROW_ID)
  })

  it("DELETE rejects a malformed date", async () => {
    mockedParseDate.mockReturnValue(null)
    const response = await DELETE(
      jsonRequest(`http://localhost/api/venue/availability?date=bogus&venue_id=${VENUE_ID}`),
    )
    expect(response.status).toBe(400)
    expect(mockedClearByDate).not.toHaveBeenCalled()
  })

  it("DELETE requires id or date", async () => {
    const response = await DELETE(jsonRequest(`http://localhost/api/venue/availability?venue_id=${VENUE_ID}`))
    expect(response.status).toBe(400)
  })
})