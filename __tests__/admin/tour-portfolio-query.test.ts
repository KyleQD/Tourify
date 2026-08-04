import { describe, expect, it } from "vitest"

import { TOUR_LIFECYCLE_STATES } from "@/lib/admin/tour-lifecycle"
import {
  applyTourPortfolioQuery,
  decodeTourPortfolioCursor,
  normalizeTourSearch,
  parseTourPortfolioQuery,
  TourPortfolioQueryError,
  type TourPortfolioRow,
} from "@/lib/admin/tour-portfolio-query"

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function buildScale(count: number): TourPortfolioRow[] {
  const rows: TourPortfolioRow[] = []
  for (let index = 0; index < count; index += 1) {
    const status = TOUR_LIFECYCLE_STATES[index % TOUR_LIFECYCLE_STATES.length]
    const month = String((index % 12) + 1).padStart(2, "0")
    const day = String((index % 28) + 1).padStart(2, "0")
    rows.push({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      org_id: index % 17 === 0 ? ORG_B : ORG_A,
      name: `Tour ${index}  North America`,
      status,
      start_date: `2026-${month}-${day}`,
      end_date: `2026-${month}-${day}`,
      updated_at: `2026-07-${day}T12:00:00.000Z`,
      created_at: `2026-01-${day}T12:00:00.000Z`,
      main_artist: index % 3 === 0 ? "Ada Resonance" : "Other Artist",
      settings: { main_artist: index % 3 === 0 ? "Ada Resonance" : "Other Artist" },
    })
  }
  return rows
}

describe("TOUR-104 tour portfolio query contract", () => {
  it("normalizes search and rejects unknown sort/status", () => {
    expect(normalizeTourSearch("  Ada   Resonance\t")).toBe("ada resonance")

    expect(() => parseTourPortfolioQuery({ sort: "revenue" as never })).toThrow(TourPortfolioQueryError)
    expect(() => parseTourPortfolioQuery({ status: "bogus" })).toThrow(TourPortfolioQueryError)
  })

  it("enforces org authorization boundary (foreign org rows never appear)", () => {
    const rows = buildScale(50)
    const page = applyTourPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseTourPortfolioQuery({ limit: 100 }),
    })
    expect(page.items.every((row) => row.org_id === ORG_A)).toBe(true)
    expect(page.totalCount).toBe(rows.filter((row) => row.org_id === ORG_A).length)
  })

  it("applies filter grammar, sort allowlist, stable counts, and cursor pagination at n=500", () => {
    const rows = buildScale(500)
    const orgRows = rows.filter((row) => row.org_id === ORG_A)
    const query = parseTourPortfolioQuery({
      status: "draft,active",
      q: "  Ada  Resonance ",
      sort: "start_date",
      order: "asc",
      limit: 25,
    })

    const first = applyTourPortfolioQuery({ rows, orgId: ORG_A, query })
    expect(first.filters.q).toBe("ada resonance")
    expect(first.filters.status).toEqual(["draft", "active"])
    expect(first.totalCount).toBeGreaterThan(0)
    expect(first.items.length).toBeLessThanOrEqual(25)
    expect(first.items.every((row) => ["draft", "active"].includes(String(row.status)))).toBe(true)
    expect(first.items.every((row) => normalizeTourSearch(String(row.main_artist)).includes("ada"))).toBe(true)

    // Stable count across pages
    expect(first.nextCursor).toBeTruthy()
    const second = applyTourPortfolioQuery({
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

    // Cursor decode rejects sort mismatch
    expect(() =>
      decodeTourPortfolioCursor(first.nextCursor, "name", "asc"),
    ).toThrow(TourPortfolioQueryError)

    // Exhaust pages — no duplicates, covers filtered set
    let cursor = second.nextCursor
    let pages = 2
    while (cursor && pages < 40) {
      const page = applyTourPortfolioQuery({
        rows,
        orgId: ORG_A,
        query: { ...query, cursor },
      })
      expect(page.totalCount).toBe(first.totalCount)
      for (const row of page.items) {
        expect(seen.has(row.id)).toBe(false)
        seen.add(row.id)
      }
      cursor = page.nextCursor
      pages += 1
    }
    expect(seen.size).toBe(first.totalCount)

    // Representative scale sanity: org A subset of 500
    expect(orgRows.length).toBeGreaterThan(400)
  })

  it("supports date bounds and desc sort", () => {
    const rows = buildScale(120)
    const page = applyTourPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseTourPortfolioQuery({
        start_from: "2026-06-01",
        start_to: "2026-08-31",
        sort: "name",
        order: "desc",
        limit: 10,
      }),
    })
    for (const row of page.items) {
      const start = String(row.start_date).slice(0, 10)
      expect(start >= "2026-06-01").toBe(true)
      expect(start <= "2026-08-31").toBe(true)
    }
    if (page.items.length >= 2) {
      expect(String(page.items[0].name).localeCompare(String(page.items[1].name), "en") >= 0).toBe(true)
    }
  })

  it("TOUR-209 filters by tag tokens and owner/lead", () => {
    const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    const lead = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    const rows: TourPortfolioRow[] = [
      {
        id: "1",
        org_id: ORG_A,
        name: "Tagged",
        status: "active",
        owner_user_id: owner,
        lead_user_id: lead,
        tags: [{ id: "t1", slug: "festival", label: "Festival" }],
      },
      {
        id: "2",
        org_id: ORG_A,
        name: "Other",
        status: "active",
        owner_user_id: lead,
        tags: [{ slug: "club" }],
      },
    ]
    const byTag = applyTourPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseTourPortfolioQuery({ tag: "festival" }),
    })
    expect(byTag.totalCount).toBe(1)
    expect(byTag.items[0].id).toBe("1")
    expect(byTag.filters.tag).toEqual(["festival"])

    const byOwner = applyTourPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseTourPortfolioQuery({ owner }),
    })
    expect(byOwner.totalCount).toBe(1)
    expect(byOwner.filters.owner).toBe(owner)

    const byLead = applyTourPortfolioQuery({
      rows,
      orgId: ORG_A,
      query: parseTourPortfolioQuery({ lead }),
    })
    expect(byLead.totalCount).toBe(1)
    expect(byLead.items[0].id).toBe("1")
  })
})
