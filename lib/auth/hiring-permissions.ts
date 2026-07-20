import type { SupabaseClient } from "@supabase/supabase-js"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"
import { hasEntityPermission } from "@/lib/services/rbac"

export interface HiringPermissionArgs {
  supabase: SupabaseClient
  userId: string
  employer: HiringEntity
}

export interface HiringPermissionResult {
  allowed: boolean
  reason?: string
}

const RBAC_ENTITY_TYPE: Record<HiringEntity["entityType"], string> = {
  venue: "Venue",
  organization: "Organizer",
  artist: "Artist",
}

interface OwnershipProbe {
  tableName: string
  userColumn: string
}

const OWNER_PROBES: Record<HiringEntity["entityType"], OwnershipProbe[]> = {
  venue: [
    { tableName: "venue_profiles", userColumn: "user_id" },
    { tableName: "venue_profiles", userColumn: "main_profile_id" },
    { tableName: "venues", userColumn: "owner_id" },
    { tableName: "venues", userColumn: "user_id" },
  ],
  organization: [
    { tableName: "organizer_accounts", userColumn: "user_id" },
    { tableName: "organizations", userColumn: "owner_id" },
    { tableName: "organizations", userColumn: "user_id" },
    { tableName: "organizations", userColumn: "created_by" },
  ],
  artist: [
    { tableName: "artist_profiles", userColumn: "user_id" },
    { tableName: "artist_profiles", userColumn: "main_profile_id" },
  ],
}

async function hasDirectEntityOwnership({
  supabase,
  userId,
  employer,
}: HiringPermissionArgs): Promise<boolean> {
  for (const probe of OWNER_PROBES[employer.entityType]) {
    try {
      const { data, error } = await supabase
        .from(probe.tableName)
        .select("id")
        .eq("id", employer.entityId)
        .eq(probe.userColumn, userId)
        .limit(1)
        .maybeSingle()

      if (!error && data) return true
    } catch {
      // Some deployments do not have every legacy table/column. Keep probing.
    }
  }

  return false
}

async function checkLegacyEntityPermission(userId: string, employer: HiringEntity): Promise<boolean> {
  const entityType = RBAC_ENTITY_TYPE[employer.entityType]
  const assignRoles = await hasEntityPermission({
    userId,
    entityType,
    entityId: employer.entityId,
    permission: "ASSIGN_EVENT_ROLES",
  })
  if (assignRoles) return true

  return hasEntityPermission({
    userId,
    entityType,
    entityId: employer.entityId,
    permission: "MANAGE_MEMBERS",
  })
}

/**
 * Checks whether a user can manage hiring for a Venue, Organization, or Artist.
 */
export async function canManageHiring({
  supabase,
  userId,
  employer,
}: HiringPermissionArgs): Promise<HiringServiceResult<HiringPermissionResult>> {
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "A signed-in user is required." })
  }

  if (!employer.entityType || !employer.entityId) {
    return fail({ code: "BAD_REQUEST", message: "A hiring employer entity is required." })
  }

  const isDirectOwner = await hasDirectEntityOwnership({ supabase, userId, employer })
  if (isDirectOwner) return ok({ allowed: true })

  // Legacy organizer accounts expose a composite profile_id (`${userId}-organizer-${slug}`)
  // that normalizes to the acting user's own auth id. That identity is self-owned by
  // definition, so grant hiring access without a membership row.
  const isSelfOwnedOrganizer = employer.entityType === "organization" && employer.entityId === userId
  if (isSelfOwnedOrganizer) return ok({ allowed: true })

  const { data, error } = await supabase.rpc("can_manage_hiring", {
    p_user_id: userId,
    p_entity_type: employer.entityType,
    p_entity_id: employer.entityId,
  })

  if (!error && Boolean(data)) {
    return ok({ allowed: true })
  }

  if (error && !error.message?.includes("does not exist")) {
    const legacyAllowed = await checkLegacyEntityPermission(userId, employer)
    if (legacyAllowed) return ok({ allowed: true })

    return fail({
      code: "DATABASE_ERROR",
      message: "Unable to check hiring permissions.",
      details: error,
    })
  }

  const legacyAllowed = await checkLegacyEntityPermission(userId, employer)
  if (legacyAllowed) return ok({ allowed: true })

  return ok({
    allowed: false,
    reason: "User does not have hiring management access for this employer.",
  })
}

