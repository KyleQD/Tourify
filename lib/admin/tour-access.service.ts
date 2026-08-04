/**
 * TOUR-102 — Canonical tour access service.
 *
 * All Admin tour panels and legacy delegates should resolve authority here so
 * org membership, collaborators, and legacy owners behave consistently.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export type TourAccessRelation =
  | "org_member"
  | "tour_collaborator"
  | "legacy_owner"
  | "none"

export class TourAccessDeniedError extends Error {
  readonly status = 404
  readonly code = "entity_not_found"

  constructor(message = "Tour not found.") {
    super(message)
    this.name = "TourAccessDeniedError"
  }
}

export class TourCapabilityDeniedError extends Error {
  readonly status = 403
  readonly code = "capability_denied"

  constructor(capability: AdminCapability) {
    super(`Missing capability ${capability}.`)
    this.name = "TourCapabilityDeniedError"
  }
}

export interface TourAccessRecord {
  tourId: string
  orgId: string | null
  status: string | null
  name: string | null
  relation: Exclude<TourAccessRelation, "none">
  collaboratorRole: string | null
  createdBy: string | null
  userId: string | null
}

export interface ResolveTourAccessInput {
  supabase: SupabaseLike
  userId: string
  tourId: string
  /** Acting organization — when set, tour.org_id must match (cross-org → not found). */
  orgId?: string | null
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

async function loadCollaborator(
  supabase: SupabaseLike,
  userId: string,
  tourId: string,
): Promise<{ role: string | null } | null> {
  const { data, error } = await supabase
    .from("tour_team_members")
    .select("id, role, status, is_active")
    .eq("tour_id", tourId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) return null
  const status = String(data.status || "").toLowerCase()
  const active = data.is_active !== false
  if (!active || (status && status !== "confirmed" && status !== "active" && status !== "accepted")) {
    return null
  }
  return { role: typeof data.role === "string" ? data.role : null }
}

/**
 * Resolve how the actor relates to the tour. Returns null when denied
 * (callers that need 404 semantics should use requireTourAccess).
 */
export async function resolveTourAccess(
  input: ResolveTourAccessInput,
): Promise<TourAccessRecord | null> {
  const { data: tour, error } = await input.supabase
    .from("tours")
    .select("id, org_id, status, name, created_by, user_id")
    .eq("id", input.tourId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!tour?.id) return null

  const tourOrgId = (tour.org_id as string | null) ?? null

  if (input.orgId && tourOrgId && tourOrgId !== input.orgId) return null

  if (tourOrgId) {
    if (input.orgId && input.orgId !== tourOrgId) return null

    const member = await isOrgMember(input.supabase, input.userId, tourOrgId)
    if (member) {
      return {
        tourId: tour.id,
        orgId: tourOrgId,
        status: (tour.status as string | null) ?? null,
        name: (tour.name as string | null) ?? null,
        relation: "org_member",
        collaboratorRole: null,
        createdBy: (tour.created_by as string | null) ?? null,
        userId: (tour.user_id as string | null) ?? null,
      }
    }

    const collaborator = await loadCollaborator(input.supabase, input.userId, tour.id)
    if (collaborator) {
      // Acting org must still match when provided (collaborator cannot pivot orgs).
      if (input.orgId && input.orgId !== tourOrgId) return null
      return {
        tourId: tour.id,
        orgId: tourOrgId,
        status: (tour.status as string | null) ?? null,
        name: (tour.name as string | null) ?? null,
        relation: "tour_collaborator",
        collaboratorRole: collaborator.role,
        createdBy: (tour.created_by as string | null) ?? null,
        userId: (tour.user_id as string | null) ?? null,
      }
    }

    return null
  }

  // Legacy rows without org_id: owner-only.
  const ownerId = (tour.created_by as string | null) || (tour.user_id as string | null)
  if (ownerId && ownerId === input.userId) {
    if (input.orgId) return null
    return {
      tourId: tour.id,
      orgId: null,
      status: (tour.status as string | null) ?? null,
      name: (tour.name as string | null) ?? null,
      relation: "legacy_owner",
      collaboratorRole: null,
      createdBy: (tour.created_by as string | null) ?? null,
      userId: (tour.user_id as string | null) ?? null,
    }
  }

  return null
}

export async function requireTourAccess(
  input: ResolveTourAccessInput,
): Promise<TourAccessRecord> {
  const access = await resolveTourAccess(input)
  if (!access) throw new TourAccessDeniedError()
  return access
}

/** Collaborator roles that may mutate tour planning surfaces. */
const COLLABORATOR_MANAGE_ROLES = new Set([
  "admin",
  "tour_manager",
  "manager",
  "owner",
  "lead",
])

function collaboratorHasCapability(
  role: string | null,
  capability: AdminCapability,
): boolean {
  if (capability === "tour.view") return true
  if (
    capability === "tour.manage"
    || capability === "tour.publish"
    || capability === "event.view"
    || capability === "event.manage"
    || capability === "logistics.view"
    || capability === "logistics.manage"
    || capability === "routing.manage"
    || capability === "advance.manage"
    || capability === "workforce.view"
    || capability === "workforce.manage"
    || capability === "vendor.view"
    || capability === "vendor.manage"
    || capability === "ticketing.view"
    || capability === "ticketing.manage"
    || capability === "site_map.view"
    || capability === "site_map.edit"
    || capability === "communications.send"
  ) {
    return Boolean(role && COLLABORATOR_MANAGE_ROLES.has(role.toLowerCase()))
  }
  return false
}

export interface RequireTourCapabilityInput extends ResolveTourAccessInput {
  capability: AdminCapability
  /** Effective org capabilities for org_member / legacy_owner relations. */
  capabilities?: readonly AdminCapability[]
}

/**
 * Require tour access + capability. Collaborators use role defaults;
 * org members use the acting capability set.
 */
export async function requireTourCapability(
  input: RequireTourCapabilityInput,
): Promise<TourAccessRecord> {
  const access = await requireTourAccess(input)

  if (access.relation === "org_member" || access.relation === "legacy_owner") {
    const caps = input.capabilities || []
    if (!hasAdminCapability(caps, input.capability)) {
      throw new TourCapabilityDeniedError(input.capability)
    }
    return access
  }

  if (access.relation === "tour_collaborator") {
    if (!collaboratorHasCapability(access.collaboratorRole, input.capability)) {
      throw new TourCapabilityDeniedError(input.capability)
    }
    return access
  }

  throw new TourAccessDeniedError()
}

export function getTourAccessErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof TourAccessDeniedError) return error.status
  if (error instanceof TourCapabilityDeniedError) return error.status
  return fallback
}
