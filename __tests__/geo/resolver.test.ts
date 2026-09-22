import { describe, expect, it, vi } from "vitest"

import type { GeoRepository } from "@/lib/geo/repository"
import type {
  GeoPlaceRow,
  ResolvePlaceInput,
} from "@/lib/geo/types"
import { resolvePlace, resolvePlacesBatch } from "@/lib/geo/resolver"

function place(overrides: Partial<GeoPlaceRow>): GeoPlaceRow {
  return {
    id: "id-" + Math.random().toString(36).slice(2),
    slug: overrides.slug ?? "slug",
    canonical_path: overrides.canonical_path ?? "x/slug",
    name: overrides.name ?? "Place",
    display_name: null,
    place_type: overrides.place_type ?? "city",
    parent_place_id: null,
    country_code: overrides.country_code ?? null,
    admin1_code: overrides.admin1_code ?? null,
    timezone: null,
    publication_status: overrides.publication_status ?? "published",
    center: null,
    ...overrides,
  }
}

function fakeRepo(overrides: Partial<GeoRepository> = {}): GeoRepository {
  return {
    findByExternalReference: vi.fn().mockResolvedValue(null),
    findHierarchyCandidates: vi.fn().mockResolvedValue([]),
    findExactAlias: vi.fn().mockResolvedValue([]),
    findNearbyCandidates: vi.fn().mockResolvedValue([]),
    findTextCandidates: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe("geo resolver", () => {
  it("resolves an exact external id to the canonical place", async () => {
    const austin = place({ name: "Austin", canonical_path: "us/texas/austin", country_code: "US" })
    const repo = fakeRepo({
      findByExternalReference: vi.fn().mockResolvedValue(austin),
    })
    const result = await resolvePlace(
      { externalReferences: [{ provider: "wikidata", externalId: "Q16559" }] },
      repo
    )
    expect(result.matchMethod).toBe("external_id")
    expect(result.placeId).toBe(austin.id)
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
    expect(result.needsReview).toBe(false)
  })

  it("keeps same-name cities ambiguous without context but resolves with country context", async () => {
    const springfields = [
      place({ name: "Springfield", canonical_path: "us/il/springfield", country_code: "US" }),
      place({ name: "Springfield", canonical_path: "us/mo/springfield", country_code: "US" }),
    ]
    const repo = fakeRepo({
      findHierarchyCandidates: vi.fn().mockResolvedValue(springfields),
    })
    const ambiguous = await resolvePlace({ hierarchy: { city: "Springfield" } }, repo)
    expect(ambiguous.placeId).toBeNull()
    expect(ambiguous.candidates.length).toBe(2)

    const unique = place({ name: "Springfield", canonical_path: "gb/eng/springfield", country_code: "GB" })
    const contextual = await resolvePlace(
      { hierarchy: { city: "Springfield", countryCode: "GB" } },
      fakeRepo({ findHierarchyCandidates: vi.fn().mockResolvedValue([unique]) })
    )
    expect(contextual.placeId).toBe(unique.id)
    expect(contextual.matchMethod).toBe("hierarchy_exact")
  })

  it("resolves a historical/local alias exactly once", async () => {
    const bristol = place({ name: "Bristol", canonical_path: "gb/eng/bristol" })
    const repo = fakeRepo({
      findExactAlias: vi.fn().mockResolvedValue([bristol]),
    })
    const result = await resolvePlace({ freeText: "Bristow" }, repo)
    expect(result.matchMethod).toBe("alias_exact")
    expect(result.placeId).toBe(bristol.id)
  })

  it("rejects invalid and swapped coordinates instead of guessing", async () => {
    const repo = fakeRepo()
    for (const coordinates of [
      { latitude: 91, longitude: 0 },
      { latitude: 200, longitude: -97 },
      { latitude: Number.NaN, longitude: 10 },
    ]) {
      const result = await resolvePlace({ coordinates }, repo)
      expect(result.placeId).toBeNull()
    }
    expect(repo.findNearbyCandidates).not.toHaveBeenCalled()
  })

  it("leaves rural coordinate-only input unresolved with diagnostics", async () => {
    const result = await resolvePlace(
      { coordinates: { latitude: 37.2431, longitude: -115.7930 } },
      fakeRepo()
    )
    expect(result.placeId).toBeNull()
    expect(result.matchMethod).toBe("unresolved")
    expect(result.needsReview).toBe(true)
  })

  it("returns candidates, never an invented place, for ambiguous free text", async () => {
    const rows = [place({ name: "Paris" }), place({ name: "Paris, TX" })]
    const result = await resolvePlace(
      { freeText: "paris" },
      fakeRepo({ findTextCandidates: vi.fn().mockResolvedValue(rows) })
    )
    // A single exact name match without context is a review candidate only:
    // placeId stays null and the row can never auto-persist.
    expect(result.placeId).toBeNull()
    expect(result.matchMethod).toBe("text_exact")
    expect(result.needsReview).toBe(true)
    expect(result.candidates.length).toBeGreaterThanOrEqual(1)
  })

  it("filters visibility-lax repositories so drafts never leak publicly", async () => {
    const lax = fakeRepo({
      findTextCandidates: vi.fn().mockResolvedValue([
        place({ name: "Atlantis", publication_status: "draft" }),
        place({ name: "Aztlan" }),
      ]),
    })
    const result = await resolvePlace({ freeText: "atlantis" }, lax)
    expect(result.candidates.every((candidate) => candidate.name !== "Atlantis")).toBe(true)
  })

  it("excludes draft places from public resolution by default", async () => {
    const repo = fakeRepo({
      findHierarchyCandidates: vi.fn().mockResolvedValue([
        place({ name: "Atlantis", publication_status: "draft" }),
      ]),
    })
    const result = await resolvePlace({ hierarchy: { city: "Atlantis" } }, repo)
    expect(repo.findHierarchyCandidates).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeDraft: false })
    )
    // Defense in depth: even a lax repository must not leak drafts publicly.
    expect(result.placeId).toBeNull()
    expect(result.candidates.length).toBe(0)
  })

  it("honors includeDraft only as an explicit server-side parameter", async () => {
    const draft = place({ name: "Atlantis", publication_status: "draft" })
    const repo = fakeRepo({
      findHierarchyCandidates: vi.fn().mockResolvedValue([draft]),
    })
    const input: ResolvePlaceInput = { hierarchy: { city: "Atlantis" }, includeDraft: true }
    const result = await resolvePlace(input, repo)
    expect(repo.findHierarchyCandidates).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeDraft: true })
    )
    expect(result.placeId).toBe(draft.id)
  })

  it("deduplicates identical inputs in the batch path", async () => {
    const spy = vi.fn().mockResolvedValue([])
    const repo = fakeRepo({ findHierarchyCandidates: spy })
    const input: ResolvePlaceInput = { hierarchy: { city: "Austin", countryCode: "US" } }
    const results = await resolvePlacesBatch([input, { ...input }, { ...input }], repo)
    expect(results.length).toBe(3)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
