import { describe, expect, it } from "vitest"

import { buildGlobeIndex, GLOBE_SCHEMA_VERSION } from "@/lib/world/globe/build-globe-index"

describe("world globe index", () => {
  const index = buildGlobeIndex()

  it("carries the renderer-neutral schema version", () => {
    expect(index.schemaVersion).toBe(GLOBE_SCHEMA_VERSION)
  })

  it("includes exactly the five promoted pilots with coordinates", () => {
    // Contract order: sorted by canonical path.
    expect(index.places.map((place) => place.key)).toEqual([
      "london",   // gb/eng/london
      "kingston", // jm/kingston
      "tokyo",    // jp/tokyo
      "lagos",    // ng/lagos
      "detroit",  // us/mi/detroit
    ])
    for (const place of index.places) {
      expect(Number.isFinite(place.center.lat)).toBe(true)
      expect(Number.isFinite(place.center.lng)).toBe(true)
    }
  })

  it("derives positive counts and a stable weight ordering signal", () => {
    const detroit = index.places.find((place) => place.key === "detroit")!
    expect(detroit.counts.artists).toBeGreaterThan(0)
    expect(detroit.counts.recordings).toBeGreaterThan(0)
    expect(detroit.weight).toBeGreaterThan(0)
    // Deterministic order (sorted by canonical path) across calls.
    expect(buildGlobeIndex().places.map((place) => place.canonicalPath)).toEqual(
      index.places.map((place) => place.canonicalPath),
    )
  })

  it("attaches a musical identity line for every pilot", () => {
    for (const place of index.places) {
      expect(place.musicalIdentity).toBeTruthy()
    }
  })
})
