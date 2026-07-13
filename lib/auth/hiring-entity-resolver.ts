import type { SupabaseClient } from "@supabase/supabase-js"
import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"
import { canManageHiring } from "@/lib/auth/hiring-permissions"
import { normalizeHiringEntityId } from "@/lib/hiring/hiring-entity-id"

export interface ResolveHiringEntityArgs {
  supabase: SupabaseClient
  userId: string
  entityType?: HiringEntityType
  entityId?: string
  venueId?: string
  eventId?: string
  tourId?: string
  displayName?: string
  requirePermission?: boolean
}

interface EntityLookupConfig {
  tableName: string
  displayColumns: string[]
}

const ENTITY_LOOKUP_CONFIG: Record<HiringEntityType, EntityLookupConfig> = {
  venue: {
    tableName: "venue_profiles",
    displayColumns: ["name", "venue_name", "display_name"],
  },
  organization: {
    tableName: "organizer_accounts",
    displayColumns: ["name", "organization_name", "display_name"],
  },
  artist: {
    tableName: "artist_profiles",
    displayColumns: ["name", "artist_name", "display_name", "stage_name"],
  },
}

function normalizeHiringEntityInput(args: ResolveHiringEntityArgs): HiringServiceResult<{
  entityType: HiringEntityType
  entityId: string
}> {
  if (args.entityType && args.entityId) {
    return ok({ entityType: args.entityType, entityId: normalizeHiringEntityId(args.entityId) })
  }

  if (args.venueId) {
    return ok({ entityType: "venue", entityId: normalizeHiringEntityId(args.venueId) })
  }

  return fail({
    code: "BAD_REQUEST",
    message: "Unable to resolve hiring entity. Provide entityType/entityId or legacy venueId.",
  })
}

function getFirstDisplayValue(row: Record<string, unknown> | null, columns: string[]): string | undefined {
  if (!row) return undefined

  for (const column of columns) {
    const value = row[column]
    if (typeof value === "string" && value.trim().length > 0) return value
  }

  return undefined
}

export async function resolveHiringEntityDisplayName({
  supabase,
  entityType,
  entityId,
  fallback,
}: {
  supabase: SupabaseClient
  entityType: HiringEntityType
  entityId: string
  fallback?: string
}): Promise<string> {
  if (fallback?.trim()) return fallback

  const config = ENTITY_LOOKUP_CONFIG[entityType]
  const selectColumns = ["id", ...config.displayColumns].join(",")

  const { data } = await supabase
    .from(config.tableName)
    .select(selectColumns)
    .eq("id", entityId)
    .maybeSingle()

  const displayName = getFirstDisplayValue(data as Record<string, unknown> | null, config.displayColumns)

  return displayName || `${entityType}:${entityId}`
}

/**
 * Resolves the active hiring employer for every hiring/onboarding mutation.
 */
export async function resolveHiringEntity(args: ResolveHiringEntityArgs): Promise<HiringServiceResult<HiringEntity>> {
  const normalizedResult = normalizeHiringEntityInput(args)
  if (!normalizedResult.ok) return normalizedResult

  const { entityType, entityId } = normalizedResult.data

  const employer: HiringEntity = {
    entityType,
    entityId,
    displayName: await resolveHiringEntityDisplayName({
      supabase: args.supabase,
      entityType,
      entityId,
      fallback: args.displayName,
    }),
    scope: {
      eventId: args.eventId,
      tourId: args.tourId,
      venueId: args.venueId && entityType !== "venue" ? args.venueId : undefined,
    },
  }

  if (args.requirePermission === false) return ok(employer)

  const permissionResult = await canManageHiring({
    supabase: args.supabase,
    userId: args.userId,
    employer,
  })

  if (!permissionResult.ok) return permissionResult

  if (!permissionResult.data.allowed) {
    return fail({
      code: "FORBIDDEN",
      message: permissionResult.data.reason || "User cannot manage hiring for this employer.",
    })
  }

  return ok(employer)
}

export function createLegacyVenueHiringEntity({
  venueId,
  displayName,
}: {
  venueId: string
  displayName?: string
}): HiringEntity {
  return {
    entityType: "venue",
    entityId: venueId,
    displayName: displayName || `venue:${venueId}`,
  }
}
