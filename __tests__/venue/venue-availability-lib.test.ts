import { describe, expect, it, vi } from "vitest"
import {
  clearVenueAvailability,
  clearVenueAvailabilityById,
  isVenueDateBlocked,
  isVenueEventDateBlocked,
  listVenueReservations,
  parseAvailabilityDate,
  toAvailabilityCalendarDay,
  upsertVenueAvailability,
} from "@/lib/venue/availability"

/**
 * VENUE-004 focused lib coverage: date validation and the block-clear data
 * boundary (rows with booking/event linkage are opened, standalone rows are
 * deleted). Uses a minimal chainable fake in place of a Supabase client.
 * VENUE-005 adds the venue-scoped reservation projection (listVenueReservations).
 */

function chainable(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    overlaps: vi.fn(() => builder),
    order: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    single: vi.fn(async () => ({ data: null, error: null })),
    ...overrides,
  }
  return {
    query: builder,
    client: { from: vi.fn(() => builder) } as any,
  }
}

describe("parseAvailabilityDate", () => {
  it("accepts real yyyy-MM-dd calendar dates", () => {
    expect(parseAvailabilityDate("2026-10-15")).toBe("2026-10-15")
    expect(parseAvailabilityDate("2026-02-28")).toBe("2026-02-28")
  })

  it("rejects non-dates, malformed strings, and impossible calendar days", () => {
    expect(parseAvailabilityDate("2026-13-01")).toBeNull()
    expect(parseAvailabilityDate("2026-02-30")).toBeNull()
    expect(parseAvailabilityDate("2026-1-1")).toBeNull()
    expect(parseAvailabilityDate("oct-15-2026")).toBeNull()
    expect(parseAvailabilityDate(123)).toBeNull()
    expect(parseAvailabilityDate(null)).toBeNull()
  })
})

describe("clearVenueAvailability", () => {
  it("deletes a standalone block row for the venue/date", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({
      data: { id: "row-1", booking_id: null, event_id: null },
      error: null,
    })
    query.delete.mockReturnValue(query)
    query.select.mockReturnValue(query)

    const result = await clearVenueAvailability(client, { venueId: "venue-1", date: "2026-10-15" })

    expect(result.cleared).toBe(true)
    expect(query.delete).toHaveBeenCalled()
    expect(client.from).toHaveBeenCalledWith("venue_availability")
  })

  it("opens (not deletes) a block row that carries a booking linkage", async () => {
    const { query, client } = chainable()
    let fireDelete = false
    let fireUpdate = false
    query.maybeSingle.mockResolvedValue({
      data: { id: "row-1", booking_id: "booking-1", event_id: null },
      error: null,
    })
    query.delete.mockImplementation(() => {
      fireDelete = true
      return query
    })
    query.update.mockImplementation(() => {
      fireUpdate = true
      return query
    })
    query.select.mockReturnValue(query)

    const result = await clearVenueAvailability(client, { venueId: "venue-1", date: "2026-10-15" })

    expect(result.cleared).toBe(true)
    expect(fireUpdate).toBe(true)
    expect(fireDelete).toBe(false)
  })

  it("reports cleared=false when no row exists", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await clearVenueAvailability(client, { venueId: "venue-1", date: "2026-10-15" })

    expect(result.cleared).toBe(false)
    expect(query.delete).not.toHaveBeenCalled()
    expect(query.update).not.toHaveBeenCalled()
  })
})

describe("clearVenueAvailabilityById", () => {
  it("deletes a standalone row by id", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({
      data: { id: "row-2", booking_id: null, event_id: null },
      error: null,
    })

    const result = await clearVenueAvailabilityById(client, "row-2")

    expect(result.cleared).toBe(true)
    expect(query.delete).toHaveBeenCalled()
  })

  it("opens a booking-linked row by id", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({
      data: { id: "row-2", booking_id: null, event_id: "event-9" },
      error: null,
    })

    const result = await clearVenueAvailabilityById(client, "row-2")

    expect(result.cleared).toBe(true)
    expect(query.update).toHaveBeenCalled()
    expect(query.delete).not.toHaveBeenCalled()
  })
})

describe("upsertVenueAvailability", () => {
  it("normalizes empty text to null and upserts on the venue/date conflict", async () => {
    const { query, client } = chainable()
    query.select.mockReturnValue(query)
    query.maybeSingle.mockResolvedValue({ data: { id: "row-3" }, error: null })

    const result = await upsertVenueAvailability(client, {
      venueId: "venue-1",
      date: "2026-10-15",
      isAvailable: false,
      blockedReason: "   ",
      notes: "Window of maintenance",
    })

    expect(result.data).toEqual({ id: "row-3" })
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_id: "venue-1",
        date: "2026-10-15",
        is_available: false,
        blocked_reason: null,
        notes: "Window of maintenance",
      }),
      { onConflict: "venue_id,date" },
    )
  })
})

