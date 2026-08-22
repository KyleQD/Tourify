import { coordinatesFrom, str, type RawRowLike } from "./shared"

/**
 * `events`: explicit address/city/state/country/latitude/longitude columns.
 * venue_name/address feed free text as context only, never canonical identity.
 */
export function extractFromEvent(row: RawRowLike) {
  return {
    coordinates: coordinatesFrom(row.latitude, row.longitude),
    hierarchy: {
      city: str(row, "city"),
      admin1: str(row, "state"),
      country: str(row, "country"),
    },
    freeText: str(row, "venue_name") ?? str(row, "address"),
  }
}