export async function canReviewApplications(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<HiringPermissionResult>> {
  return canManageHiring(args)
}

export async function canManageOnboardingTemplates(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<HiringPermissionResult>> {
  return canManageHiring(args)
}

export async function canInviteStaff(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<HiringPermissionResult>> {
  return canManageHiring(args)
}

export async function canAssignWorkMode(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<HiringPermissionResult>> {
  return canManageHiring(args)
}

export async function assertCanManageHiring(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<true>> {
  const permissionResult = await canManageHiring(args)

  if (!permissionResult.ok) return permissionResult

  if (!permissionResult.data.allowed) {
    return fail({
      code: "FORBIDDEN",
      message: permissionResult.data.reason || "You do not have permission to manage hiring for this employer.",
    })
  }

  return ok(true)
}

/**
 * Narrower than canManageHiring — owner/admin only may reveal raw hiring PII.
 */
export async function canViewHiringPii({
  supabase,
  userId,
  employer,
}: HiringPermissionArgs): Promise<HiringServiceResult<HiringPermissionResult>> {
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "A signed-in user is required." })
  }

  if (!employer.entityType || !employer.entityId) {
    return fail({ code: "BAD_REQUEST", message: "A hiring employer entity is required." })
  }

  const isDirectOwner = await hasDirectEntityOwnership({ supabase, userId, employer })
  if (isDirectOwner) return ok({ allowed: true })

  const isSelfOwnedOrganizer = employer.entityType === "organization" && employer.entityId === userId
  if (isSelfOwnedOrganizer) return ok({ allowed: true })

  const { data, error } = await supabase.rpc("can_view_hiring_pii", {
    p_user_id: userId,
    p_entity_type: employer.entityType,
    p_entity_id: employer.entityId,
  })

  if (!error && Boolean(data)) return ok({ allowed: true })

  if (error && !error.message?.includes("does not exist")) {
    // Fallback: only direct owners when RPC missing/unavailable — never widen to all hiring managers.
    return ok({
      allowed: false,
      reason: "Unable to verify PII access for this employer.",
    })
  }

  return ok({
    allowed: false,
    reason: "Only organization owners and admins can view sensitive hiring data.",
  })
}

export async function assertCanViewHiringPii(
  args: HiringPermissionArgs
): Promise<HiringServiceResult<true>> {
  const permissionResult = await canViewHiringPii(args)

  if (!permissionResult.ok) return permissionResult

  if (!permissionResult.data.allowed) {
    return fail({
      code: "FORBIDDEN",
      message:
        permissionResult.data.reason ||
        "Only organization owners and admins can view sensitive hiring data.",
    })
  }

  return ok(true)
}

/** Legacy venue-only gate — delegates to universal canManageHiring during migration. */
export async function canManageVenueStaffing(input: { userId: string; venueId: string; supabase?: SupabaseClient }) {
  if (input.supabase) {
    const result = await canManageHiring({
      supabase: input.supabase,
      userId: input.userId,
      employer: {
        entityType: "venue",
        entityId: input.venueId,
        displayName: `venue:${input.venueId}`,
      },
    })
    return result.ok && result.data.allowed
  }

  return hasEntityPermission({
    userId: input.userId,
    entityType: "Venue",
    entityId: input.venueId,
    permission: "ASSIGN_EVENT_ROLES",
  })
}

/** Review applications and run onboarding for a venue. */
export async function canReviewStaffingApplications(input: { userId: string; venueId: string; supabase?: SupabaseClient }) {
  return canManageVenueStaffing(input)
}
