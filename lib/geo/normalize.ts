import type { GeoCoordinates, GeoHierarchyInput } from "./types"

/**
 * Normalize free text for comparison keys. Diacritics are folded for search
 * only; callers must retain the original string for display/storage.
 */
export function normalizeWhitespace(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null
  const collapsed = input.replace(/\s+/g, " ").trim()
  return collapsed.length > 0 ? collapsed : null
}

/**
 * Fold diacritics and case for search keys. Originals are never replaced.
 * Mirrors the conservative `lower(btrim(alias))` generated column plus
 * client-side folding for broader matching.
 */
export function normalizeSearchKey(input: string | null | undefined): string | null {
  const collapsed = normalizeWhitespace(input)
  if (!collapsed) return null
  const folded = collapsed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  return folded.length > 0 ? folded : null
}

/**
 * ISO-3166-1 alpha-2 uppercase or null. Anything else is invalid input,
 * not a guess.
 */
export function normalizeCountryCode(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null
  const code = input.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

export function normalizeHierarchy(
  hierarchy: GeoHierarchyInput | null | undefined
): GeoHierarchyInput | null {
  if (!hierarchy || typeof hierarchy !== "object") return null
  const normalized: GeoHierarchyInput = {
    neighborhood: normalizeWhitespace(hierarchy.neighborhood),
    city: normalizeWhitespace(hierarchy.city),
    admin1: normalizeWhitespace(hierarchy.admin1),
    country: normalizeWhitespace(hierarchy.country),
    countryCode: normalizeCountryCode(hierarchy.countryCode),
  }
  const hasAny = Object.values(normalized).some((value) => value !== null)
  return hasAny ? normalized : null
}

export interface ValidatedCoordinates {
  latitude: number
  longitude: number
}

/**
 * Validate coordinates using the same principles as lib/events/location.ts:
 * finite numbers within range, latitude first, longitude second. Latitude and
 * longitude are never swapped or corrected silently; out-of-range input is
 * rejected as null rather than coerced.
 */
export function validateCoordinates(
  coordinates: { latitude?: unknown; longitude?: unknown } | null | undefined
): GeoCoordinates | null {
  if (!coordinates || typeof coordinates !== "object") return null
  const latitude = Number(coordinates.latitude)
  const longitude = Number(coordinates.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  // A value outside both ranges strongly suggests swapped input; reject it.
  if (Math.abs(latitude) > 90 && Math.abs(longitude) <= 90) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}
