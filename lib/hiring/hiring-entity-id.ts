const UUID_PREFIX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/**
 * Legacy organizer accounts expose a composite `profile_id` of the form
 * `${userId}-organizer-${slug}`. Hiring RPCs, API schemas, and DB columns all
 * treat the entity id as a bare `uuid`, so the composite must be reduced to its
 * leading uuid before it crosses any of those boundaries.
 */
export function normalizeHiringEntityId<T extends string | null | undefined>(entityId: T): T {
  if (typeof entityId !== "string") return entityId

  const match = entityId.match(UUID_PREFIX_PATTERN)
  if (!match) return entityId

  return match[0] as T
}
