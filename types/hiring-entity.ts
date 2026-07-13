import { z } from "zod"

/**
 * Universal hiring scope for Tourify.
 *
 * Every hiring/onboarding mutation must resolve one HiringEntity before reading
 * or writing employer-owned data. This replaces venue-only onboarding scope while
 * preserving legacy venue compatibility during migration.
 */
export const HIRING_ENTITY_TYPES = ["venue", "organization", "artist"] as const

export type HiringEntityType = (typeof HIRING_ENTITY_TYPES)[number]

export interface HiringEntityScope {
  /** Event-specific hiring context, when a job is tied to one event. */
  eventId?: string
  /** Tour-specific hiring context, mostly for artist crew hiring. */
  tourId?: string
  /** Third-party venue context, mostly for orgs staffing an outside venue. */
  venueId?: string
}

export interface HiringEntity {
  entityType: HiringEntityType
  entityId: string
  displayName: string
  scope?: HiringEntityScope
}

export interface HiringActor {
  userId: string
  employer: HiringEntity
}

export interface ResolveHiringEntityArgs {
  userId: string
  entityType?: HiringEntityType
  entityId?: string
  /** Legacy compatibility alias. Use only while migrating venue-only routes. */
  venueId?: string
  displayName?: string
  eventId?: string
  tourId?: string
  scopedVenueId?: string
}

export interface HiringEntityQueryParams {
  entity_type?: string | null
  entity_id?: string | null
  venue_id?: string | null
  event_id?: string | null
  tour_id?: string | null
  scoped_venue_id?: string | null
}

export const hiringEntityTypeSchema = z.enum(HIRING_ENTITY_TYPES)

export const hiringEntityScopeSchema = z.object({
  eventId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
})

export const hiringEntitySchema = z.object({
  entityType: hiringEntityTypeSchema,
  entityId: z.string().uuid(),
  displayName: z.string().min(1),
  scope: hiringEntityScopeSchema.optional(),
})

export const resolveHiringEntityArgsSchema = z.object({
  userId: z.string().uuid(),
  entityType: hiringEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  displayName: z.string().optional(),
  eventId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  scopedVenueId: z.string().uuid().optional(),
})

export interface CreateHiringEntityArgs {
  entityType: HiringEntityType
  entityId: string
  displayName?: string | null
  scope?: HiringEntityScope
}

export interface SerializeHiringEntityArgs {
  employer: HiringEntity
}

export interface HiringEntityLegacyAliasArgs {
  venueId?: string | null
  entityType?: string | null
  entityId?: string | null
}

/**
 * Type guard for user-provided entity type values.
 */
export function isHiringEntityType(value: unknown): value is HiringEntityType {
  return typeof value === "string" && HIRING_ENTITY_TYPES.includes(value as HiringEntityType)
}

/**
 * Normalize query/body entity values into a supported hiring entity type.
 */
export function normalizeHiringEntityType(value: unknown): HiringEntityType | undefined {
  if (!isHiringEntityType(value)) return undefined

  return value
}

/**
 * Create a typed HiringEntity after validating minimum required fields.
 */
export function createHiringEntity({
  entityType,
  entityId,
  displayName,
  scope,
}: CreateHiringEntityArgs): HiringEntity {
  return hiringEntitySchema.parse({
    entityType,
    entityId,
    displayName: displayName || `${entityType}:${entityId}`,
    scope,
  })
}

/**
 * Convert a HiringEntity into the query format expected by API routes.
 */
export function serializeHiringEntity({ employer }: SerializeHiringEntityArgs): URLSearchParams {
  const params = new URLSearchParams()

  params.set("entity_type", employer.entityType)
  params.set("entity_id", employer.entityId)

  if (employer.scope?.eventId) params.set("event_id", employer.scope.eventId)
  if (employer.scope?.tourId) params.set("tour_id", employer.scope.tourId)
  if (employer.scope?.venueId) params.set("scoped_venue_id", employer.scope.venueId)

  return params
}

/**
 * Preserve legacy venue-only routes by mapping venue_id to HiringEntity shape.
 * Prefer explicit entity_type/entity_id whenever both are present.
 */
export function getLegacyVenueAlias({
  venueId,
  entityType,
  entityId,
}: HiringEntityLegacyAliasArgs): Pick<ResolveHiringEntityArgs, "entityType" | "entityId" | "venueId"> {
  const normalizedEntityType = normalizeHiringEntityType(entityType)

  if (normalizedEntityType && entityId) {
    return {
      entityType: normalizedEntityType,
      entityId,
    }
  }

  if (!venueId) return {}

  return {
    entityType: "venue",
    entityId: venueId,
    venueId,
  }
}

/**
 * Convert route/search params into resolver args without performing permission checks.
 * Permission validation belongs in lib/auth/acting-context.ts and hiring-permissions.ts.
 */
export function parseHiringEntityQueryParams({
  userId,
  params,
  displayName,
}: {
  userId: string
  params: HiringEntityQueryParams
  displayName?: string
}): ResolveHiringEntityArgs {
  const legacyAlias = getLegacyVenueAlias({
    venueId: params.venue_id,
    entityType: params.entity_type,
    entityId: params.entity_id,
  })

  return resolveHiringEntityArgsSchema.parse({
    userId,
    ...legacyAlias,
    displayName,
    eventId: params.event_id || undefined,
    tourId: params.tour_id || undefined,
    scopedVenueId: params.scoped_venue_id || undefined,
  })
}
