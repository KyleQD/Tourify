import { describe, expect, it } from "vitest"

import { buildGlobeIndex, GLOBE_SCHEMA_VERSION } from "@/lib/world/globe/build-globe-index"

describe("world globe index", () => {
  const index = buildGlobeIndex()

  it("carries the renderer-neutral schema version", () => {
    expect(index.schemaVersion).toBe(GLOBE_SCHEMA_VERSION)
  })

  it("includes all ten pilots with coordinates — original five in stable relative order (P18-T08)", () => {
    const keys = index.places.map((place) => place.key)
    expect(keys).toHaveLength(10)
    // Contract order: sorted by canonical path. The original five keep their
    // relative order regardless of Wave-2 expansion (regression fixture).
    const originalFiveRelativeOrder = ["london", "kingston", "tokyo", "lagos", "detroit"]
    let last = -1
    for (const key of originalFiveRelativeOrder) {
      const at = keys.indexOf(key)
      expect(at).toBeGreaterThan(last)
      last = at
    }
    // Wave-2 regions are present.
    for (const key of ["new-orleans", "bronx", "chicago", "havana", "rio-de-janeiro"]) {
      expect(keys).toContain(key)
    }
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
