import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadVenueCalendarLayers } from "@/app/venue/hooks/use-venue-calendar-data"
import { venueService } from "@/lib/services/venue.service"

vi.mock("@/lib/services/venue.service", () => ({
  venueService: {
    getConfirmedBookingsByRange: vi.fn(),
    getVenueEventsByRange: vi.fn(),
  },
}))

const mockedBookingsByRange = vi.mocked(venueService.getConfirmedBookingsByRange)
const mockedEventsByRange = vi.mocked(venueService.getVenueEventsByRange)

const VENUE_ID = "11111111-1111-4111-8111-111111111111"

/**
 * VENUE-005 raw-read boundary.
 *
 * The calendar previously read `venue_reservations` / `venue_availability`
 * with the client-role Supabase client. After VENUE-005 the only app/lib
 * callers of those raw tables must be the server-side venue-scoped helpers,
 * and every calendar layer must load through the venue-scoped API routes.
 */

/** Walks a source root and returns relative paths containing a raw-table `.from(...)` call. */
function collectRawTableReaders(root: string): string[] {
  const hits: string[] = []
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "__tests__", "tests", "coverage", ".git"].includes(entry.name)) continue
        visit(full)
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        const source = readFileSync(full, "utf8")
        if (
          source.includes('.from("venue_availability")') ||
          source.includes('.from("venue_reservations")')
        ) {
          hits.push(relative(process.cwd(), full))
        }
      }
    }
  }
  visit(root)
  return hits
}

describe("VENUE-005 raw-table read boundary", () => {
  it("confines raw venue_availability/venue_reservations reads to the server-side lib", () => {
    const readers = [
      ...collectRawTableReaders("app"),
      ...collectRawTableReaders("lib"),
      ...collectRawTableReaders("components"),
    ].sort()

    expect(readers).toEqual(["lib/venue/availability.ts"])
  })

  it("keeps the calendar hook off the raw tables and the client Supabase client", () => {
    const hook = readFileSync(
      join(process.cwd(), "app/venue/hooks/use-venue-calendar-data.ts"),
      "utf8",
    )

    expect(hook).not.toContain('.from("venue_availability")')
    expect(hook).not.toContain('.from("venue_reservations")')
    expect(hook).not.toContain("@/lib/supabase/client")
    expect(hook).toContain("loadVenueCalendarLayers")
  })

  it("keeps the availability editor and calendar pages on venue-scoped surfaces", () => {
    const surfaces = [
      "app/venue/components/availability/venue-availability-editor.tsx",
      "app/venue/dashboard/calendar/page.tsx",
      "app/venue/bookings/page.tsx",
    ]

    for (const surface of surfaces) {
      const source = readFileSync(join(process.cwd(), surface), "utf8")
      expect(source).not.toContain('.from("venue_availability")')
      expect(source).not.toContain('.from("venue_reservations")')
    }
  })
})

function okJson(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("loadVenueCalendarLayers (venue-scoped API wiring)", () => {
  const fetchMock = vi.fn()

  const RESERVATION_ROW = {
    id: "r-1",
    resource_key: "main-stage",
    starts_at: "2026-10-10T19:00:00.000Z",
    ends_at: "2026-10-10T23:00:00.000Z",
    status: "hold",
  }
  const BLOCK_ROW = { date: "2026-10-15", is_available: false }
  const OPEN_ROW = { date: "2026-10-16", is_available: true }

  beforeEach(() => {
    global.fetch = fetchMock as any
    fetchMock.mockReset()
    mockedBookingsByRange.mockReset()
    mockedEventsByRange.mockReset()

    mockedBookingsByRange.mockResolvedValue([
      { id: "b-1", event_name: "Night One", event_date: "2026-10-02" },
    ] as any)
    mockedEventsByRange.mockResolvedValue([
      { id: "e-1", title: "Headline Show", date: "2026-10-03", settings: { event_type: "concert" } },
    ] as any)

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/venue/reservations")) {
        return Promise.resolve(okJson({ success: true, data: [RESERVATION_ROW] }))
      }
      return Promise.resolve(okJson({ success: true, data: [BLOCK_ROW, OPEN_ROW] }))
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads all four layers through the venue-scoped APIs", async () => {
    const layers = await loadVenueCalendarLayers({
      venueId: VENUE_ID,
      fromIso: "2026-10-01T00:00:00.000Z",
      toIso: "2026-10-31T23:59:59.999Z",
      fromDate: "2026-10-01",
      toDate: "2026-10-31",
    })

    expect(layers.bookings).toEqual([
      { id: "b-1", event_name: "Night One", event_date: "2026-10-02" },
    ])
    expect(layers.venueEvents).toEqual([
      { id: "e-1", title: "Headline Show", date: "2026-10-03", type: "concert" },
    ])
    expect(layers.reservations).toEqual([RESERVATION_ROW])
    // Only is_available=false rows become calendar blocks.
    expect(layers.blocks).toEqual([{ date: "2026-10-15" }])

    expect(mockedBookingsByRange).toHaveBeenCalledWith(
      VENUE_ID,
      "2026-10-01T00:00:00.000Z",
      "2026-10-31T23:59:59.999Z",
    )
    expect(mockedEventsByRange).toHaveBeenCalledWith(
      VENUE_ID,
      "2026-10-01T00:00:00.000Z",
      "2026-10-31T23:59:59.999Z",
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const urls = fetchMock.mock.calls.map((call) => new URL(call[0], "http://localhost"))
    const reservationsUrl = urls.find((url) => url.pathname === "/api/venue/reservations")
    const availabilityUrl = urls.find((url) => url.pathname === "/api/venue/availability")
    expect(reservationsUrl?.searchParams.get("venue_id")).toBe(VENUE_ID)
    expect(reservationsUrl?.searchParams.get("from")).toBe("2026-10-01T00:00:00.000Z")
    expect(reservationsUrl?.searchParams.get("to")).toBe("2026-10-31T23:59:59.999Z")
    expect(availabilityUrl?.searchParams.get("venue_id")).toBe(VENUE_ID)
    expect(availabilityUrl?.searchParams.get("from")).toBe("2026-10-01")
    expect(availabilityUrl?.searchParams.get("to")).toBe("2026-10-31")
  })

  it("fails closed when a venue-scoped API denies the request", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/venue/reservations")) {
        return Promise.resolve(new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 }))
      }
      return Promise.resolve(okJson({ success: true, data: [] }))
    })

    await expect(
      loadVenueCalendarLayers({
        venueId: VENUE_ID,
        fromIso: "2026-10-01T00:00:00.000Z",
        toIso: "2026-10-31T23:59:59.999Z",
        fromDate: "2026-10-01",
        toDate: "2026-10-31",
      }),
    ).rejects.toThrow(/failed/i)
  })
})