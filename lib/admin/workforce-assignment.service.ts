/**
 * WORK-103 — Canonical workforce assignment service.
 *
 * Unifies person/role/assignment identity and status transitions across
 * roster, tour team, scheduling, hiring conversion, calendar, and Work Mode.
 * Persists to existing tables (staff_members + employment_assignments); does
 * not create WORK-401 tour_party / tour_role tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  assertAssignmentTransition,
  mapAssignmentStatusToShift,
  mapRosterStatusToAssignment,
  mapShiftStatusToAssignment,
  presentTourMemberAssignmentStatus,
} from "@/lib/admin/workforce-assignment-status"

export { presentTourMemberAssignmentStatus }
import { syncEmploymentAssignmentForShift, type StaffShiftRow } from "@/lib/services/staff-shift-assignment-sync"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"
import type { EmploymentAssignmentStatus, RosterMemberStatus } from "@/types/hiring-roster-work-mode"

export type WorkforceAssignmentSource =
  | "employment_assignments"
  | "staff_members"
  | "staff_shifts"
  | "tour_team_members"
  | "event_participants"

export interface WorkforceAssignmentIdentity {
  userId: string | null
  staffMemberId: string | null
  employmentAssignmentId: string | null
  roleTitle: string
  department: string | null
  orgId: string | null
  employerEntityType: string | null
  employerEntityId: string | null
  scope: {
    tourId: string | null
    eventId: string | null
    staffShiftId: string | null
  }
  status: EmploymentAssignmentStatus
  sources: WorkforceAssignmentSource[]
}

export interface ResolveAssignmentIdentityInput {
  supabase?: SupabaseClient
  userId?: string | null
  staffMemberId?: string | null
  employmentAssignmentId?: string | null
  staffShiftId?: string | null
  orgId?: string | null
}

export interface TransitionAssignmentStatusInput {
  supabase?: SupabaseClient
  orgId?: string | null
  employmentAssignmentId: string
  toStatus: EmploymentAssignmentStatus
  /** When linked, mirror status onto staff_shifts. */
  syncLinkedShift?: boolean
  actorUserId?: string | null
}

export interface UpsertShiftLinkedAssignmentInput {
  supabase?: SupabaseClient
  shift: StaffShiftRow
  notify?: boolean
  assignmentStatus?: EmploymentAssignmentStatus
  actorUserId?: string | null
  changeSummary?: string | null
  cancelled?: boolean
}

async function getDb(
  supabase: SupabaseClient | undefined,
  orgId: string | null | undefined,
  reason: string,
): Promise<SupabaseClient> {
  if (supabase) return supabase
  if (!orgId) throw new Error("A verified orgId is required for privileged workforce assignment access.")
  return executeServiceRoleJob(
    { orgId, reason, moduleId: "admin.workforce.assignment" },
    async (client) => client,
  )
}

function asStatus(value: unknown, fallback: EmploymentAssignmentStatus = "invited"): EmploymentAssignmentStatus {
  const text = String(value || "").toLowerCase()
  if (
    text === "invited"
    || text === "confirmed"
    || text === "active"
    || text === "completed"
    || text === "cancelled"
  ) {
    return text
  }
  return fallback
}

/**
 * Resolve a single person/role/assignment identity from any known key.
 * Prefers employment_assignments, then staff_members, then shift bridge.
 */
