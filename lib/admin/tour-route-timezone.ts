/**
 * ROUTE-303 — Time-zone and DST handling for tour route stops.
 *
 * Core contract:
 *  - All storage times are UTC (timestamptz / ISO 8601 with 'Z').
 *  - Each stop carries an IANA time-zone identifier (e.g. "America/Chicago").
 *  - Display conversions use the stop's local zone.
 *  - DST transitions are handled explicitly:
 *      • "spring-forward" gaps: a local time that does not exist in the zone
 *        is flagged as NONEXISTENT (UX must prompt correction).
 *      • "fall-back" folds: a local time that occurs twice in the zone is
 *        flagged as AMBIGUOUS (UX must ask user which occurrence).
 *
 * Pure: no I/O, no `server-only`. Uses only `Intl` (built-in everywhere).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DstAmbiguityKind = "ok" | "ambiguous" | "nonexistent"

export interface LocalTimeResolution {
  utcIso: string
  localIso: string
  ianaZone: string
  kind: DstAmbiguityKind
  /** Human-readable description when kind !== 'ok'. */
  message?: string
}

export interface ZonedStopTime {
  /** ISO 8601 UTC timestamp stored in the database (null if not yet set). */
  utcIso: string | null
  /** IANA zone for display (e.g. "America/Chicago"). */
  ianaZone: string
  /** Local date in the stop's zone: YYYY-MM-DD. */
  localDate: string | null
  /** Local time in the stop's zone: HH:MM (24h). */
  localTime: string | null
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate an IANA time-zone identifier using Intl.
 * Returns true when the zone is valid in the host's Intl implementation.
 */
export function isValidIanaZone(zone: string): boolean {
  if (!zone?.trim()) return false
  try {
    Intl.DateTimeFormat("en", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/**
 * List of IANA zones known to be well-tested for DST transitions.
 * Used to validate that the test suite covers meaningful zones.
 */
export const WELL_KNOWN_DST_ZONES = [
  "America/New_York",     // US Eastern — spring +1 / fall -1
  "America/Chicago",      // US Central
  "America/Los_Angeles",  // US Pacific
  "America/Denver",       // US Mountain
  "Europe/London",        // GMT → BST
  "Europe/Paris",         // CET → CEST
  "Australia/Sydney",     // AEST → AEDT (southern hemisphere)
  "Pacific/Auckland",     // NZST → NZDT
] as const

// ---------------------------------------------------------------------------
// UTC ↔ local conversions
// ---------------------------------------------------------------------------

/**
 * Convert a UTC ISO timestamp to a local date+time string in the given zone.
 *
 * Returns `{ localDate: "YYYY-MM-DD", localTime: "HH:MM" }`.
 * Throws on invalid zone (caller should validate first).
 */
export function utcToLocalDateTime(utcIso: string, ianaZone: string): {
  localDate: string
  localTime: string
} {
  const date = new Date(utcIso)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid UTC timestamp: ${utcIso}`)

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return {
    localDate: dateFmt.format(date),           // "YYYY-MM-DD"
    localTime: timeFmt.format(date).slice(0, 5), // "HH:MM"
  }
}

/**
 * Format a UTC ISO timestamp for display in the stop's local zone.
 * Returns a human-readable string like "Mon, Jul 20, 2026, 7:00 PM CDT".
 */
export function formatStopTimeForDisplay(utcIso: string, ianaZone: string): string {
  const date = new Date(utcIso)
  if (Number.isNaN(date.getTime())) return ""
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ianaZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

/**
 * Return the UTC offset string (e.g. "UTC-5", "UTC+1") for a UTC timestamp
 * displayed in the given zone. Useful for labelling clocks and shift summaries.
 */
export function getUtcOffsetLabel(utcIso: string, ianaZone: string): string {
  const date = new Date(utcIso)
  if (Number.isNaN(date.getTime())) return "UTC"
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ianaZone,
      timeZoneName: "shortOffset",
    }).formatToParts(date)
    const tzPart = parts.find((p) => p.type === "timeZoneName")
    return tzPart?.value ?? "UTC"
  } catch {
    return "UTC"
  }
}

// ---------------------------------------------------------------------------
// DST gap/fold detection
// ---------------------------------------------------------------------------

/**
 * Detect whether a (local date + local time + IANA zone) combination falls
 * into a DST gap (nonexistent) or fold (ambiguous).
 *
 * Algorithm:
 *  We estimate the UTC instant for the given local time by computing the zone's
 *  UTC offset at a reference point, then round-trip back to local to verify.
 *
 *  1. Compute approximate zone offset by comparing UTC and local times at a
 *     stable reference point (noon on the same date in UTC).
 *  2. Shift the requested local time by that offset to get a UTC candidate.
 *  3. Round-trip that UTC candidate back through the zone.
 *  4. If round-trip local time ≠ requested local time → nonexistent or ambiguous.
 *     - Try UTC candidate -1h: if its round-trip also matches → ambiguous (fold).
 *     - Otherwise → nonexistent (gap).
 *
 * @returns DstAmbiguityKind — 'ok' | 'ambiguous' | 'nonexistent'
 */
export function detectDstAmbiguity(args: {
  localDate: string   // "YYYY-MM-DD"
  localTime: string   // "HH:MM"
  ianaZone: string
}): DstAmbiguityKind {
  if (!isValidIanaZone(args.ianaZone)) return "ok"

  // Build the UTC candidate by trying multiple reference offsets.
  // On DST-transition days the noon-based offset may pick the wrong
  // side of the transition for early/late times. We try three probes:
  // noon offset, noon-1h, noon+1h, and accept "ok" if any round-trips.
  const dateParts = args.localDate.split("-").map(Number)
  if (dateParts.length !== 3) return "ok"
  const [year, month, day] = dateParts

  const [reqH, reqM] = args.localTime.split(":").map(Number)
  if (Number.isNaN(reqH) || Number.isNaN(reqM)) return "ok"
  const reqLocalMinutes = reqH * 60 + reqM
  const baseDateUtcMs = Date.UTC(year, month - 1, day)
  if (Number.isNaN(baseDateUtcMs)) return "ok"

  // Compute offset from three reference UTC points: noon, noon-4h, noon+4h
  const refOffsets: number[] = []
  for (const refH of [12, 8, 16]) {
    const refMs = baseDateUtcMs + refH * 3_600_000
    const refDate = new Date(refMs)
    const { localTime: refLocal } = utcToLocalDateTime(refDate.toISOString(), args.ianaZone)
    const [rH, rM] = refLocal.split(":").map(Number)
    if (!Number.isNaN(rH) && !Number.isNaN(rM)) {
      const offsetMin = rH * 60 + rM - refH * 60
      // Normalise to -720..+720 range
      refOffsets.push(((offsetMin % 1440) + 1440) % 1440 > 720
        ? offsetMin - 1440
        : offsetMin)
    }
  }

  // For each candidate offset, try round-trip
  const seen = new Set<number>()
  const kinds: DstAmbiguityKind[] = []
  for (const off of refOffsets) {
    const candidateUtcMs = baseDateUtcMs + (reqLocalMinutes - off) * 60_000
    if (seen.has(candidateUtcMs)) continue
    seen.add(candidateUtcMs)

    const candidate = new Date(candidateUtcMs)
    const { localTime: rtTime } = utcToLocalDateTime(candidate.toISOString(), args.ianaZone)
    if (rtTime === args.localTime) {
      // Valid UTC candidate found — check for fold (duplicate)
      const minus1h = new Date(candidateUtcMs - 3_600_000)
      const { localTime: rtMinus } = utcToLocalDateTime(minus1h.toISOString(), args.ianaZone)
      if (rtMinus === args.localTime) {
        kinds.push("ambiguous")
      } else {
        kinds.push("ok")
      }
    } else {
      // Round-trip failed for this offset — might be nonexistent gap
      const minus1h = new Date(candidateUtcMs - 3_600_000)
      const plus1h = new Date(candidateUtcMs + 3_600_000)
      const { localTime: rtMinus } = utcToLocalDateTime(minus1h.toISOString(), args.ianaZone)
      const { localTime: rtPlus } = utcToLocalDateTime(plus1h.toISOString(), args.ianaZone)
      if (rtMinus === args.localTime || rtPlus === args.localTime) {
        kinds.push("ambiguous")
      } else {
        kinds.push("nonexistent")
      }
    }
  }

  // If any probe says "ok" → the time is unambiguously valid
  if (kinds.includes("ok")) return "ok"
  // If any probe says "ambiguous" → fold
  if (kinds.includes("ambiguous")) return "ambiguous"
  // All probes say nonexistent → gap
  return "nonexistent"
}

/**
 * Build a user-facing message for a DST conflict.
 */
export function buildDstAmbiguityMessage(
  kind: DstAmbiguityKind,
  localDate: string,
  localTime: string,
  ianaZone: string,
): string | undefined {
  if (kind === "ok") return undefined
  if (kind === "nonexistent")
    return (
      `${localDate} ${localTime} does not exist in ${ianaZone} — ` +
      `clocks spring forward through this time. Choose an earlier or later time.`
    )
  return (
    `${localDate} ${localTime} occurs twice in ${ianaZone} — ` +
    `clocks fall back at this hour. Specify which occurrence (standard or daylight time).`
  )
}

// ---------------------------------------------------------------------------
// Stop time record builder
// ---------------------------------------------------------------------------

/**
 * Build a ZonedStopTime from a UTC timestamp + IANA zone.
 * All display-layer consumers should use this rather than ad-hoc formatting.
 */
export function buildZonedStopTime(args: {
  utcIso: string | null
  ianaZone: string
}): ZonedStopTime {
  if (!args.utcIso) {
    return { utcIso: null, ianaZone: args.ianaZone, localDate: null, localTime: null }
  }
  try {
    const { localDate, localTime } = utcToLocalDateTime(args.utcIso, args.ianaZone)
    return { utcIso: args.utcIso, ianaZone: args.ianaZone, localDate, localTime }
  } catch {
    return { utcIso: args.utcIso, ianaZone: args.ianaZone, localDate: null, localTime: null }
  }
}

/**
 * Check whether two stops in different zones appear to be on the same calendar
 * day from each stop's local perspective. Used to detect same-day scheduling
 * conflicts (ROUTE-304).
 */
export function isSameLocalDay(args: {
  utcA: string
  zoneA: string
  utcB: string
  zoneB: string
}): boolean {
  try {
    const { localDate: dayA } = utcToLocalDateTime(args.utcA, args.zoneA)
    const { localDate: dayB } = utcToLocalDateTime(args.utcB, args.zoneB)
    return dayA === dayB
  } catch {
    return false
  }
}

/**
 * Compute the difference in minutes between two UTC timestamps, accounting
 * for zone display context. The duration itself is UTC-based (no DST effect
 * on elapsed time); zone is carried for observability only.
 */
export function computeTravelMinutes(args: {
  departureUtc: string
  arrivalUtc: string
}): number | null {
  const dep = Date.parse(args.departureUtc)
  const arr = Date.parse(args.arrivalUtc)
  if (Number.isNaN(dep) || Number.isNaN(arr)) return null
  return Math.round((arr - dep) / 60_000)
}
