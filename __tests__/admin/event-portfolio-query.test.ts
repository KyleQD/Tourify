import { describe, expect, it } from "vitest"

import {
  applyEventPortfolioQuery,
  decodeEventPortfolioCursor,
  EventPortfolioQueryError,
  EVENT_PORTFOLIO_STATUSES,
  normalizeEventSearch,
  parseEventPortfolioQuery,
  type EventPortfolioRow,
} from "@/lib/admin/event-portfolio-query"

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const TOUR_A = "11111111-1111-4111-8111-111111111111"
const VENUE_A = "22222222-2222-4222-8222-222222222222"

function buildScale(count: number): EventPortfolioRow[] {
  const rows: EventPortfolioRow[] = []
  for (let index = 0; index < count; index += 1) {
    const status = EVENT_PORTFOLIO_STATUSES[index % EVENT_PORTFOLIO_STATUSES.length]
    const month = String((index % 12) + 1).padStart(2, "0")
    const day = String((index % 28) + 1).padStart(2, "0")
    rows.push({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      org_id: index % 13 === 0 ? ORG_B : ORG_A,
      title: `Event ${index} North Hall`,
      status,
      start_at: `2026-${month}-${day}T20:00:00.000Z`,
      updated_at: `2026-07-${day}T12:00:00.000Z`,
      created_at: `2026-01-${day}T12:00:00.000Z`,
      venue_id: index % 5 === 0 ? VENUE_A : null,
      settings: { venue_label: index % 2 === 0 ? "North Hall" : "South Hall" },
      tours: index % 3 === 0 ? [{ id: TOUR_A, name: "Summer Tour", is_primary: true }] : [],
      readiness: index % 7 === 0 ? { status: "blocked", score: 20 } : { status: "ready", score: 100 },
    })
  }
  return rows
}

describe("event portfolio query contract", () => {
  it("normalizes search and rejects unknown sort/status", () => {
    expect(normalizeEventSearch("  North   Hall\t")).toBe("north hall")

    expect(() => parseEventPortfolioQuery({ sort: "revenue" as never })).toThrow(EventPortfolioQueryError)
    expect(() => parseEventPortfolioQuery({ status: "bogus" })).toThrow(EventPortfolioQueryError)
  })

  it("enforces org authorization boundary", () => {
    const rows = buildScale(50)
    const page = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseEventPortfolioQuery({ limit: 100 }),
    })
    expect(page.items.every((row) => row.org_id === ORG_A)).toBe(true)
    expect(page.totalCount).toBe(rows.filter((row) => row.org_id === ORG_A).length)
  })

  it("applies filters, stable counts, and cursor pagination", () => {
    const rows = buildScale(250)
    const query = parseEventPortfolioQuery({
      status: "draft,confirmed",
      q: "north hall",
      sort: "start_at",
      order: "asc",
      limit: 20,
    })

    const first = applyEventPortfolioQuery({ rows, orgId: ORG_A, query })
    expect(first.filters.q).toBe("north hall")
    expect(first.filters.status).toEqual(["draft", "confirmed"])
    expect(first.items.length).toBeLessThanOrEqual(20)
    expect(first.items.every((row) => ["draft", "confirmed"].includes(String(row.status)))).toBe(true)
    expect(first.nextCursor).toBeTruthy()

    const second = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: { ...query, cursor: first.nextCursor },
    })
    expect(second.totalCount).toBe(first.totalCount)

    const seen = new Set(first.items.map((row) => row.id))
    for (const row of second.items) {
      expect(seen.has(row.id)).toBe(false)
      seen.add(row.id)
    }

    expect(() => decodeEventPortfolioCursor(first.nextCursor, "title", "asc")).toThrow(EventPortfolioQueryError)
  })

  it("filters by tour, venue, route, date bounds, and readiness", () => {
    const rows = buildScale(120)
    const touring = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseEventPortfolioQuery({ route: "touring", tour_id: TOUR_A, limit: 100 }),
    })
    expect(touring.items.length).toBeGreaterThan(0)
    expect(touring.items.every((row) => row.tours?.some((tour) => tour.id === TOUR_A))).toBe(true)

    const venue = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseEventPortfolioQuery({ venue_id: VENUE_A, date_from: "2026-01-01", date_to: "2026-12-31", limit: 100 }),
    })
    expect(venue.items.length).toBeGreaterThan(0)
    expect(venue.items.every((row) => row.venue_id === VENUE_A)).toBe(true)

    const blocked = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseEventPortfolioQuery({ readiness: "blocked", limit: 100 }),
    })
    expect(blocked.items.length).toBeGreaterThan(0)
    expect(blocked.items.every((row) => row.readiness?.status === "blocked")).toBe(true)

    const standalone = applyEventPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseEventPortfolioQuery({ route: "standalone", limit: 100 }),
    })
    expect(standalone.items.every((row) => !row.tours?.length)).toBe(true)
  })
})
