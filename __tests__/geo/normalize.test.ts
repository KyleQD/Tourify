import { describe, expect, it } from "vitest"

import {
  normalizeCountryCode,
  normalizeHierarchy,
  normalizeSearchKey,
  normalizeWhitespace,
  validateCoordinates,
} from "@/lib/geo/normalize"

describe("geo normalize", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeWhitespace("  Austin   TX ")).toBe("Austin TX")
    expect(normalizeWhitespace("   ")).toBeNull()
    expect(normalizeWhitespace(null)).toBeNull()
  })

  it("folds diacritics for search keys while callers retain originals", () => {
    expect(normalizeSearchKey("  Cañón   City ")).toBe("canon city")
    expect(normalizeSearchKey("München")).toBe("munchen")
  })

  it("normalizes country codes to uppercase alpha-2 or null", () => {
    expect(normalizeCountryCode("us")).toBe("US")
    expect(normalizeCountryCode(" De ")).toBe("DE")
    expect(normalizeCountryCode("USA")).toBeNull()
    expect(normalizeCountryCode("1")).toBeNull()
    expect(normalizeCountryCode(null)).toBeNull()
  })

  it("validates coordinates and rejects out-of-range input", () => {
    expect(validateCoordinates({ latitude: 30.2672, longitude: -97.7431 })).toEqual({
      latitude: 30.2672,
      longitude: -97.7431,
    })
    expect(validateCoordinates({ latitude: 91, longitude: 0 })).toBeNull()
    expect(validateCoordinates({ latitude: 0, longitude: 181 })).toBeNull()
    expect(validateCoordinates({ latitude: Number.NaN, longitude: 0 })).toBeNull()
  })

  it("rejects swapped coordinate pairs instead of silently correcting them", () => {
    // longitude in the latitude slot (e.g. 200) must be rejected, not swapped.
    expect(validateCoordinates({ latitude: 200, longitude: -97 })).toBeNull()
    // A valid pair passes through with latitude first, never reordered.
    const result = validateCoordinates({ latitude: -33.8688, longitude: 151.2093 })
    expect(result).toEqual({ latitude: -33.8688, longitude: 151.2093 })
  })

  it("drops empty hierarchies and preserves provided fields", () => {
    expect(normalizeHierarchy({ city: "  Kyoto ", countryCode: "jp" })).toEqual({
      neighborhood: null,
      city: "Kyoto",
      admin1: null,
      country: null,
      countryCode: "JP",
    })
    expect(normalizeHierarchy({ neighborhood: " " })).toBeNull()
  })
})
