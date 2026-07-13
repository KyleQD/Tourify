/**
 * Bridges staff_shifts ↔ employment_assignments so scheduling invites appear in Work Mode
 * and worker accept/decline updates the admin board status.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveHiringEntityDisplayName } from "@/lib/auth/hiring-entity-resolver"
import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"
import {
  sendShiftAssignmentNotification,
  sendShiftCancelledNotification,
  sendShiftResponseNotification,
  sendShiftUpdateNotification,
} from "@/lib/rebuild/shift-assignment-notify"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface StaffShiftRow {
  id: string
  venue_id?: string | null
  event_id?: string | null
  staff_member_id?: string | null
  shift_date?: string | null
  start_time?: string | null
  end_time?: string | null
  role_assignment?: string | null
  zone_assignment?: string | null
  notes?: string | null
  status?: string | null
  created_by?: string | null
}

export interface SyncShiftAssignmentOptions {
  supabase?: SupabaseClient
  shift: StaffShiftRow
  /** When true, send invite/update notification to the worker. */
  notify?: boolean
  /** Force assignment status (defaults from shift.status). */
  assignmentStatus?: "invited" | "confirmed" | "cancelled"
  actorUserId?: string | null
  changeSummary?: string | null
  /** Treat as cancellation (cancel assignment + notify). */
  cancelled?: boolean
}

export interface SyncShiftAssignmentResult {
  assignmentId: string | null
  workerUserId: string | null
  notified: boolean
}

interface StaffMemberRow {
  id: string
  user_id: string | null
  position?: string | null
  department?: string | null
  employer_entity_type?: string | null
  employer_entity_id?: string | null
}

function composeShiftTimestamp(date: unknown, time: unknown): string | null {
  if (typeof date !== "string" || !date) return null
  const timePart = typeof time === "string" && time ? time : "00:00:00"
  const composed = new Date(`${date}T${timePart}`)
  return Number.isNaN(composed.getTime()) ? null : composed.toISOString()
}

function assignmentStatusFromShift(
  shiftStatus: string | null | undefined,
  override?: SyncShiftAssignmentOptions["assignmentStatus"],
  cancelled?: boolean
): "invited" | "confirmed" | "cancelled" {
  if (override) return override
  if (cancelled || shiftStatus === "cancelled") return "cancelled"
  if (shiftStatus === "confirmed" || shiftStatus === "completed") return "confirmed"
  return "invited"
}

function getDb(supabase?: SupabaseClient): SupabaseClient {
  return supabase ?? createServiceRoleClient()
}

