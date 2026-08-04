/**
 * WORK-102 — Organization and assignment authority for workforce commands.
 *
 * Every admin workforce mutation validates acting org scope plus tour / event /
 * team / staff-member parents before write. Field visibility is separate
 * (`workforce-field-projections.ts`).
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { requireEventAccess } from "@/lib/admin/event-access.service"
import { requireTourAccess } from "@/lib/admin/tour-access.service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export class WorkforceAccessDeniedError extends Error {
  readonly status = 404
  readonly code = "entity_not_found"

  constructor(message = "Workforce resource not found.") {
    super(message)
    this.name = "WorkforceAccessDeniedError"
  }
}

export class WorkforceCapabilityDeniedError extends Error {
  readonly status = 403
  readonly code = "capability_denied"

  constructor(capability: AdminCapability) {
    super(`Missing capability ${capability}.`)
    this.name = "WorkforceCapabilityDeniedError"
  }
}

export class WorkforceParentValidationError extends Error {
  readonly status = 422
  readonly code = "parent_validation_failed"

  constructor(message: string) {
    super(message)
    this.name = "WorkforceParentValidationError"
  }
}

export class WorkforceOrgScopeError extends Error {
  readonly status = 422
  readonly code = "org_scope_required"

  constructor(message = "Acting organization scope is required for workforce commands.") {
    super(message)
    this.name = "WorkforceOrgScopeError"
  }
}

export interface WorkforceOrgAccessInput {
  supabase: SupabaseLike
  userId: string
  orgId: string
}

async function isOrgMember(
  supabase: SupabaseLike,
  userId: string,
  orgId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data?.org_id)
}

/** Require acting org membership (never invent org_id). */
export async function requireWorkforceOrgAccess(
  input: WorkforceOrgAccessInput,
): Promise<{ orgId: string }> {
  if (!input.orgId?.trim()) throw new WorkforceOrgScopeError()
  const member = await isOrgMember(input.supabase, input.userId, input.orgId)
  if (!member) throw new WorkforceAccessDeniedError()
  return { orgId: input.orgId }
}

export async function requireWorkforceCapability(args: {
  capabilities: readonly AdminCapability[]
  capability: AdminCapability
}): Promise<void> {
  if (!hasAdminCapability(args.capabilities, args.capability))
    throw new WorkforceCapabilityDeniedError(args.capability)
}

/** Tour must exist and belong to the acting organization. */
export async function validateTourParent(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
}): Promise<{ tourId: string; orgId: string }> {
  await requireWorkforceOrgAccess(args)
  const access = await requireTourAccess({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })
  if (!access.orgId || access.orgId !== args.orgId)
    throw new WorkforceParentValidationError("Tour is outside the acting organization.")
  return { tourId: access.tourId, orgId: access.orgId }
}

/** Event must exist and belong to the acting organization. */
export async function validateEventParent(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  eventId: string
}): Promise<{ eventId: string; orgId: string }> {
  await requireWorkforceOrgAccess(args)
  const access = await requireEventAccess({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    orgId: args.orgId,
  })
  if (!access.orgId || access.orgId !== args.orgId)
    throw new WorkforceParentValidationError("Event is outside the acting organization.")
  return { eventId: access.eventId, orgId: access.orgId }
}

/** Team must belong to the supplied tour. */
export async function validateTeamParent(args: {
  supabase: SupabaseLike
  tourId: string
  teamId: string
}): Promise<{ teamId: string; tourId: string }> {
  const { data, error } = await args.supabase
    .from("tour_teams")
    .select("id, tour_id")
    .eq("id", args.teamId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) throw new WorkforceParentValidationError("Team not found.")
  if (data.tour_id !== args.tourId)
    throw new WorkforceParentValidationError("Team does not belong to this tour.")
  return { teamId: data.id as string, tourId: data.tour_id as string }
}

/**
 * Staff member must be scoped to the acting org via org_id or organization employer.
 * Venue-only roster rows without org_id are rejected for org-scoped commands.
 */
export async function validateStaffMemberParent(args: {
  supabase: SupabaseLike
  orgId: string
  staffMemberId: string
}): Promise<{ staffMemberId: string; orgId: string }> {
  if (!args.orgId?.trim()) throw new WorkforceOrgScopeError()

  // entity_type / entity_id do not exist on staff_members — use the real
  // employer_entity_type / employer_entity_id columns and org_id.
  const { data, error } = await args.supabase
    .from("staff_members")
    .select("id, org_id, employer_entity_type, employer_entity_id")
    .eq("id", args.staffMemberId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) throw new WorkforceParentValidationError("Staff member not found.")

  const rowOrg =
    (typeof data.org_id === "string" && data.org_id)
    || (data.employer_entity_type === "organization" && typeof data.employer_entity_id === "string"
      ? data.employer_entity_id
      : null)

  if (!rowOrg || rowOrg !== args.orgId)
    throw new WorkforceParentValidationError("Staff member is outside the acting organization.")

  return { staffMemberId: data.id as string, orgId: args.orgId }
}

export interface ValidateWorkforceAssignmentParentsInput {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId?: string | null
  eventId?: string | null
  teamId?: string | null
  staffMemberId?: string | null
  /** Role string is informational; presence validated when required by caller. */
  role?: string | null
  requireRole?: boolean
}

/**
 * Validate tour / event / team / staff parents for an assignment-style write.
 */
export async function validateWorkforceAssignmentParents(
  input: ValidateWorkforceAssignmentParentsInput,
): Promise<{ orgId: string }> {
  await requireWorkforceOrgAccess(input)

  if (input.requireRole && !input.role?.trim())
    throw new WorkforceParentValidationError("Role is required for this assignment.")

  if (input.tourId)
    await validateTourParent({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      tourId: input.tourId,
    })

  if (input.eventId)
    await validateEventParent({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      eventId: input.eventId,
    })

  if (input.teamId) {
    if (!input.tourId)
      throw new WorkforceParentValidationError("tour_id is required when validating team_id.")
    await validateTeamParent({
      supabase: input.supabase,
      tourId: input.tourId,
      teamId: input.teamId,
    })
  }

  if (input.staffMemberId)
    await validateStaffMemberParent({
      supabase: input.supabase,
      orgId: input.orgId,
      staffMemberId: input.staffMemberId,
    })

  return { orgId: input.orgId }
}

export function workforceAuthorityErrorResponse(
  error: unknown,
  fallback: string,
): { message: string; status: number; code?: string } {
  if (
    error instanceof WorkforceAccessDeniedError
    || error instanceof WorkforceCapabilityDeniedError
    || error instanceof WorkforceParentValidationError
    || error instanceof WorkforceOrgScopeError
  ) {
    return { message: error.message, status: error.status, code: error.code }
  }
  if (error instanceof Error) return { message: error.message || fallback, status: 500 }
  return { message: fallback, status: 500 }
}
