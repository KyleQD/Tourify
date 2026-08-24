import { describe, expect, it } from "vitest"

import { composeWorldPlaceV2 } from "@/lib/world/place-api-v2/compose"

const input = {
  identity: {
    key: "detroit" as const,
    canonicalPath: "us/mi/detroit",
    name: "Detroit",
    countryName: "United States",
    center: { lat: 42.33, lng: -83.05 },
  },
  musicalIdentity: "Motown meets techno.",
  curatedSections: {
    fromHere: [
      { seed_id: "a1", entity_type: "artist_reference", canonical_name: "Juan Atkins" },
      { seed_id: "g1", entity_type: "genre", canonical_name: "Techno" },
    ],
    historyHere: [
      { seed_id: "h1", entity_type: "historical_milestone", canonical_name: "Motown founded", start_year: 1959 },
    ],
  },
  sourceRefs: [{ key: "detroit_historical_motown", name: "Detroit Historical Society" }],
  provenance: {
    fromHere: { sourceKeys: ["detroit_historical_motown"], lastReviewedAt: null },
  },
  claimsWithEvidence: 66,
  totalClaims: 66,
}

describe("World Place API v2 composition (P10)", () => {
  it("produces a bounded, cacheable world-place-v2.0 response", () => {
    const result = composeWorldPlaceV2(input)
    expect(result.schemaVersion).toBe("world-place-v2.0")
    expect(result.identity.name).toBe("Detroit")
    expect(result.overview.musicalIdentity).toBe("Motown meets techno.")
    expect(result.cache.etag).toMatch(/^"/)
    expect(result.cache.invalidationKeys).toContain("place:us/mi/detroit")
  })

  it("sections respect configured limits (P10-T04/T05)", () => {
    const bigInput = {
      ...input,
      curatedSections: {
        fromHere: Array.from({ length: 30 }, (_, i) => ({
          seed_id: `a${i}`, entity_type: "artist_reference", canonical_name: `Artist ${i}`,
        })),
        historyHere: Array.from({ length: 30 }, (_, i) => ({
          seed_id: `h${i}`, entity_type: "historical_milestone", canonical_name: `Event ${i}`,
        })),
      },
    }
    const result = composeWorldPlaceV2(bigInput)
    expect(result.artists.items.length).toBeLessThanOrEqual(12)
    expect(result.history.items.length).toBeLessThanOrEqual(20)
  })

  it("trust metadata reflects evidence coverage", () => {
    const result = composeWorldPlaceV2(input)
    expect(result.trust.claimsWithEvidence).toBe(66)
    expect(result.trust.totalClaims).toBe(66)
    expect(result.trust.sourcesCount).toBe(1)
  })

  it("playback summary never exposes stream URLs", () => {
    const result = composeWorldPlaceV2(input)
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("stream_url")
    expect(serialized).not.toContain("sourceUrl")
  })

  it("live slice is additive and optional", () => {
    const withLive = composeWorldPlaceV2({
      ...input,
      liveSlice: { artists: [{ id: "x", name: "Live Artist" }], venues: [], events: [], music: [] },
    })
    expect(withLive.schemaVersion).toBe("world-place-v2.0")
  })

  it("ETag changes when signals change (cache invalidation)", () => {
    const base = composeWorldPlaceV2(input)
    const withSignal = composeWorldPlaceV2({
      ...input,
      signals: [{ signalKind: "artist_popularity", value: 42 }],
    })
    expect(base.cache.etag).not.toBe(withSignal.cache.etag)
  })
})