describe("isVenueDateBlocked", () => {
  it("reports blocked=true when a manager block row exists for the venue/date", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: { id: "row-blocked" }, error: null })

    const result = await isVenueDateBlocked(client, { venueId: "venue-1", date: "2026-10-15" })

    expect(result.blocked).toBe(true)
    expect(client.from).toHaveBeenCalledWith("venue_availability")
    expect(query.eq).toHaveBeenCalledWith("venue_id", "venue-1")
    expect(query.eq).toHaveBeenCalledWith("date", "2026-10-15")
    expect(query.eq).toHaveBeenCalledWith("is_available", false)
  })

  it("reports blocked=false when no manual block row exists", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await isVenueDateBlocked(client, { venueId: "venue-1", date: "2026-10-16" })

    expect(result.blocked).toBe(false)
    expect(result.error).toBeNull()
  })

  it("propagates the query error so callers can fail closed", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } })

    const result = await isVenueDateBlocked(client, { venueId: "venue-1", date: "2026-10-17" })

    expect(result.blocked).toBe(false)
    expect(result.error).toEqual({ message: "boom" })
  })
})

describe("toAvailabilityCalendarDay", () => {
  it("maps a booking event timestamp to its UTC calendar day", () => {
    expect(toAvailabilityCalendarDay("2026-10-15T19:00:00.000Z")).toBe("2026-10-15")
    expect(toAvailabilityCalendarDay("2026-10-15")).toBe("2026-10-15")
    // A late-evening instant stays on the UTC day, independent of host TZ.
    expect(toAvailabilityCalendarDay("2026-10-15T23:30:00.000Z")).toBe("2026-10-15")
  })

  it("returns null for an unparseable value so callers fail open, not closed", () => {
    expect(toAvailabilityCalendarDay("not-a-date")).toBeNull()
    expect(toAvailabilityCalendarDay("")).toBeNull()
  })
})

describe("isVenueEventDateBlocked", () => {
  it("checks the UTC calendar day derived from the booking event date", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: { id: "row-blocked" }, error: null })

    const result = await isVenueEventDateBlocked(client, {
      venueId: "venue-1",
      eventDate: "2026-10-15T19:00:00.000Z",
    })

    expect(result.blocked).toBe(true)
    expect(result.date).toBe("2026-10-15")
    expect(query.eq).toHaveBeenCalledWith("date", "2026-10-15")
    expect(query.eq).toHaveBeenCalledWith("is_available", false)
  })

  it("reports blocked=false for a day the venue left open", async () => {
    const { query, client } = chainable()
    query.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await isVenueEventDateBlocked(client, {
      venueId: "venue-1",
      eventDate: "2026-10-16T19:00:00.000Z",
    })

    expect(result.blocked).toBe(false)
    expect(result.date).toBe("2026-10-16")
  })

  it("does not query at all when the event date is unparseable", async () => {
    const { client } = chainable()

    const result = await isVenueEventDateBlocked(client, {
      venueId: "venue-1",
      eventDate: "not-a-date",
    })

    expect(result.blocked).toBe(false)
    expect(result.date).toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })
})

describe("listVenueReservations", () => {
  it("reads only consuming statuses for one venue over the reserved_range window", async () => {
    const { query, client } = chainable()
    const from = "2026-10-01T00:00:00.000Z"
    const to = "2026-10-31T23:59:59.999Z"

    const result = await listVenueReservations(client, { venueId: "venue-1", from, to })

    expect(result).toBeDefined()
    expect(client.from).toHaveBeenCalledWith("venue_reservations")
    expect(query.select).toHaveBeenCalledWith("id, resource_key, starts_at, ends_at, status")
    expect(query.eq).toHaveBeenCalledWith("venue_id", "venue-1")
    expect(query.in).toHaveBeenCalledWith("status", ["hold", "offer", "contract", "confirmed"])
    expect(query.overlaps).toHaveBeenCalledWith(
      "reserved_range",
      `[${from},${to}]`,
    )
    expect(query.order).toHaveBeenCalledWith("starts_at", { ascending: true })
  })

  it("skips the range overlap when no window is provided", async () => {
    const { query, client } = chainable()

    await listVenueReservations(client, { venueId: "venue-1" })

    expect(query.overlaps).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith("starts_at", { ascending: true })
  })
})