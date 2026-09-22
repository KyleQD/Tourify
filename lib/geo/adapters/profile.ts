import { str, type RawRowLike } from "./shared"

/**
 * Free-form sources (`profiles.location`, posts, jobs) set free text only.
 * They never create a canonical place automatically.
 */
export function extractFreeText(
  row: RawRowLike,
  key = "location"
): { freeText: string | null } {
  return { freeText: str(row, key) }
}

export function extractFromProfile(row: RawRowLike) {
  return extractFreeText(row, "location")
}

export function extractFromPostOrJob(row: RawRowLike) {
  const freeText = str(row, "location") ?? str(row, "title")
  return { freeText }
}
