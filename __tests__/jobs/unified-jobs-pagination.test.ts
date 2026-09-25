/**
 * SIM-20260922-WORK-005 regression suite — unified /api/jobs merge pagination.
 *
 * The unified board merges two sources (artist_jobs + job_posting_templates)
 * into one date-sorted list and slices it by page offset. The old merge-mode
 * fetch window was `Math.min(400, page * perPage * 3)` rows per source, so any
 * row past the capped window was unreachable even though unified_total promised
 * the uncapped DB counts. This suite proves that pages beyond the first fully
 * cover the reported totals with no duplicates or omissions — including skewed
 * distributions where one source front-runs the other by hundreds of rows.
 *
 * Harness: the route's Supabase query builders are faked with an in-memory
 * PostgREST-like client (range() slices the seeded table, count is the full
 * table length). ORG-008's org-identity resolution is mocked; the only files
 * under test are the route pagination path and its merge helpers.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/organizations/job-postings-identity", () => ({
  resolveOrganizationDisplayNames: vi.fn(async () => new Map<string, string>()),
}))

import { GET } from "@/app/api/jobs/route"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveOrganizationDisplayNames } from "@/lib/organizations/job-postings-identity"
import type { UnifiedJobListItem } from "@/lib/rebuild/unified-jobs-list"

const mockedCreateClient = vi.mocked(createClient)
const mockedServiceClient = vi.mocked(createServiceRoleClient)
const mockedResolveOrgNames = vi.mocked(resolveOrganizationDisplayNames)

const USER_ID = "10000000-0000-4000-8000-000000000001"

interface RangeCall {
  table: string
  from: number
  to: number
}

interface OrderCall {
  table: string
  column: string
  ascending: boolean
}

/** Minimal PostgREST-like builder: range() slices the seeded array, count
 *  reports the full table length regardless of the window (exact count).
 *  `applyOrder: true` also honours the .order() chain the way PostgREST does,
 *  so ordering regressions are observable; the default keeps the seeded order. */
function makeFakeSupabase(tables: Record<string, any[]>, options: { applyOrder?: boolean } = {}) {
  const rangeCalls: RangeCall[] = []
  const orderCalls: OrderCall[] = []
  const from = vi.fn((table: string) => {
    const rows = tables[table] ?? []
    const sorts: Array<{ column: string; ascending: boolean }> = []
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      in: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      order: vi.fn((column: string, opts?: { ascending?: boolean }) => {
        orderCalls.push({ table, column, ascending: opts?.ascending ?? true })
        sorts.push({ column, ascending: opts?.ascending ?? true })
        return chain
      }),
      range: vi.fn((fromIdx: number, toIdx: number) => {
        rangeCalls.push({ table, from: fromIdx, to: toIdx })
        const ordered = options.applyOrder
          ? [...rows].sort((a: any, b: any) => {
              for (const sort of sorts) {
                const av = a?.[sort.column]
                const bv = b?.[sort.column]
                if (av === bv) continue
                const cmp = av > bv ? 1 : -1
                return sort.ascending ? cmp : -cmp
              }
              return 0
            })
          : rows
        return {
          data: ordered.slice(fromIdx, toIdx + 1).map((row) => ({ ...row })),
          count: ordered.length,
          error: null,
        }
      }),
    }
    return chain
  })
  return { client: { from }, rangeCalls, orderCalls }
}

function artistRows(count: number, newestMs: number, stepMs: number): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `artist-${i}`,
    title: `Artist Gig ${i}`,
    description: null,
    location: `City ${i}`,
    status: "open",
    created_at: new Date(newestMs - i * stepMs).toISOString(),
    priority: "normal",
  }))
}

function venueRows(count: number, newestMs: number, stepMs: number, overrides: any = {}): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `venue-${i}`,
    title: `Venue Job ${i}`,
    description: null,
    location: `Venue City ${i}`,
    status: "published",
    employer_entity_type: "venue",
    venue: { name: `Venue ${i}` },
    created_at: new Date(newestMs - i * stepMs).toISOString(),
    ...overrides,
  }))
}

function orgOwnedRows(count: number, newestMs: number, stepMs: number): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `org-job-${i}`,
    title: `Org Job ${i}`,
    description: null,
    location: `Org City ${i}`,
    status: "published",
    employer_entity_type: "organization",
    employer_entity_id: "org-1",
    venue: null,
    created_at: new Date(newestMs - i * stepMs).toISOString(),
  }))
}

