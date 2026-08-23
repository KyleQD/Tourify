import {
  VENUE_AMENITY_KEYS,
  amenitiesFromLegacyObject,
  amenityLabel,
  hasAmenity,
  legacyObjectFromAmenities,
  normalizeAmenityKey,
  normalizeVenueTypeLabels,
  parseOperationalPolicies,
  readCanonicalLocation,
  reconcileAmenities,
} from "../settings-shapes"

describe("normalizeVenueTypeLabels (VEN-248)", () => {
  it("matches taxonomy case-insensitively and trims", () => {
    expect(normalizeVenueTypeLabels(["  club ", "CONCERT HALL"])).toEqual([
      "Club",
      "Concert Hall",
    ])
  })

  it("dedupes after normalization", () => {
    expect(normalizeVenueTypeLabels(["Club", "club", " CLUB"])).toEqual(["Club"])
  })

  it("preserves unknown legacy labels as-is (trimmed)", () => {
    expect(normalizeVenueTypeLabels(["Speakeasy", "bar"])).toEqual([
      "Speakeasy",
      "Bar",
    ])
  })

  it("drops non-string and empty entries", () => {
    expect(normalizeVenueTypeLabels([null, "", 42, "Club"])).toEqual(["Club"])
  })

  it("returns empty for non-array input", () => {
    expect(normalizeVenueTypeLabels(null)).toEqual([])
  })
})

describe("amenities normalization (VEN-247)", () => {
  it("folds legacy boolean objects onto canonical keys, truthy only", () => {
    expect(
      amenitiesFromLegacyObject({
        sound_system: true,
        accessible: true,
        wifi: false,
        parking: "true",
        stage: 1,
      }),
    ).toEqual(["sound_system", "ada_accessible", "parking", "stage"])
  })

  it("normalizes display-label forms to canonical keys", () => {
    expect(normalizeAmenityKey("Wi-Fi")).toBe("wifi")
    expect(normalizeAmenityKey("ADA Accessible")).toBe("ada_accessible")
    expect(normalizeAmenityKey("Full Bar")).toBe("bar_service")
    expect(normalizeAmenityKey("Lighting Rig")).toBe("lighting_system")
  })

  it("round-trips canonical keys through the legacy cache shape", () => {
    const keys = ["wifi", "ada_accessible", "sound_system"]
    const cache = legacyObjectFromAmenities(keys)
    expect(cache).toEqual({ wifi: true, ada_accessible: true, sound_system: true })
    expect(amenitiesFromLegacyObject(cache)).toEqual(keys)
  })

  it("reconciles top-level array with legacy object without dupes", () => {
    expect(
      reconcileAmenities(["Wi-Fi", "Stage"], { accessible: true, stage: true }),
    ).toEqual(["wifi", "stage", "ada_accessible"])
  })

  it("hasAmenity matches normalized keys", () => {
    expect(hasAmenity(["ADA Accessible"], "ada_accessible")).toBe(true)
    expect(hasAmenity(["wifi"], "ada_accessible")).toBe(false)
    expect(hasAmenity(null, "wifi")).toBe(false)
  })

  it("exposes labels for every canonical key", () => {
    for (const key of VENUE_AMENITY_KEYS) {
      expect(amenityLabel(key)).not.toBe(key)
    }
  })
})

describe("operational policies parsing (VEN-245)", () => {
  it("returns empty defaults for non-object input", () => {
    expect(parseOperationalPolicies(null)).toMatchObject({ insurance_required: false })
    expect(parseOperationalPolicies("x").setup_time).toBe("")
  })

  it("parses valid partial data with defaults filled in", () => {
    expect(parseOperationalPolicies({ setup_time: "4 hours" })).toEqual({
      setup_time: "4 hours",
      breakdown_time: "",
      security: "",
      insurance_required: false,
      permits: "",
      union_rules: "",
      outside_vendors: "",
      alcohol_policy: "",
    })
  })

  it("salvages individually valid fields from invalid payloads", () => {
    const result = parseOperationalPolicies({
      permits: "Liquor",
      insurance_required: "not-a-boolean",
      bogus: "dropped",
    })
    expect(result.permits).toBe("Liquor")
    expect(result.insurance_required).toBe(false)
    expect("bogus" in result).toBe(false)
  })
})

describe("canonical location reads (VEN-246)", () => {
  it("prefers top-level columns over contact_info cache", () => {
    expect(
      readCanonicalLocation({
        city: "Austin",
        state: null,
        country: "",
        contact_info: { city: "Legacy City", state: "Legacy State", postal_code: "73301" },
      }),
    ).toEqual({
      address: "",
      city: "Austin",
      state: "Legacy State",
      country: "",
      postal_code: "73301",
    })
  })

  it("tolerates missing profile/contact shapes", () => {
    expect(readCanonicalLocation(null)).toEqual({
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
    })
    expect(readCanonicalLocation({ city: "  " }).city).toBe("")
  })
})
