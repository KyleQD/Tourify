/**
 * EVENT-101 — Canonical event access service.
 *
 * Builder, command center, advance, day sheet, files, and live ops should
 * resolve authority here so org membership, tour collaborators, and legacy
 * owners behave consistently. Child mutations re-check parent org chains.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { assertChildParentOrgChain } from "@/lib/admin/org-scoped-mutation"


type SupabaseLike = { from: (table: string) => any; rpc?: (...args: any[]) => any }

export type EventAccessRelation =
  | "org_member"
  | "tour_collaborator"
  | "legacy_owner"
  | "none"

export class EventAccessDeniedError extends Error {
  readonly status = 404
  readonly code = "entity_not_found"

  constructor(message = "Event not found.") {
    super(message)
    this.name = "EventAccessDeniedError"
  }
}

export class EventCapabilityDeniedError extends Error {
  readonly status = 403
  readonly code = "capability_denied"

  constructor(capability: AdminCapability) {
    super(`Missing capability ${capability}.`)
    this.name = "EventCapabilityDeniedError"
  }
}

export interface EventAccessRecord {
  eventId: string
  orgId: string | null
  status: string | null
  title: string | null
  relation: Exclude<EventAccessRelation, "none">
  collaboratorRole: string | null
  createdBy: string | null
}

export interface ResolveEventAccessInput {
  supabase: SupabaseLike
  userId: string
  eventId: string
  /** Acting organization — when set, event.org_id must match (cross-org → not found). */
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

async function loadTourCollaboratorForEvent(
  supabase: SupabaseLike,
  userId: string,
  eventId: string,
): Promise<{ role: string | null } | null> {
  const { data: links, error: linkError } = await supabase
    .from("tour_events")
    .select("tour_id")
    .eq("event_id", eventId)
    .limit(25)

  if (linkError) throw new Error(linkError.message)
  const tourIds = (links ?? [])
    .map((row: { tour_id?: string }) => row.tour_id)
    .filter((id: unknown): id is string => typeof id === "string" && Boolean(id))

  if (tourIds.length === 0) return null

  for (const tourId of tourIds) {
    const { data, error } = await supabase
      .from("tour_team_members")
      .select("id, role, status, is_active")
      .eq("tour_id", tourId)
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.id) continue

    const status = String(data.status || "").toLowerCase()
    const active = data.is_active !== false
    if (!active || (status && status !== "confirmed" && status !== "active" && status !== "accepted")) {
      continue
    }
    return { role: typeof data.role === "string" ? data.role : null }
  }

  return null
}

export async function resolveEventAccess(
  input: ResolveEventAccessInput,
): Promise<EventAccessRecord | null> {
  const { data: event, error } = await input.supabase
    .from("events_v2")
    .select("id, org_id, status, title, created_by")
    .eq("id", input.eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!event?.id) return null

  const eventOrgId = (event.org_id as string | null) ?? null

  if (input.orgId && eventOrgId && eventOrgId !== input.orgId) return null

  if (eventOrgId) {
    if (input.orgId && input.orgId !== eventOrgId) return null

    const member = await isOrgMember(input.supabase, input.userId, eventOrgId)
    if (member) {
      return {
        eventId: event.id,
        orgId: eventOrgId,
        status: (event.status as string | null) ?? null,
        title: (event.title as string | null) ?? null,
        relation: "org_member",
        collaboratorRole: null,
        createdBy: (event.created_by as string | null) ?? null,
      }
    }

    const collaborator = await loadTourCollaboratorForEvent(
      input.supabase,
      input.userId,
      event.id,
    )
    if (collaborator) {
      if (input.orgId && input.orgId !== eventOrgId) return null
      return {
        eventId: event.id,
        orgId: eventOrgId,
        status: (event.status as string | null) ?? null,
        title: (event.title as string | null) ?? null,
        relation: "tour_collaborator",
        collaboratorRole: collaborator.role,
        createdBy: (event.created_by as string | null) ?? null,
      }
    }

    return null
  }

  const ownerId = (event.created_by as string | null) ?? null
  if (ownerId && ownerId === input.userId) {
    if (input.orgId) return null
    return {
      eventId: event.id,
      orgId: null,
      status: (event.status as string | null) ?? null,
      title: (event.title as string | null) ?? null,
      relation: "legacy_owner",
      collaboratorRole: null,
      createdBy: ownerId,
    }
  }

  return null
}

export async function requireEventAccess(
  input: ResolveEventAccessInput,
): Promise<EventAccessRecord> {
  const access = await resolveEventAccess(input)
  if (!access) throw new EventAccessDeniedError()
  return access
}

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
  if (capability === "event.view" || capability === "tour.view") return true
  if (
    capability === "event.manage"
    || capability === "event.publish"
    || capability === "event.live_ops"
    || capability === "advance.manage"
    || capability === "tour.manage"
    || capability === "routing.manage"
    || capability === "logistics.view"
    || capability === "logistics.manage"
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

export interface RequireEventCapabilityInput extends ResolveEventAccessInput {
  capability: AdminCapability
  capabilities?: readonly AdminCapability[]
}

export async function requireEventCapability(
  input: RequireEventCapabilityInput,
): Promise<EventAccessRecord> {
  const access = await requireEventAccess(input)

  if (access.relation === "org_member" || access.relation === "legacy_owner") {
    const caps = input.capabilities || []
    if (!hasAdminCapability(caps, input.capability)) {
      throw new EventCapabilityDeniedError(input.capability)
    }
    return access
  }

  if (access.relation === "tour_collaborator") {
    if (!collaboratorHasCapability(access.collaboratorRole, input.capability)) {
      throw new EventCapabilityDeniedError(input.capability)
    }
    return access
  }

  throw new EventAccessDeniedError()
}

export async function requireEventChildAccess(input: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string
  childTable: string
  childId: string
  parentFkColumn?: string
  capability?: AdminCapability
  capabilities?: readonly AdminCapability[]
}): Promise<EventAccessRecord> {
  const access = input.capability
    ? await requireEventCapability({
        supabase: input.supabase,
        userId: input.userId,
        eventId: input.eventId,
        orgId: input.orgId,
        capability: input.capability,
        capabilities: input.capabilities,
      })
    : await requireEventAccess({
        supabase: input.supabase,
        userId: input.userId,
        eventId: input.eventId,
        orgId: input.orgId,
      })

  if (!access.orgId) throw new EventAccessDeniedError("Event organization is required for child checks.")

  await assertChildParentOrgChain(input.supabase, input.orgId, {
    parentTable: "events_v2",
    parentId: input.eventId,
    childTable: input.childTable,
    childId: input.childId,
    parentFkColumn: input.parentFkColumn || "event_id",
  })

  return access
}

export function getEventAccessErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof EventAccessDeniedError) return error.status
  if (error instanceof EventCapabilityDeniedError) return error.status
  return fallback
}
