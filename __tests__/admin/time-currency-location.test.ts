/**
 * REL-301 — Time / currency / location test library tests.
 *
 * Verifies every fixture set and helper is exercisable by domain tests.
 */

import { describe, it, expect } from "vitest"
import {
  // DST fixtures
  DST_GAP_FIXTURES,
  DST_FOLD_FIXTURES,
  // Local-day
  LOCAL_DAY_FIXTURES,
  utcToLocalDate,
  utcToLocalHour,
  legCrossesLocalMidnight,
  // Currency
  CURRENCY_EXPONENTS,
  currencyExponent,
  currencyMultiplier,
  toMinorUnits,
  fromMinorUnits,
  roundHalfEven,
  roundHalfUp,
  convertCurrency,
  sumMinorUnits,
  // Address
  ADDRESS_EDGE_CASES,
  validateLogisticsAddress,
} from "@/lib/admin/time-currency-location"

// ---------------------------------------------------------------------------
// DST fixtures
// ---------------------------------------------------------------------------

describe("REL-301 — DST gap fixtures", () => {
  it("provides at least 4 gap fixtures covering major zones", () => {
    expect(DST_GAP_FIXTURES.length).toBeGreaterThanOrEqual(4)
    expect(DST_GAP_FIXTURES.every((f) => f.type === "gap")).toBe(true)
  })

  it("every gap fixture has a zone, utcBefore, utcAfter, problematicLocalTime, description", () => {
    for (const f of DST_GAP_FIXTURES) {
      expect(f.zone).toBeTruthy()
      expect(f.utcBefore).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      expect(f.utcAfter).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      expect(f.problematicLocalTime).toBeTruthy()
      expect(f.description).toBeTruthy()
    }
  })

  it("utcBefore is always earlier than utcAfter", () => {
    for (const f of DST_GAP_FIXTURES) {
      expect(new Date(f.utcBefore).getTime()).toBeLessThan(new Date(f.utcAfter).getTime())
    }
  })

  it("covers America/New_York and Europe/London gaps", () => {
    const zones = DST_GAP_FIXTURES.map((f) => f.zone)
    expect(zones).toContain("America/New_York")
    expect(zones).toContain("Europe/London")
  })
})

describe("REL-301 — DST fold fixtures", () => {
  it("provides at least 3 fold fixtures", () => {
    expect(DST_FOLD_FIXTURES.length).toBeGreaterThanOrEqual(3)
    expect(DST_FOLD_FIXTURES.every((f) => f.type === "fold")).toBe(true)
  })

  it("every fold fixture is structurally complete", () => {
    for (const f of DST_FOLD_FIXTURES) {
      expect(f.zone).toBeTruthy()
      expect(f.problematicLocalTime).toBeTruthy()
      expect(f.description).toBeTruthy()
    }
  })

  it("covers America/New_York and Europe/London folds", () => {
    const zones = DST_FOLD_FIXTURES.map((f) => f.zone)
    expect(zones).toContain("America/New_York")
    expect(zones).toContain("Europe/London")
  })
})

// ---------------------------------------------------------------------------
// Local-day boundary helpers
// ---------------------------------------------------------------------------

describe("REL-301 — local-day boundary fixtures", () => {
  it("provides at least 2 local-day fixtures", () => {
    expect(LOCAL_DAY_FIXTURES.length).toBeGreaterThanOrEqual(2)
  })

  it("utcToLocalDate returns correct YYYY-MM-DD for UTC", () => {
    expect(utcToLocalDate("2026-08-20T23:30:00.000Z", "UTC")).toBe("2026-08-20")
  })

  it("utcToLocalDate returns next calendar day in Asia/Tokyo for late UTC evening", () => {
    // 23:30 UTC = 08:30 JST next day
    expect(utcToLocalDate("2026-08-20T23:30:00.000Z", "Asia/Tokyo")).toBe("2026-08-21")
  })

  it("utcToLocalDate returns previous calendar day in America/Los_Angeles for 04:00 UTC", () => {
    // 04:00 UTC = 21:00 PDT previous day
    expect(utcToLocalDate("2026-08-21T04:00:00.000Z", "America/Los_Angeles")).toBe("2026-08-20")
  })

  it("utcToLocalHour returns correct 2-digit hour in UTC", () => {
    expect(utcToLocalHour("2026-08-20T23:30:00.000Z", "UTC")).toBe("23")
  })

  it("utcToLocalHour returns correct hour in America/New_York (EDT = UTC-4)", () => {
    // 23:30 UTC = 19:30 EDT
    expect(utcToLocalHour("2026-08-20T23:30:00.000Z", "America/New_York")).toBe("19")
  })

  it("validates all expectations in LOCAL_DAY_FIXTURES", () => {
    for (const f of LOCAL_DAY_FIXTURES) {
      for (const exp of f.expectations) {
        const date = utcToLocalDate(f.utcIso, exp.zone)
        const hour = utcToLocalHour(f.utcIso, exp.zone)
        expect(date).toBe(exp.localDate)
        expect(hour).toBe(exp.localHH)
      }
    }
  })
})