export async function syncEmploymentAssignmentForShift(
  options: SyncShiftAssignmentOptions
): Promise<SyncShiftAssignmentResult> {
  const db = getDb(options.supabase)
  const shift = options.shift
  const empty: SyncShiftAssignmentResult = { assignmentId: null, workerUserId: null, notified: false }

  if (!shift?.id || !shift.staff_member_id) return empty

  const { data: member, error: memberError } = await db
    .from("staff_members")
    .select("id, user_id, position, department, employer_entity_type, employer_entity_id")
    .eq("id", shift.staff_member_id)
    .maybeSingle()

  if (memberError || !member?.user_id) {
    if (memberError) console.warn("[staff-shift-assignment-sync] member lookup failed:", memberError.message)
    return empty
  }

  const staffMember = member as StaffMemberRow
  const workerUserId = staffMember.user_id!
  const roleTitle = shift.role_assignment?.trim() || staffMember.position?.trim() || "Staff"
  const department = staffMember.department ?? null
  const permissions = resolveWorkModePermissions({ position: roleTitle, department })
  const startsAt = composeShiftTimestamp(shift.shift_date, shift.start_time)
  const endsAt = composeShiftTimestamp(shift.shift_date, shift.end_time)
  const status = assignmentStatusFromShift(shift.status, options.assignmentStatus, options.cancelled)
  const now = new Date().toISOString()

  const venueId =
    staffMember.employer_entity_type === "venue" ? staffMember.employer_entity_id : null

  const payload: Record<string, unknown> = {
    user_id: workerUserId,
    staff_member_id: staffMember.id,
    staff_shift_id: shift.id,
    venue_id: venueId,
    employer_entity_type: staffMember.employer_entity_type ?? null,
    employer_entity_id: staffMember.employer_entity_id ?? null,
    role_title: roleTitle,
    department,
    permissions,
    starts_at: startsAt,
    ends_at: endsAt,
    status,
    source: "staff_shift",
    updated_at: now,
  }

  // Only attach event_id when it looks like a classic events row; events_v2 IDs
  // can violate the employment_assignments_event_id_fkey. Prefer staff_shift_id link.
  if (shift.event_id) payload.event_id = shift.event_id

  const { data: existing } = await db
    .from("employment_assignments")
    .select("id, status")
    .eq("staff_shift_id", shift.id)
    .maybeSingle()

  let assignmentId: string | null = existing?.id ?? null

  const minimalPayload: Record<string, unknown> = {
    user_id: workerUserId,
    staff_shift_id: shift.id,
    role_title: roleTitle,
    department,
    permissions,
    starts_at: startsAt,
    ends_at: endsAt,
    status,
    updated_at: now,
    employer_entity_type: staffMember.employer_entity_type ?? null,
    employer_entity_id: staffMember.employer_entity_id ?? null,
  }

  if (existing?.id) {
    const { error: updateError } = await db
      .from("employment_assignments")
      .update(payload)
      .eq("id", existing.id)
    if (updateError) {
      const { error: retryError } = await db
        .from("employment_assignments")
        .update(minimalPayload)
        .eq("id", existing.id)
      if (retryError) {
        console.warn("[staff-shift-assignment-sync] update failed:", retryError.message)
        return { ...empty, workerUserId }
      }
    }
  } else {
    const { data: inserted, error: insertError } = await db
      .from("employment_assignments")
      .insert({ ...payload, created_at: now })
      .select("id")
      .single()

    if (insertError) {
      const { data: retryInsert, error: retryInsertError } = await db
        .from("employment_assignments")
        .insert({ ...minimalPayload, created_at: now })
        .select("id")
        .single()

      if (retryInsertError) {
        console.warn("[staff-shift-assignment-sync] insert failed:", insertError.message, retryInsertError.message)
        return { ...empty, workerUserId }
      }
      assignmentId = retryInsert?.id ?? null
    } else {
      assignmentId = inserted?.id ?? null
    }
  }

  if (options.actorUserId && staffMember.employer_entity_type && staffMember.employer_entity_id) {
    try {
      await db.from("hiring_audit_events").insert({
        employer_entity_type: staffMember.employer_entity_type,
        employer_entity_id: staffMember.employer_entity_id,
        actor_user_id: options.actorUserId,
        event_type: options.cancelled
          ? "shift_assignment_cancelled"
          : existing?.id
            ? "shift_assignment_updated"
            : "shift_assignment_created",
        subject_type: "staff_shift",
        subject_id: shift.id,
        metadata: {
          assignment_id: assignmentId,
          staff_member_id: staffMember.id,
          status,
          notify: Boolean(options.notify),
        },
      })
    } catch {
      // audit is best-effort
    }
  }

  let notified = false
  if (options.notify && workerUserId) {
    let employerName: string | null = null
    if (staffMember.employer_entity_type && staffMember.employer_entity_id) {
      try {
        employerName = await resolveHiringEntityDisplayName({
          supabase: db,
          entityType: staffMember.employer_entity_type as "venue" | "organization" | "artist",
          entityId: staffMember.employer_entity_id,
        })
      } catch {
        employerName = null
      }
    }

    const notifyBase = {
      workerUserId,
      shiftId: shift.id,
      staffMemberId: staffMember.id,
      roleTitle,
      shiftDate: shift.shift_date ?? null,
      startTime: shift.start_time ?? null,
      endTime: shift.end_time ?? null,
      employerName,
      employerEntityType: staffMember.employer_entity_type ?? null,
      employerEntityId: staffMember.employer_entity_id ?? null,
      assignmentId,
    }

    if (options.cancelled || status === "cancelled") {
      notified = (await sendShiftCancelledNotification(notifyBase)).sent
    } else if (existing?.id && options.changeSummary) {
      notified = (await sendShiftUpdateNotification({ ...notifyBase, changeSummary: options.changeSummary })).sent
    } else {
      notified = (await sendShiftAssignmentNotification(notifyBase)).sent
    }
  }

  return { assignmentId, workerUserId, notified }
}

export async function cancelEmploymentAssignmentForShift(args: {
  supabase?: SupabaseClient
  shift: StaffShiftRow
  notify?: boolean
  actorUserId?: string | null
}): Promise<SyncShiftAssignmentResult> {
  return syncEmploymentAssignmentForShift({
    ...args,
    cancelled: true,
    assignmentStatus: "cancelled",
    notify: args.notify ?? true,
  })
}

