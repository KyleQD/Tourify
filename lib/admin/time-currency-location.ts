/**
 * REL-301 — Time / currency / location test library (pure).
 *
 * Reusable edge-case fixtures and helpers consumed by domain test suites.
 * Covers:
 *   - DST gap (spring-forward): local time that does not exist in the zone
 *   - DST fold (fall-back): local time that occurs twice in the zone
 *   - Time-zone transitions: UTC ↔ local, cross-midnight, overnight legs
 *   - Local-day boundaries: "end of day" in different zones on the same UTC instant
 *   - Currency exponents: USD (2), JPY (0), KWD (3), CLF (4)
 *   - FX rounding: half-even (banker's rounding) and round-half-up
 *   - Multi-currency totals with intermediate precision
 *   - Address / location edge cases: Unicode, long names, missing components,
 *     coordinates at dateline/poles, ambiguous city names
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// DST gap/fold fixtures
// ---------------------------------------------------------------------------

export interface DstFixture {
  /** IANA zone where the transition occurs. */
  zone: string
  /** UTC instant just before the transition clock change. */
  utcBefore: string
  /** UTC instant just after the transition clock change. */
  utcAfter: string
  /** Local time that does not exist (gap) or is ambiguous (fold). */
  problematicLocalTime: string
  type: "gap" | "fold"
  /** Human description. */
  description: string
}

/** Well-known DST gap fixtures (spring-forward). */
export const DST_GAP_FIXTURES: DstFixture[] = [
  {
    zone: "America/New_York",
    utcBefore: "2026-03-08T06:59:00.000Z",  // 01:59 EST
    utcAfter:  "2026-03-08T07:01:00.000Z",  // 03:01 EDT (clocks jump 01:59→03:00)
    problematicLocalTime: "2026-03-08T02:30:00",  // 02:30 does not exist
    type: "gap",
    description: "US Eastern spring-forward: 02:00→03:00, 02:30 is nonexistent",
  },
  {
    zone: "Europe/London",
    utcBefore: "2026-03-29T00:59:00.000Z",  // 00:59 GMT
    utcAfter:  "2026-03-29T01:01:00.000Z",  // 02:01 BST (clocks jump 01:00→02:00)
    problematicLocalTime: "2026-03-29T01:30:00",  // 01:30 does not exist
    type: "gap",
    description: "UK spring-forward: 01:00→02:00, 01:30 is nonexistent",
  },
  {
    zone: "Europe/Paris",
    utcBefore: "2026-03-29T00:59:00.000Z",  // 01:59 CET
    utcAfter:  "2026-03-29T01:01:00.000Z",  // 03:01 CEST
    problematicLocalTime: "2026-03-29T02:30:00",  // 02:30 does not exist
    type: "gap",
    description: "Central European spring-forward: 02:00→03:00",
  },
  {
    zone: "Australia/Sydney",
    utcBefore: "2026-10-03T15:59:00.000Z",  // 01:59 AEST
    utcAfter:  "2026-10-03T16:01:00.000Z",  // 03:01 AEDT
    problematicLocalTime: "2026-10-04T02:30:00",  // 02:30 does not exist
    type: "gap",
    description: "Sydney spring-forward (southern hemisphere Oct): 02:00→03:00",
  },
]

/** Well-known DST fold fixtures (fall-back). */
export const DST_FOLD_FIXTURES: DstFixture[] = [
  {
    zone: "America/New_York",
    utcBefore: "2026-11-01T05:59:00.000Z",  // 01:59 EDT
    utcAfter:  "2026-11-01T06:01:00.000Z",  // 01:01 EST (clocks fall back 02:00→01:00)
    problematicLocalTime: "2026-11-01T01:30:00",  // 01:30 occurs twice
    type: "fold",
    description: "US Eastern fall-back: 02:00→01:00, 01:30 is ambiguous",
  },
  {
    zone: "Europe/London",
    utcBefore: "2026-10-25T00:59:00.000Z",  // 01:59 BST
    utcAfter:  "2026-10-25T01:01:00.000Z",  // 01:01 GMT
    problematicLocalTime: "2026-10-25T01:30:00",  // 01:30 occurs twice
    type: "fold",
    description: "UK fall-back: 02:00→01:00, 01:30 is ambiguous",
  },
  {
    zone: "America/Los_Angeles",
    utcBefore: "2026-11-01T08:59:00.000Z",  // 01:59 PDT
    utcAfter:  "2026-11-01T09:01:00.000Z",  // 01:01 PST
    problematicLocalTime: "2026-11-01T01:30:00",  // 01:30 occurs twice
    type: "fold",
    description: "US Pacific fall-back: 02:00→01:00",
  },
]

// ---------------------------------------------------------------------------
// Local-day boundary fixtures
// ---------------------------------------------------------------------------

/**
 * A set of UTC instants and which calendar date they represent in various zones.
 * Used to test "same UTC, different local day" logic (e.g. overnight legs, reporting cutoffs).
 */
export interface LocalDayFixture {
  utcIso: string
  expectations: Array<{ zone: string; localDate: string; localHH: string }>
  description: string
}

