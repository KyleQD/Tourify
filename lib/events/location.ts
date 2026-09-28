/**
 * lib/events/location.ts
 *
 * Geo + date utilities for discovery. Complements (does not fork)
 * lib/discover/location-match.ts, which stays in charge of free-form
 * location text matching for the legacy discover rail.
 */

export const METERS_PER_MILE = 1609.344

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE
}

export interface LatLng {
  latitude: number
  longitude: number
}

export function isValidLatLng(input: { latitude?: unknown; longitude?: unknown }): input is LatLng {
  const lat = Number(input.latitude)
  const lng = Number(input.longitude)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

export type DatePreset =
  | "today"
  | "tomorrow"
  | "this_weekend"
  | "this_week"
  | "this_month"

/**
 * Resolve a date preset to [start, end) ISO boundaries in the given IANA
 * timezone (default UTC). Weekend = Saturday 00:00 → Monday 00:00.
 */
export function resolveDatePreset(
  preset: DatePreset,
  now: Date = new Date(),
  timezone = "UTC",
): { start: string; end: string } {
  const parts = zonedParts(now, timezone)
  const atMidnight = (y: number, m: number, d: number) =>
    zonedMidnightToUtc(y, m, d, timezone)

  if (preset === "today") {
    const start = atMidnight(parts.year, parts.month, parts.day)
    return { start: start.toISOString(), end: addDays(start, 1).toISOString() }
  }
  if (preset === "tomorrow") {
    const start = addDays(atMidnight(parts.year, parts.month, parts.day), 1)
    return { start: start.toISOString(), end: addDays(start, 1).toISOString() }
  }
  if (preset === "this_week") {
    const start = atMidnight(parts.year, parts.month, parts.day)
    return { start: start.toISOString(), end: addDays(start, 7).toISOString() }
  }
  if (preset === "this_month") {
    const start = atMidnight(parts.year, parts.month, parts.day)
    return { start: start.toISOString(), end: addDays(start, 31).toISOString() }
  }
  // this_weekend: next Saturday 00:00 (or today if Sat/Sun) → Monday 00:00
  const weekday = zonedWeekday(now, timezone) // 0=Sun … 6=Sat
  const daysToSaturday = weekday === 6 ? 0 : weekday === 0 ? 0 : 6 - weekday
  const saturday = addDays(atMidnight(parts.year, parts.month, parts.day), daysToSaturday)
  const monday = addDays(saturday, 2)
  return { start: saturday.toISOString(), end: monday.toISOString() }
}

function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const map: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) map[part.type] = part.value
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) }
}

function zonedWeekday(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(fmt.format(date))
}

/**
 * Convert a wall-clock midnight in a timezone to the equivalent UTC Date,
 * correctly across DST boundaries, without any date library.
 */
function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string): Date {
  // Initial guess: treat as UTC midnight.
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offset = tzOffsetMs(new Date(guess), timeZone)
  let utc = guess - offset
  // One refinement pass handles DST transition edge cases.
  const refined = tzOffsetMs(new Date(utc), timeZone)
  if (refined !== offset) utc = guess - refined
  return new Date(utc)
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const map: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) map[part.type] = part.value
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  )
  return asUtc - date.getTime()
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}