describe("REL-301 — overnight leg detection", () => {
  it("leg departing late UTC and arriving next day in destination zone crosses midnight", () => {
    // Depart 22:00 UTC (18:00 EDT) → arrive 06:00 UTC next day (02:00 EDT)
    expect(
      legCrossesLocalMidnight(
        "2026-08-20T22:00:00.000Z",
        "America/New_York",
        "2026-08-21T06:00:00.000Z",
        "America/New_York",
      ),
    ).toBe(true)
  })

  it("same-day leg does not cross midnight", () => {
    expect(
      legCrossesLocalMidnight(
        "2026-08-20T12:00:00.000Z",
        "America/New_York",
        "2026-08-20T18:00:00.000Z",
        "America/New_York",
      ),
    ).toBe(false)
  })

  it("leg crossing zones can cross midnight even with small UTC delta", () => {
    // 04:00 UTC in LA is still Aug 20 (21:00 PDT), but in Tokyo is Aug 21 (13:00 JST)
    expect(
      legCrossesLocalMidnight(
        "2026-08-21T03:59:00.000Z",
        "America/Los_Angeles",
        "2026-08-21T04:01:00.000Z",
        "Asia/Tokyo",
      ),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Currency exponents
// ---------------------------------------------------------------------------

describe("REL-301 — currency exponents", () => {
  it("USD has exponent 2", () => {
    expect(currencyExponent("USD")).toBe(2)
    expect(currencyMultiplier("USD")).toBe(100)
  })

  it("JPY has exponent 0 (no minor unit)", () => {
    expect(currencyExponent("JPY")).toBe(0)
    expect(currencyMultiplier("JPY")).toBe(1)
  })

  it("KWD has exponent 3", () => {
    expect(currencyExponent("KWD")).toBe(3)
    expect(currencyMultiplier("KWD")).toBe(1000)
  })

  it("CLF has exponent 4", () => {
    expect(currencyExponent("CLF")).toBe(4)
    expect(currencyMultiplier("CLF")).toBe(10000)
  })

  it("unknown currency defaults to exponent 2", () => {
    expect(currencyExponent("XYZ")).toBe(2)
  })

  it("toMinorUnits converts correctly for USD", () => {
    expect(toMinorUnits(12.50, "USD")).toBe(1250)
  })

  it("toMinorUnits converts correctly for JPY (no rounding needed)", () => {
    expect(toMinorUnits(1500, "JPY")).toBe(1500)
  })

  it("toMinorUnits converts correctly for KWD", () => {
    expect(toMinorUnits(10.500, "KWD")).toBe(10500)
  })

  it("fromMinorUnits converts back correctly for USD", () => {
    expect(fromMinorUnits(1250, "USD")).toBe(12.50)
  })

  it("fromMinorUnits converts back correctly for JPY", () => {
    expect(fromMinorUnits(1500, "JPY")).toBe(1500)
  })

  it("CURRENCY_EXPONENTS covers at least 10 currencies", () => {
    expect(Object.keys(CURRENCY_EXPONENTS).length).toBeGreaterThanOrEqual(10)
  })
})

// ---------------------------------------------------------------------------
// FX rounding
// ---------------------------------------------------------------------------

describe("REL-301 — FX rounding", () => {
  it("roundHalfEven rounds 0.5 to nearest even (2.5 → 2)", () => {
    expect(roundHalfEven(2.5, 0)).toBe(2)
  })

  it("roundHalfEven rounds 3.5 → 4 (nearest even)", () => {
    expect(roundHalfEven(3.5, 0)).toBe(4)
  })

  it("roundHalfEven rounds 1.5 → 2 (nearest even)", () => {
    expect(roundHalfEven(1.5, 0)).toBe(2)
  })

  it("roundHalfUp rounds 2.5 → 3", () => {
    expect(roundHalfUp(2.5, 0)).toBe(3)
  })

  it("roundHalfUp rounds 3.5 → 4", () => {
    expect(roundHalfUp(3.5, 0)).toBe(4)
  })

  it("roundHalfEven to 2 decimal places", () => {
    expect(roundHalfEven(1.235, 2)).toBe(1.24)
    expect(roundHalfEven(1.245, 2)).toBe(1.24)  // nearest even
  })

  it("convertCurrency applies FX rate and rounds to target exponent", () => {
    // 100 USD × 0.92 = 92.00 EUR
    const result = convertCurrency({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "EUR",
      rate: 0.92,
    })
    expect(result).toBe(92.00)
  })

  it("convertCurrency rounds JPY to 0 decimals", () => {
    // 100 USD × 148.5 = 14850.0 JPY
    const result = convertCurrency({
      amount: 100,
      fromCurrency: "USD",
      toCurrency: "JPY",
      rate: 148.5,
    })
    expect(result).toBe(14850)
  })

  it("convertCurrency uses round_half_up when specified", () => {
    const result = convertCurrency({
      amount: 10,
      fromCurrency: "USD",
      toCurrency: "USD",
      rate: 1.005,
      rounding: "half_up",
    })
    expect(result).toBe(10.05)
  })

  it("sumMinorUnits avoids floating-point drift", () => {
    // 0.10 + 0.20 = 0.30 exactly via minor units
    const result = sumMinorUnits(
      [toMinorUnits(0.10, "USD"), toMinorUnits(0.20, "USD")],
      "USD",
    )
    expect(result).toBe(0.30)
  })

  it("sumMinorUnits handles JPY (integer amounts)", () => {
    expect(sumMinorUnits([1000, 2000, 500], "JPY")).toBe(3500)
  })
})

// ---------------------------------------------------------------------------
// Address / location edge cases
// ---------------------------------------------------------------------------

describe("REL-301 — address edge cases", () => {
  it("provides at least 10 address edge cases", () => {
    expect(ADDRESS_EDGE_CASES.length).toBeGreaterThanOrEqual(10)
  })

  it("every edge case has id, description, address, expectedValid, why", () => {
    for (const c of ADDRESS_EDGE_CASES) {
      expect(c.id).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(typeof c.expectedValid).toBe("boolean")
      expect(c.why).toBeTruthy()
    }
  })

  it("unicode_city fixture is expected valid", () => {
    const f = ADDRESS_EDGE_CASES.find((c) => c.id === "unicode_city")!
    expect(f.expectedValid).toBe(true)
  })

  it("long_venue_name fixture is expected invalid (exceeds 100 chars)", () => {
    const f = ADDRESS_EDGE_CASES.find((c) => c.id === "long_venue_name")!
    expect(f.expectedValid).toBe(false)
  })

  it("dateline_west and dateline_east coordinates are within valid range", () => {
    const west = ADDRESS_EDGE_CASES.find((c) => c.id === "dateline_west")!
    const east = ADDRESS_EDGE_CASES.find((c) => c.id === "dateline_east")!
    expect(west.address.longitude).toBeGreaterThanOrEqual(-180)
    expect(east.address.longitude).toBeLessThanOrEqual(180)
  })

  it("north_pole has latitude 90", () => {
    const pole = ADDRESS_EDGE_CASES.find((c) => c.id === "north_pole")!
    expect(pole.address.latitude).toBe(90)
  })

  it("validateLogisticsAddress accepts a complete address", () => {
    const result = validateLogisticsAddress({
      line1: "123 Main St",
      city: "Chicago",
      country_code: "US",
      postal_code: "60601",
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("validateLogisticsAddress rejects empty line1", () => {
    const result = validateLogisticsAddress({ city: "London", country_code: "GB" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("line1"))).toBe(true)
  })

  it("validateLogisticsAddress rejects missing country_code", () => {
    const result = validateLogisticsAddress({ line1: "123 Main St", city: "Paris" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("country_code"))).toBe(true)
  })

  it("validateLogisticsAddress rejects line1 > 100 chars", () => {
    const f = ADDRESS_EDGE_CASES.find((c) => c.id === "long_venue_name")!
    const result = validateLogisticsAddress({ ...f.address, country_code: "US" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("100"))).toBe(true)
  })

  it("validateLogisticsAddress accepts valid coordinates at dateline", () => {
    const result = validateLogisticsAddress({
      line1: "1 Dateline Rd",
      country_code: "US",
      latitude: 0,
      longitude: -179.9,
    })
    expect(result.valid).toBe(true)
  })

  it("validateLogisticsAddress warns on ambiguous Springfield without state", () => {
    const result = validateLogisticsAddress({
      line1: "1 Main St",
      city: "Springfield",
      country_code: "US",
    })
    expect(result.warnings.some((w) => w.toLowerCase().includes("springfield"))).toBe(true)
  })

  it("address edge case expectedValid matches validateLogisticsAddress for well-defined cases", () => {
    // Check the empty_line1 case
    const empty = ADDRESS_EDGE_CASES.find((c) => c.id === "empty_line1")!
    const result = validateLogisticsAddress(empty.address)
    expect(result.valid).toBe(empty.expectedValid)
  })
})