export const LOCAL_DAY_FIXTURES: LocalDayFixture[] = [
  {
    utcIso: "2026-08-20T23:30:00.000Z",
    expectations: [
      { zone: "UTC",                localDate: "2026-08-20", localHH: "23" },
      { zone: "America/New_York",   localDate: "2026-08-20", localHH: "19" },  // 23:30 UTC = 19:30 EDT
      { zone: "America/Los_Angeles",localDate: "2026-08-20", localHH: "16" },  // 23:30 UTC = 16:30 PDT
      { zone: "Asia/Tokyo",         localDate: "2026-08-21", localHH: "08" },  // 23:30 UTC = 08:30+1 JST
      { zone: "Australia/Sydney",   localDate: "2026-08-21", localHH: "09" },  // 23:30 UTC = 09:30+1 AEST
    ],
    description: "Late UTC evening: next calendar day in Asia/Pacific",
  },
  {
    utcIso: "2026-08-21T04:00:00.000Z",
    expectations: [
      { zone: "UTC",                localDate: "2026-08-21", localHH: "04" },
      { zone: "America/New_York",   localDate: "2026-08-21", localHH: "00" },  // midnight EDT
      { zone: "America/Los_Angeles",localDate: "2026-08-20", localHH: "21" },  // prev day PDT
      { zone: "Pacific/Auckland",   localDate: "2026-08-21", localHH: "16" },  // NZST+12
    ],
    description: "Early UTC: straddles midnight in US West and NZ",
  },
]

/**
 * Derive local YYYY-MM-DD for a UTC ISO string in a given IANA zone using Intl.
 * Used by tests to validate local-day boundary computations.
 */
export function utcToLocalDate(utcIso: string, ianaZone: string): string {
  const dt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  })
  return dt.format(new Date(utcIso))  // en-CA → YYYY-MM-DD
}

/**
 * Derive local HH (hour, 24h) for a UTC ISO string in a given IANA zone.
 */
export function utcToLocalHour(utcIso: string, ianaZone: string): string {
  const dt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaZone,
    hour:   "2-digit",
    hour12: false,
  })
  return dt.format(new Date(utcIso)).padStart(2, "0")
}

// ---------------------------------------------------------------------------
// Overnight leg helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the departure date differs from the arrival date in their
 * respective local zones — i.e., the leg crosses a local calendar midnight.
 */
export function legCrossesLocalMidnight(
  departureUtc: string,
  departureZone: string,
  arrivalUtc: string,
  arrivalZone: string,
): boolean {
  return (
    utcToLocalDate(departureUtc, departureZone) !== utcToLocalDate(arrivalUtc, arrivalZone)
  )
}

// ---------------------------------------------------------------------------
// Currency exponent registry
// ---------------------------------------------------------------------------

/** ISO 4217 minor unit exponents (decimal places for the minor unit). */
export const CURRENCY_EXPONENTS: Record<string, number> = {
  USD: 2,   // US Dollar        — cents
  EUR: 2,   // Euro             — cents
  GBP: 2,   // British Pound    — pence
  CAD: 2,   // Canadian Dollar
  AUD: 2,   // Australian Dollar
  JPY: 0,   // Japanese Yen     — no minor unit
  KRW: 0,   // South Korean Won
  HUF: 2,   // Hungarian Forint (ISO 4217 lists 2 but practical use varies; we store 2)
  KWD: 3,   // Kuwaiti Dinar    — fils
  BHD: 3,   // Bahraini Dinar
  IQD: 3,   // Iraqi Dinar
  CLF: 4,   // Chilean Unidad de Fomento
  TND: 3,   // Tunisian Dinar
}

/** Returns the minor-unit exponent for a currency, defaulting to 2. */
export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2
}

/** Returns the minor-unit multiplier (10^exponent). */
export function currencyMultiplier(currency: string): number {
  return Math.pow(10, currencyExponent(currency))
}

/** Convert a decimal amount to its integer minor-unit representation. */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * currencyMultiplier(currency))
}

/** Convert an integer minor-unit value back to a decimal amount. */
export function fromMinorUnits(minorUnits: number, currency: string): number {
  const mult = currencyMultiplier(currency)
  return minorUnits / mult
}

// ---------------------------------------------------------------------------
// FX rounding
// ---------------------------------------------------------------------------

/**
 * Round-half-even (banker's rounding) to `decimalPlaces` places.
 * Avoids systematic bias when rounding many amounts in the same direction.
 */
export function roundHalfEven(value: number, decimalPlaces: number): number {
  const mult = Math.pow(10, decimalPlaces)
  const shifted = value * mult
  const floor = Math.floor(shifted)
  const diff = shifted - floor

  if (Math.abs(diff - 0.5) < 1e-10) {
    // Exactly halfway — round to even
    return (floor % 2 === 0 ? floor : floor + 1) / mult
  }
  return Math.round(shifted) / mult
}

/**
 * Round-half-up (standard commercial rounding) to `decimalPlaces` places.
 */
export function roundHalfUp(value: number, decimalPlaces: number): number {
  const mult = Math.pow(10, decimalPlaces)
  return Math.floor(value * mult + 0.5) / mult
}

