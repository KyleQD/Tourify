import { normalizeHiringEntityId } from "@/lib/hiring/hiring-entity-id"
import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

interface BuildEmployerFromSearchParamsArgs {
  searchParams: Record<string, string | string[] | undefined>
  fallbackDisplayName?: string
}

function getParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key]
  if (Array.isArray(value)) return value[0]
  return value
}

function isHiringEntityType(value: string | undefined): value is HiringEntityType {
  return value === "venue" || value === "organization" || value === "artist"
}

export function buildEmployerFromSearchParams({
  searchParams,
  fallbackDisplayName = "Selected account",
}: BuildEmployerFromSearchParamsArgs): HiringEntity | null {
  const legacyVenueId = getParam(searchParams, "venue_id")
  const entityTypeParam = getParam(searchParams, "entity_type")
  const entityIdParam = getParam(searchParams, "entity_id")
  const displayName = getParam(searchParams, "display_name") || fallbackDisplayName
  const eventId = getParam(searchParams, "event_id")
  const tourId = getParam(searchParams, "tour_id")

  // Explicit entity_type + entity_id always wins. venue_id is scope only.
  if (isHiringEntityType(entityTypeParam) && entityIdParam) {
    return {
      entityType: entityTypeParam,
      entityId: normalizeHiringEntityId(entityIdParam),
      displayName,
      scope: {
        venueId: legacyVenueId,
        eventId,
        tourId,
      },
    }
  }

  // Legacy: venue_id alone implies a venue employer.
  if (legacyVenueId) {
    return {
      entityType: "venue",
      entityId: legacyVenueId,
      displayName,
      scope: {
        venueId: legacyVenueId,
        eventId,
        tourId,
      },
    }
  }

  return null
}

export function parseEmployerFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): HiringEntity | null {
  return buildEmployerFromSearchParams({ searchParams })
}

export const resolveEmployerFromSearchParams = parseEmployerFromSearchParams
