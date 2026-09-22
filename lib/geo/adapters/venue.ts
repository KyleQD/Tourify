import { str, type RawRowLike } from "./shared"

/**
 * `venue_profiles` / `venues` address fields. No first-migration FK is added
 * back to those tables.
 */
export function extractFromVenueProfile(row: RawRowLike) {
  return {
    hierarchy: {
      city: str(row, "city"),
      admin1: str(row, "state"),
      country: str(row, "country"),
    },
    freeText: str(row, "address") ?? str(row, "address_line1"),
  }
}

export function extractFromVenue(row: RawRowLike) {
  return extractFromVenueProfile(row)
}