/**
 * Apply FX rate conversion with output rounded to the target currency's exponent.
 * Rate is expressed as `targetPerSource` (e.g. 1 USD = 0.92 EUR → rate 0.92).
 */
export function convertCurrency(args: {
  amount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  rounding?: "half_even" | "half_up"
}): number {
  const { amount, toCurrency, rate, rounding = "half_even" } = args
  const raw = amount * rate
  const dp = currencyExponent(toCurrency)
  return rounding === "half_up" ? roundHalfUp(raw, dp) : roundHalfEven(raw, dp)
}

/**
 * Sum a list of minor-unit values (integers) and convert back to decimal.
 * Safe from floating-point accumulation errors.
 */
export function sumMinorUnits(minorUnitAmounts: number[], currency: string): number {
  const total = minorUnitAmounts.reduce((acc, v) => acc + Math.round(v), 0)
  return fromMinorUnits(total, currency)
}

// ---------------------------------------------------------------------------
// Address / location edge cases
// ---------------------------------------------------------------------------

export interface AddressEdgeCase {
  id: string
  description: string
  address: Partial<{
    line1: string
    line2: string
    city: string
    state_region: string
    postal_code: string
    country_code: string
    country_name: string
    latitude: number
    longitude: number
  }>
  /** Expected validation result for a strict validator. */
  expectedValid: boolean
  /** Why this case is interesting. */
  why: string
}

export const ADDRESS_EDGE_CASES: AddressEdgeCase[] = [
  {
    id: "unicode_city",
    description: "Japanese city with Unicode characters",
    address: { city: "東京都", country_code: "JP", postal_code: "100-0001" },
    expectedValid: true,
    why: "Multi-byte Unicode city names must not be truncated or rejected",
  },
  {
    id: "long_venue_name",
    description: "Venue name exceeding typical DB column limits",
    address: {
      line1: "The Grand Auditorium at the International Convention Centre of the Greater Los Angeles Metropolitan Regional Area",
      city: "Los Angeles",
      country_code: "US",
    },
    expectedValid: false,
    why: "Line1 > 100 chars should be flagged for truncation risk",
  },
  {
    id: "missing_postal",
    description: "No postal code — valid in some countries",
    address: { line1: "123 Main St", city: "Bridgetown", country_code: "BB" },
    expectedValid: true,
    why: "Barbados and some island nations have no postal codes",
  },
  {
    id: "dateline_west",
    description: "Location just west of the International Date Line",
    address: { latitude: 0, longitude: -179.9, country_code: "US" },
    expectedValid: true,
    why: "Coordinates near -180 must not be rejected as out-of-range",
  },
  {
    id: "dateline_east",
    description: "Location just east of the International Date Line",
    address: { latitude: 0, longitude: 179.9, country_code: "FJ" },
    expectedValid: true,
    why: "Coordinates near +180 must not be rejected as out-of-range",
  },
  {
    id: "north_pole",
    description: "North Pole coordinates",
    address: { latitude: 90.0, longitude: 0.0 },
    expectedValid: true,
    why: "Lat=90 is valid; timezone assignment may be undefined",
  },
  {
    id: "ambiguous_city",
    description: "Springfield — exists in many US states",
    address: { city: "Springfield", country_code: "US" },
    expectedValid: true,
    why: "City alone is insufficient for unambiguous resolution; state is required",
  },
  {
    id: "empty_line1",
    description: "Address with no line1",
    address: { city: "London", country_code: "GB" },
    expectedValid: false,
    why: "Street address required for logistics delivery operations",
  },
  {
    id: "po_box_only",
    description: "PO Box address — not deliverable for equipment",
    address: { line1: "PO Box 1234", city: "New York", country_code: "US", postal_code: "10001" },
    expectedValid: true,
    why: "Valid mailing address but flagged as non-deliverable for equipment shipments",
  },
  {
    id: "special_chars_line1",
    description: "Street name with diacritics and ampersand",
    address: { line1: "Calle Münchener Str. & Gärtnerplatz 4", city: "München", country_code: "DE" },
    expectedValid: true,
    why: "Diacritics and punctuation must survive round-trips",
  },
]

/** Validate an address for logistics use (strict: requires line1 and country_code). */
export interface AddressValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateLogisticsAddress(
  address: AddressEdgeCase["address"],
): AddressValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!address?.line1?.trim()) errors.push("line1 is required")
  else if (address.line1.length > 100) errors.push("line1 exceeds 100 characters")

  if (!address?.country_code?.trim()) errors.push("country_code is required")

  if (address?.latitude != null) {
    if (address.latitude < -90 || address.latitude > 90) errors.push("latitude out of range")
  }
  if (address?.longitude != null) {
    if (address.longitude < -180 || address.longitude > 180) errors.push("longitude out of range")
  }

  // Warn when city is ambiguous without state
  if (
    address?.city?.toLowerCase() === "springfield" &&
    address?.country_code === "US" &&
    !address?.state_region
  ) {
    warnings.push("Springfield requires state_region to be unambiguous")
  }

  return { valid: errors.length === 0, errors, warnings }
}
