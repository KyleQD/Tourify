import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { buildJobDetailHref } from "@/lib/jobs/job-detail-href"
import {
  mapArtistJobToUnified,
  mapVenueTemplateToUnified,
  mergeUnifiedJobsByDate,
} from "@/lib/rebuild/unified-jobs-list"

const ARTIST_ID = "11111111-1111-4111-8111-111111111111"
const VENUE_ID = "22222222-2222-4222-8222-222222222222"

const root = process.cwd()
function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("buildJobDetailHref", () => {
  it("prefers an explicit detail_href when provided", () => {
    expect(
      buildJobDetailHref({ id: ARTIST_ID, source: "venue", detailHref: `/jobs/${ARTIST_ID}?source=artist` })
    ).toBe(`/jobs/${ARTIST_ID}?source=artist`)
  })

  it("emits a source-tagged url for a resolvable id", () => {
    expect(buildJobDetailHref({ id: ARTIST_ID, source: "artist" })).toBe(`/jobs/${ARTIST_ID}?source=artist`)
    expect(buildJobDetailHref({ id: VENUE_ID, source: "venue" })).toBe(`/jobs/${VENUE_ID}?source=venue`)
  })

  it("prefers template_id over the raw id", () => {
    expect(buildJobDetailHref({ id: "board-123", templateId: VENUE_ID, source: "venue" })).toBe(
      `/jobs/${VENUE_ID}?source=venue`
    )
  })

  it("defaults an unknown source to venue", () => {
    expect(buildJobDetailHref({ id: VENUE_ID })).toBe(`/jobs/${VENUE_ID}?source=venue`)
  })

  it("returns null for unresolvable ids so callers can hide the link", () => {
    expect(buildJobDetailHref({ id: "not-a-uuid", source: "venue" })).toBeNull()
    expect(buildJobDetailHref({ id: null })).toBeNull()
    expect(buildJobDetailHref({ id: undefined })).toBeNull()
  })
})

describe("unified jobs mapping", () => {
  it("produces resolvable, source-tagged detail hrefs for both sources", () => {
    const artist = mapArtistJobToUnified({
      id: ARTIST_ID,
      title: "Guitarist",
      description: null,
      location: "Austin",
      created_at: "2026-06-01T00:00:00.000Z",
    })
    const venue = mapVenueTemplateToUnified({
      id: VENUE_ID,
      title: "Stagehand",
      description: null,
      location: "Dallas",
      created_at: "2026-06-02T00:00:00.000Z",
    })

    expect(artist.detail_href).toBe(`/jobs/${ARTIST_ID}?source=artist`)
    expect(venue.detail_href).toBe(`/jobs/${VENUE_ID}?source=venue`)
    // Both must resolve through the canonical helper.
    expect(buildJobDetailHref({ id: artist.id, source: artist.source, detailHref: artist.detail_href })).toBe(
      artist.detail_href
    )
    expect(buildJobDetailHref({ id: venue.id, source: venue.source, detailHref: venue.detail_href })).toBe(
      venue.detail_href
    )
  })

  it("merges listings newest-first across sources", () => {
    const older = mapArtistJobToUnified({
      id: ARTIST_ID,
      title: "Older",
      description: null,
      location: null,
      created_at: "2026-06-01T00:00:00.000Z",
    })
    const newer = mapVenueTemplateToUnified({
      id: VENUE_ID,
      title: "Newer",
      description: null,
      location: null,
      created_at: "2026-06-05T00:00:00.000Z",
    })

    const merged = mergeUnifiedJobsByDate([older], [newer])
    expect(merged.map((row) => row.title)).toEqual(["Newer", "Older"])
  })
})

describe("jobs flow route contracts", () => {
  it("keeps /api/jobs merged totals from DB counts and self-heals unresolvable rows", () => {
    const source = read("app/api/jobs/route.ts")
    expect(source).toContain("unified_total = (artistCount ?? 0) + (staffCount ?? 0)")
    expect(source).toContain("Boolean(item.id) && Boolean(item.title)")
  })

  it("resolves artist detail params with async params access", () => {
    const source = read("app/api/artist-jobs/[id]/route.ts")
    expect(source).toContain("await context.params")
    expect(source).not.toContain("{ params }: any")
  })

  it("makes the detail page fall back across sources", () => {
    const source = read("app/jobs/[id]/page.tsx")
    expect(source).toContain("sourceParam === 'artist' ? [tryArtist, tryVenue] : [tryVenue, tryArtist]")
  })

  it("uses consistent active-state error semantics on apply routes", () => {
    const venueApply = read("app/api/job-applications/route.ts")
    expect(venueApply).toContain("This job posting is not accepting applications.")
    expect(venueApply).toContain("This job posting no longer exists.")

    const artistApply = read("app/api/artist-jobs/[id]/applications/route.ts")
    expect(artistApply).toContain("This job posting is not accepting applications.")
    expect(artistApply).toContain("This job posting no longer exists.")
  })

  it("emits source-tagged share urls", () => {
    const share = read("app/api/posts/share/route.ts")
    expect(share).toContain("?source=artist")
    expect(share).toContain("?source=venue")
  })
})