export interface RespondToShiftAssignmentArgs {
  supabase?: SupabaseClient
  assignmentId: string
  userId: string
  action: "accept" | "decline"
}

export interface RespondToShiftAssignmentResult {
  ok: boolean
  error?: string
  assignmentId?: string
  shiftId?: string | null
  status?: string
}

export async function respondToShiftAssignment(
  args: RespondToShiftAssignmentArgs
): Promise<RespondToShiftAssignmentResult> {
  const db = getDb(args.supabase)

  const { data: assignment, error: fetchError } = await db
    .from("employment_assignments")
    .select("id, user_id, status, staff_shift_id, staff_member_id, role_title, starts_at")
    .eq("id", args.assignmentId)
    .eq("user_id", args.userId)
    .maybeSingle()

  if (fetchError || !assignment) {
    return { ok: false, error: "Assignment not found" }
  }

  if (assignment.status !== "invited" && assignment.status !== "confirmed") {
    return { ok: false, error: "This assignment can no longer be updated" }
  }

  const nextAssignmentStatus = args.action === "accept" ? "confirmed" : "cancelled"
  const nextShiftStatus = args.action === "accept" ? "confirmed" : "cancelled"
  const now = new Date().toISOString()

  const { error: updateError } = await db
    .from("employment_assignments")
    .update({ status: nextAssignmentStatus, updated_at: now })
    .eq("id", assignment.id)
    .eq("user_id", args.userId)

  if (updateError) return { ok: false, error: updateError.message }

  let shiftId = (assignment.staff_shift_id as string | null) ?? null
  let shiftCreatedBy: string | null = null
  let shiftDate: string | null = null

  if (shiftId) {
    const { data: shift } = await db
      .from("staff_shifts")
      .select("id, created_by, shift_date, staff_member_id, role_assignment")
      .eq("id", shiftId)
      .maybeSingle()

    if (shift) {
      shiftCreatedBy = shift.created_by ?? null
      shiftDate = shift.shift_date ?? null
      await db.from("staff_shifts").update({ status: nextShiftStatus, updated_at: now }).eq("id", shiftId)
    }
  }

  // Resolve worker display name for admin notification
  let workerName: string | null = null
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, display_name, username")
    .eq("id", args.userId)
    .maybeSingle()

  workerName =
    (profile?.full_name as string | undefined) ||
    (profile?.display_name as string | undefined) ||
    (profile?.username as string | undefined) ||
    null

  if (shiftCreatedBy) {
    await sendShiftResponseNotification({
      adminUserId: shiftCreatedBy,
      workerName,
      action: args.action,
      shiftId: shiftId ?? assignment.id,
      staffMemberId: (assignment.staff_member_id as string | null) ?? null,
      roleTitle: (assignment.role_title as string | null) ?? null,
      shiftDate,
      assignmentId: assignment.id,
    })
  }

  return {
    ok: true,
    assignmentId: assignment.id,
    shiftId,
    status: nextAssignmentStatus,
  }
}

export async function publishStaffShifts(args: {
  supabase?: SupabaseClient
  shiftIds: string[]
  actorUserId: string
  notify?: boolean
}): Promise<{ published: number; notified: number; errors: string[] }> {
  const db = getDb(args.supabase)
  const errors: string[] = []
  let published = 0
  let notified = 0

  if (args.shiftIds.length === 0) return { published: 0, notified: 0, errors: [] }

  const { data: shifts, error } = await db
    .from("staff_shifts")
    .select("*")
    .in("id", args.shiftIds)

  if (error) return { published: 0, notified: 0, errors: [error.message] }

  for (const shift of shifts ?? []) {
    try {
      // Keep scheduled (pending) so workers must still confirm; confirmed stays confirmed
      if (shift.status === "cancelled") continue

      const result = await syncEmploymentAssignmentForShift({
        supabase: db,
        shift: shift as StaffShiftRow,
        notify: args.notify !== false,
        assignmentStatus: shift.status === "confirmed" ? "confirmed" : "invited",
        actorUserId: args.actorUserId,
      })
      published += 1
      if (result.notified) notified += 1
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed to publish ${shift.id}`)
    }
  }

  return { published, notified, errors }
}