const MINUTE = 60_000
const BASE = Date.parse("2026-09-01T12:00:00.000Z")

async function pageRequest(page: number, perPage = 20, extra = "") {
  return GET(
    new Request(`http://localhost/api/jobs?merge=1&page=${page}&per_page=${perPage}${extra}`) as any
  )
}

async function unifiedPage(
  page: number,
  perPage = 20,
  extra = ""
): Promise<{
  rows: UnifiedJobListItem[]
  total: number
  page: number
  per_page: number
}> {
  const response = await pageRequest(page, perPage, extra)
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.success).toBe(true)
  return {
    rows: body.data?.unified ?? [],
    total: Number(body.data?.unified_total ?? 0),
    page: Number(body.data?.unified_page),
    per_page: Number(body.data?.unified_per_page),
  }
}

describe("GET /api/jobs unified merge pagination (SIM-20260922-WORK-005)", () => {
  beforeEach(() => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    } as any)
    mockedResolveOrgNames.mockResolvedValue(new Map<string, string>())
  })

  it("reaches every row across all pages when one source front-runs the other by more than the old 400-row cap", async () => {
    // Artist owns the newest 250 rows; venue posts 250 rows strictly older.
    // 500 reported rows at per_page=20 => page 21 needs rows 400..419, which
    // the old `Math.min(400, page * perPage * 3)` window could never serve.
    const tables = {
      artist_jobs: artistRows(250, BASE, MINUTE),
      job_posting_templates: venueRows(250, BASE - 250 * MINUTE, MINUTE),
    }
    const { client, rangeCalls } = makeFakeSupabase(tables)
    mockedServiceClient.mockReturnValue(client as any)

    const seen = new Set<string>()
    let pages = 0
    for (let page = 1; page <= 25; page++) {
      const { rows, total, per_page } = await unifiedPage(page)
      expect(total).toBe(500)
      pages++
      rows.forEach((row) => {
        expect(seen.has(row.id)).toBe(false)
        seen.add(row.id)
      })
      // 500 rows at per_page=20 => exactly 25 full pages.
      expect(rows).toHaveLength(per_page)
      // Strong skew: rows 0..249 are all artist, 250..499 all venue, so
      // pages 1..13 lead with artist and pages 14+ lead with venue.
      expect(rows[0].source).toBe(page <= 13 ? "artist" : "venue")
    }

    // Page 21+, the regression slice, actually returns venue rows.
    expect(pages).toBe(25)
    expect(seen.size).toBe(500)
    const page21 = await unifiedPage(21)
    expect(page21.rows).toHaveLength(20)
    expect(page21.rows.every((row) => row.source === "venue")).toBe(true)

    // Every window is derived from the page offset (to == page * perPage - 1),
    // never an arbitrary cap.
    const lastArtistWindow = rangeCalls.filter((c) => c.table === "artist_jobs").at(-1)
    const lastVenueWindow = rangeCalls.filter((c) => c.table === "job_posting_templates").at(-1)
    expect(lastArtistWindow?.to).toBe(21 * 20 - 1)
    expect(lastVenueWindow?.to).toBe(21 * 20 - 1)
  })

  it("keeps pages contiguous and duplicate-free when both sources interleave", async () => {
    // Timeline a0, v0, a1, v1, ... a39, v39 (artist newest at each pair).
    const tables = {
      artist_jobs: artistRows(40, BASE, 2 * MINUTE),
      job_posting_templates: venueRows(40, BASE - MINUTE, 2 * MINUTE),
    }
    const { client } = makeFakeSupabase(tables)
    mockedServiceClient.mockReturnValue(client as any)

    const seen = new Set<string>()
    let previousLast: UnifiedJobListItem | null = null
    for (let page = 1; page <= 4; page++) {
      const { rows, total } = await unifiedPage(page)
      expect(total).toBe(80)
      expect(rows).toHaveLength(20)
      rows.forEach((row) => {
        expect(seen.has(row.id)).toBe(false)
        seen.add(row.id)
      })
      if (previousLast) {
        // Contiguity: every row of page p is newer than every row of page p+1.
        expect(previousLast.created_at >= rows[0].created_at).toBe(true)
      }
      previousLast = rows[rows.length - 1]
    }

    // Interleaving is exact: a0 v0 a1 v1 ...
    const page1 = await unifiedPage(1)
    const sources = page1.rows.map((row) => row.source)
    expect(sources).toEqual(
      Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "artist" : "venue"))
    )
    expect(seen.size).toBe(80)
  })

  it("resolves equal-timestamp rows deterministically without dropping or duplicating", async () => {
    // 20 artist + 20 venue share one created_at; stable merge keeps the
    // artist bucket first so page 1 = 20 artist rows and page 2 = 20 venue rows.
    const tables = {
      artist_jobs: artistRows(20, BASE, 0).map((row) => ({ ...row, created_at: new Date(BASE).toISOString() })),
      job_posting_templates: venueRows(20, BASE, 0).map((row) => ({ ...row, created_at: new Date(BASE).toISOString() })),
    }
    const { client } = makeFakeSupabase(tables)
    mockedServiceClient.mockReturnValue(client as any)

    const seen = new Set<string>()
    const page1 = await unifiedPage(1)
    const page2 = await unifiedPage(2)
    expect(page1.total).toBe(40)
    expect(page1.rows).toHaveLength(20)
    expect(page2.rows).toHaveLength(20)
    expect(page1.rows.every((row) => row.source === "artist")).toBe(true)
    expect(page2.rows.every((row) => row.source === "venue")).toBe(true)
    ;[...page1.rows, ...page2.rows].forEach((row) => {
      expect(seen.has(row.id)).toBe(false)
      seen.add(row.id)
    })
    expect(seen.size).toBe(40)
  })

  it("derives merge fetch windows from the page offset on every page", async () => {
    const tables = {
      artist_jobs: artistRows(600, BASE, MINUTE),
      job_posting_templates: venueRows(600, BASE - 600 * MINUTE, MINUTE),
    }
    const { client, rangeCalls } = makeFakeSupabase(tables)
    mockedServiceClient.mockReturnValue(client as any)

    for (const [page, perPage] of [
      [1, 20],
      [2, 50],
      [5, 20],
      [10, 50],
    ] as const) {
      rangeCalls.length = 0
      const { total } = await unifiedPage(page, perPage)
      expect(total).toBe(1200)
      const artistWindows = rangeCalls.filter((c) => c.table === "artist_jobs")
      const venueWindows = rangeCalls.filter((c) => c.table === "job_posting_templates")
      expect(artistWindows.filter((c) => c.to === page * perPage - 1)).toHaveLength(1)
      expect(venueWindows.filter((c) => c.to === page * perPage - 1)).toHaveLength(1)
      expect(artistWindows.some((c) => c.to > page * perPage - 1)).toBe(false)
      expect(venueWindows.some((c) => c.to > page * perPage - 1)).toBe(false)
    }
  })

  it("keeps ORG-008 organization identity attached to merged rows across pages", async () => {
    // 30 venue rows: 3 org-owned (employer_entity_type='organization') + 27
    // venue-owned, 30 artist rows => 60 total. Org rows must page through with
    // the resolved org display name and the correct source badge.
    const orgRows = orgOwnedRows(3, BASE, MINUTE)
    const venueOwned = venueRows(27, BASE - 3 * MINUTE, MINUTE)
    const tables = {
      artist_jobs: artistRows(30, BASE - 30 * MINUTE, MINUTE),
      job_posting_templates: [...orgRows, ...venueOwned],
    }
    mockedResolveOrgNames.mockResolvedValue(new Map([["org-1", "Acme Org"]]))
    const { client } = makeFakeSupabase(tables)
    mockedServiceClient.mockReturnValue(client as any)

    const seen = new Set<string>()
    let orgRowsSeen = 0
    for (let page = 1; page <= 3; page++) {
      const { rows, total } = await unifiedPage(page)
      expect(total).toBe(60)
      rows.forEach((row) => {
        expect(seen.has(row.id)).toBe(false)
        seen.add(row.id)
        if (row.id.startsWith("org-job-")) {
          expect(row.source).toBe("organization")
          expect(row.organization_name).toBe("Acme Org")
          orgRowsSeen++
        }
      })
    }
    expect(seen.size).toBe(60)
    expect(orgRowsSeen).toBe(3)
    // attachOrganizationIdentity ran server-side (ORG-008 preserved).
    expect(mockedResolveOrgNames).toHaveBeenCalled()
  })
})

