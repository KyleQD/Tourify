import { describe, expect, it } from "vitest"

import {
  applyReleaseInheritance,
  canExposeMusicGeography,
  validateMusicGeoFact,
  type GeoFactValue,
} from "@/lib/world/projections/music"

const fact = (placeId: string): GeoFactValue => ({ placeId, origin: "creator_entered" })

describe("P7 music geography", () => {
  it("T02: accepts explicit creator-entered facts for all four relations", () => {
    for (const relationKey of ["recorded_in", "written_in", "produced_in", "released_from"] as const) {
      expect(() =>
        validateMusicGeoFact({ entityKind: "track", entityId: "t1", relationKey, placeId: "p1", origin: "creator_entered" }),
      ).not.toThrow()
    }
  })

  it("T03: artist base location can NEVER seed a music fact", () => {
    expect(() =>
      validateMusicGeoFact(
        { entityKind: "track", entityId: "t1", relationKey: "recorded_in", placeId: "artist-base", origin: "creator_entered" },
        { isArtistBasePlace: true },
      ),
    ).toThrow(/artist base/)
  })

  it("rejects unknown relations and unsupported origins", () => {
    expect(() =>
      validateMusicGeoFact({ entityKind: "track", entityId: "t1", relationKey: "vibed_in", placeId: "p1", origin: "creator_entered" }),
    ).toThrow(/unknown music relation/)
    expect(() =>
      validateMusicGeoFact({ entityKind: "track", entityId: "t1", relationKey: "recorded_in", placeId: "p1", origin: "guessed" as never }),
    ).toThrow(/unsupported origin/)
  })

  it("T04: track-explicit wins; missing keys inherit from release with a visible flag", () => {
    const merged = applyReleaseInheritance(
      { recorded_in: fact("studio-place") },
      { recorded_in: fact("release-studio"), released_from: fact("release-city") },
    )
    expect(merged.recorded_in).toEqual({ placeId: "studio-place", origin: "creator_entered", inheritedFromRelease: false })
    expect(merged.released_from).toMatchObject({ placeId: "release-city", inheritedFromRelease: true })
    expect(merged.written_in).toBeUndefined()
  })

  it("T06: public exposure requires published + approved moderation", () => {
    expect(canExposeMusicGeography("published", "approved")).toBe(true)
    expect(canExposeMusicGeography("draft", "approved")).toBe(false)
    expect(canExposeMusicGeography("published", "pending")).toBe(false)
    expect(canExposeMusicGeography("published", "rejected")).toBe(false)
    expect(canExposeMusicGeography("retired", "approved")).toBe(false)
  })
})