export async function resolveAssignmentIdentity(
  input: ResolveAssignmentIdentityInput,
): Promise<WorkforceAssignmentIdentity | null> {
  const db = await getDb(input.supabase, input.orgId, "Resolve workforce assignment identity")
  const sources: WorkforceAssignmentSource[] = []

  let employment: Record<string, unknown> | null = null

  if (input.employmentAssignmentId) {
    const { data, error } = await db
      .from("employment_assignments")
      .select(
        "id, user_id, staff_member_id, staff_shift_id, event_id, tour_id, role_title, department, status, employer_entity_type, employer_entity_id",
      )
      .eq("id", input.employmentAssignmentId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    employment = data
    if (employment) sources.push("employment_assignments")
  }

  if (!employment && input.staffShiftId) {
    const { data, error } = await db
      .from("employment_assignments")
      .select(
        "id, user_id, staff_member_id, staff_shift_id, event_id, tour_id, role_title, department, status, employer_entity_type, employer_entity_id",
      )
      .eq("staff_shift_id", input.staffShiftId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    employment = data
    if (employment) sources.push("employment_assignments", "staff_shifts")
  }

  let staffMember: Record<string, unknown> | null = null
  const staffMemberId =
    input.staffMemberId
    || (typeof employment?.staff_member_id === "string" ? employment.staff_member_id : null)

  if (staffMemberId) {
    const { data, error } = await db
      .from("staff_members")
      .select("id, user_id, org_id, position, department, status, employer_entity_type, employer_entity_id")
      .eq("id", staffMemberId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    staffMember = data
    if (staffMember) sources.push("staff_members")
  }

  if (!employment && !staffMember && input.userId) {
    let query = db
      .from("employment_assignments")
      .select(
        "id, user_id, staff_member_id, staff_shift_id, event_id, tour_id, role_title, department, status, employer_entity_type, employer_entity_id",
      )
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
    if (input.orgId) {
      // Prefer employer organization match when org filter provided.
      query = query.eq("employer_entity_id", input.orgId)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    employment = data
    if (employment) sources.push("employment_assignments")
  }

  if (!employment && !staffMember) return null

  const userId =
    (typeof employment?.user_id === "string" && employment.user_id)
    || (typeof staffMember?.user_id === "string" && staffMember.user_id)
    || input.userId
    || null

  const roleTitle =
    (typeof employment?.role_title === "string" && employment.role_title.trim())
    || (typeof staffMember?.position === "string" && staffMember.position.trim())
    || "Staff"

  const department =
    (typeof employment?.department === "string" && employment.department)
    || (typeof staffMember?.department === "string" && staffMember.department)
    || null

  const orgId =
    (typeof staffMember?.org_id === "string" && staffMember.org_id)
    || (employment?.employer_entity_type === "organization"
      && typeof employment.employer_entity_id === "string"
      ? employment.employer_entity_id
      : null)
    || input.orgId
    || null

  let status: EmploymentAssignmentStatus = "invited"
  if (employment?.status) status = asStatus(employment.status)
  else if (staffMember?.status)
    status = mapRosterStatusToAssignment(staffMember.status as RosterMemberStatus) || "invited"

  return {
    userId,
    staffMemberId: (typeof staffMember?.id === "string" && staffMember.id) || staffMemberId,
    employmentAssignmentId: (typeof employment?.id === "string" && employment.id) || null,
    roleTitle,
    department,
    orgId,
    employerEntityType:
      (typeof employment?.employer_entity_type === "string" && employment.employer_entity_type)
      || (typeof staffMember?.employer_entity_type === "string" && staffMember.employer_entity_type)
      || null,
    employerEntityId:
      (typeof employment?.employer_entity_id === "string" && employment.employer_entity_id)
      || (typeof staffMember?.employer_entity_id === "string" && staffMember.employer_entity_id)
      || null,
    scope: {
      tourId: (typeof employment?.tour_id === "string" && employment.tour_id) || null,
      eventId: (typeof employment?.event_id === "string" && employment.event_id) || null,
      staffShiftId:
        (typeof employment?.staff_shift_id === "string" && employment.staff_shift_id)
        || input.staffShiftId
        || null,
    },
    status,
    sources: Array.from(new Set(sources)),
  }
}

/**
 * Transition employment assignment status with optional linked shift mirror.
 */
export async function transitionAssignmentStatus(
  input: TransitionAssignmentStatusInput,
): Promise<WorkforceAssignmentIdentity> {
  const db = await getDb(input.supabase, input.orgId, "Transition workforce assignment status")

  const { data: existing, error } = await db
    .from("employment_assignments")
    .select(
      "id, user_id, staff_member_id, staff_shift_id, event_id, tour_id, role_title, department, status, employer_entity_type, employer_entity_id",
    )
    .eq("id", input.employmentAssignmentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!existing?.id) throw new Error("Assignment not found")

  const fromStatus = asStatus(existing.status)
  assertAssignmentTransition(fromStatus, input.toStatus)

  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from("employment_assignments")
    .update({ status: input.toStatus, updated_at: now })
    .eq("id", existing.id)

  if (updateError) throw new Error(updateError.message)

  if (input.syncLinkedShift !== false && existing.staff_shift_id) {
    const shiftStatus = mapAssignmentStatusToShift(input.toStatus)
    await db
      .from("staff_shifts")
      .update({ status: shiftStatus, updated_at: now })
      .eq("id", existing.staff_shift_id)
  }

  const identity = await resolveAssignmentIdentity({
    supabase: db,
    employmentAssignmentId: existing.id as string,
  })
  if (!identity) throw new Error("Failed to resolve assignment after transition")
  return identity
}

/**
 * Canonical entry for scheduling ↔ Work Mode sync.
 */
export async function upsertShiftLinkedAssignment(
  input: UpsertShiftLinkedAssignmentInput,
) {
  const status = mapShiftStatusToAssignment(input.shift.status, {
    override: input.assignmentStatus,
    cancelled: input.cancelled,
  })

  return syncEmploymentAssignmentForShift({
    supabase: input.supabase,
    shift: input.shift,
    notify: input.notify,
    assignmentStatus:
      status === "active" || status === "completed"
        ? "confirmed"
        : status === "cancelled"
          ? "cancelled"
          : status === "confirmed"
            ? "confirmed"
            : "invited",
    actorUserId: input.actorUserId,
    changeSummary: input.changeSummary,
    cancelled: input.cancelled || status === "cancelled",
  })
}

export async function enrichShiftMetaWithAssignment(args: {
  supabase: SupabaseClient
  staffMemberId?: string | null
  staffShiftId: string
  orgId?: string | null
}): Promise<Partial<WorkforceAssignmentIdentity> & { assignmentStatus?: EmploymentAssignmentStatus }> {
  const identity = await resolveAssignmentIdentity({
    supabase: args.supabase,
    staffMemberId: args.staffMemberId,
    staffShiftId: args.staffShiftId,
    orgId: args.orgId,
  })
  if (!identity) return {}
  return {
    userId: identity.userId,
    staffMemberId: identity.staffMemberId,
    employmentAssignmentId: identity.employmentAssignmentId,
    roleTitle: identity.roleTitle,
    assignmentStatus: identity.status,
    orgId: identity.orgId,
  }
}