/**
 * Merge-key alignment. The unified list is `mergeUnifiedJobsByDate` = created_at
 * DESC, so a merge-mode per-source window of `page * perPage` rows only covers
 * the page when the source query is ordered by that same key. Before the fix the
 * artist source honoured `sort_by`/`sort_order`, so `?merge=1&sort_by=title`
 * fetched the alphabetically-newest rows and served a page the date-ordered
 * merge never produced — the newest listing was simply missing (the same
 * truncation defect as the old 400-row cap, one layer down).
 */
describe("GET /api/jobs merge-mode ordering (SIM-20260922-WORK-005)", () => {
  beforeEach(() => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    } as any)
    mockedResolveOrgNames.mockResolvedValue(new Map<string, string>())
  })

  it("serves the newest listing on page 1 even when the caller passes a non-merge sort key", async () => {
    // 40 artist rows. The newest row is alphabetically FIRST, so a source query
    // ordered by title DESC (the pre-fix behaviour) would fetch a window that
    // excludes it and the date-ordered merge would never show it.
    const rows = artistRows(40, BASE, MINUTE)
    const newest = rows[0]
    newest.title = "Aaa Newest Gig"
    const tables = { artist_jobs: rows, job_posting_templates: [] }
    const { client } = makeFakeSupabase(tables, { applyOrder: true })
    mockedServiceClient.mockReturnValue(client as any)

    const { rows: page1, total } = await unifiedPage(1, 20, "&sort_by=title")
    expect(total).toBe(40)
    expect(page1).toHaveLength(20)
    expect(page1[0].id).toBe(newest.id)
    // …and the whole merged set is still reachable, newest first.
    const { rows: page2 } = await unifiedPage(2, 20, "&sort_by=title")
    const ids = [...page1, ...page2].map((row) => row.id)
    expect(new Set(ids).size).toBe(40)
    expect(ids[0]).toBe(newest.id)
  })

  it("pins both merge-mode sources to the merge key and leaves non-merge sorting alone", async () => {
    const tables = {
      artist_jobs: artistRows(5, BASE, MINUTE),
      job_posting_templates: venueRows(5, BASE, MINUTE),
    }

    const mergeOrdered = makeFakeSupabase(tables, { applyOrder: true })
    mockedServiceClient.mockReturnValue(mergeOrdered.client as any)
    await unifiedPage(1, 20, "&sort_by=title&sort_order=asc")
    for (const table of ["artist_jobs", "job_posting_templates"]) {
      const calls = mergeOrdered.orderCalls.filter((c) => c.table === table)
      expect(calls).toEqual([
        { table, column: "created_at", ascending: false },
        { table, column: "id", ascending: false },
      ])
    }

    // Without merge=1 the documented per-source sort contract is unchanged.
    const plainOrdered = makeFakeSupabase(tables, { applyOrder: true })
    mockedServiceClient.mockReturnValue(plainOrdered.client as any)
    const response = await GET(
      new Request("http://localhost/api/jobs?sort_by=title&sort_order=asc") as any
    )
    expect(response.status).toBe(200)
    expect(plainOrdered.orderCalls.filter((c) => c.table === "artist_jobs")).toEqual([
      { table: "artist_jobs", column: "title", ascending: true },
    ])
  })

  it("pages shared-timestamp rows deterministically with the id tiebreak", async () => {
    // Both sources share one created_at. Without a deterministic per-source
    // tiebreak the window boundary between page 1 and page 2 is arbitrary and
    // rows can be duplicated or dropped across pages.
    const shared = new Date(BASE).toISOString()
    const tables = {
      artist_jobs: artistRows(20, BASE, 0).map((row) => ({ ...row, created_at: shared })),
      job_posting_templates: venueRows(20, BASE, 0).map((row) => ({ ...row, created_at: shared })),
    }
    const { client } = makeFakeSupabase(tables, { applyOrder: true })
    mockedServiceClient.mockReturnValue(client as any)

    const first = await unifiedPage(1, 20)
    const again = await unifiedPage(1, 20)
    const second = await unifiedPage(2, 20)
    expect(first.total).toBe(40)
    expect(first.rows.map((row) => row.id)).toEqual(again.rows.map((row) => row.id))
    expect(first.rows.every((row) => row.source === "artist")).toBe(true)
    expect(second.rows.every((row) => row.source === "venue")).toBe(true)
    const ids = [...first.rows, ...second.rows].map((row) => row.id)
    expect(new Set(ids).size).toBe(40)
  })
})