import type { SupabaseClient } from "@supabase/supabase-js"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"

export interface HiringPermissionArgs {
  supabase: SupabaseClient
  userId: string
  employer: HiringEntity
}

export interface HiringPermissionResult {
  allowed: boolean
  reason?: string
}

/**
 * Checks whether a user can manage hiring for a Venue, Organization, or Artist.
 *
 * This relies on the Phase 1 SQL RPC `public.can_manage_hiring(user_id, entity_type, entity_id)`.
 * Keep the permission details in the database/RBAC layer so every API and service receives
 * the same answer for the same actor + employer pair.
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

  const { data, error } = await supabase.rpc("can_manage_hiring", {
    user_id: userId,
    entity_type: employer.entityType,
    entity_id: employer.entityId,
  })

  if (error) {
    return fail({
      code: "DATABASE_ERROR",
      message: "Unable to check hiring permissions.",
      details: error,
    })
  }

  return ok({
    allowed: Boolean(data),
    reason: Boolean(data) ? undefined : "User does not have hiring management access for this employer.",
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
