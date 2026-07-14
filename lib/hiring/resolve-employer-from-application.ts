import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

function isHiringEntityType(value: unknown): value is HiringEntityType {
  return value === "venue" || value === "organization" || value === "artist"
}

export function resolveEmployerFromApplicationRow(row: Record<string, unknown>): HiringEntity | null {
  const entityType = row.employer_entity_type
  const entityId = row.employer_entity_id

  if (isHiringEntityType(entityType) && typeof entityId === "string" && entityId.trim().length > 0) {
    return {
      entityType,
      entityId,
      displayName: "Employer",
      scope: {
        venueId: typeof row.venue_id === "string" ? row.venue_id : undefined,
      },
    }
  }

  if (typeof row.venue_id === "string" && row.venue_id.trim().length > 0) {
    return {
      entityType: "venue",
      entityId: row.venue_id,
      displayName: "Venue",
    }
  }

  return null
}
