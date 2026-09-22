import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"
import { syncEmploymentAssignmentForShift } from "@/lib/services/staff-shift-assignment-sync"

export type StaffingErrorCode =
  | "validation"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "database"

export class StaffingFlowError extends Error {
  constructor(
    readonly code: StaffingErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "StaffingFlowError"
  }
}

export function staffingErrorStatus(error: unknown): number {
  if (!(error instanceof StaffingFlowError)) return 500
  if (error.code === "validation") return 400
  if (error.code === "forbidden") return 403
  if (error.code === "not_found") return 404
  if (error.code === "conflict") return 409
  return 500
}

export interface EnsureOrgStaffMemberInput {
  orgId: string
  userId: string
  name: string
  email: string
  phone?: string | null
  role: string
  department?: string | null
  status?: "pending" | "active"
}

export async function ensureOrgStaffMember(
  supabase: SupabaseClient,
  input: EnsureOrgStaffMemberInput,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("staff_members")
    .select("*")
    .eq("org_id", input.orgId)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (lookupError) throw new StaffingFlowError("database", "Unable to load the staff profile.", lookupError)

  const now = new Date().toISOString()
  const department = input.department?.trim() || "General"
  const permissions = resolveWorkModePermissions({ position: input.role, department })
  if (existing) {
    const { data, error } = await supabase
      .from("staff_members")
      .update({
        name: input.name,
        email: input.email,
        phone: input.phone ?? existing.phone ?? null,
        role: input.role,
        department,
        employer_entity_type: "organization",
        employer_entity_id: input.orgId,
        permissions,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw new StaffingFlowError("database", "Unable to update the staff profile.", error)
    return data
  }

  const { data, error } = await supabase
    .from("staff_members")
    .insert({
      org_id: input.orgId,
      user_id: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      role: input.role,
      department,
      employment_type: "contractor",
      employer_entity_type: "organization",
      employer_entity_id: input.orgId,
      permissions,
      status: input.status ?? "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
  if (error) throw new StaffingFlowError("database", "Unable to create the staff profile.", error)
  return data
}

export async function assertOrgStaffMember(
  supabase: SupabaseClient,
  args: { orgId: string; staffMemberId: string },
) {
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("id", args.staffMemberId)
    .or(`org_id.eq.${args.orgId},and(employer_entity_type.eq.organization,employer_entity_id.eq.${args.orgId})`)
    .maybeSingle()
  if (error) throw new StaffingFlowError("database", "Unable to validate the selected staff member.", error)
  if (!data) throw new StaffingFlowError("forbidden", "That person is not connected to the active organization.")
  return data
}

function minutes(value: string): number {
  const [hours, minute] = value.split(":").map(Number)
  return hours * 60 + minute
}

export async function assertNoShiftConflict(
  supabase: SupabaseClient,
  args: {
    staffMemberId: string
    shiftDate: string
    startTime: string
    endTime: string
    excludeShiftId?: string | null
  },
) {
  if (minutes(args.endTime) <= minutes(args.startTime)) {
    throw new StaffingFlowError("validation", "Shift end time must be after the start time.")
  }

  let query = supabase
    .from("staff_shifts")
    .select("id, start_time, end_time, event_id")
    .eq("staff_member_id", args.staffMemberId)
    .eq("shift_date", args.shiftDate)
    .is("deleted_at", null)
    .not("status", "in", "(cancelled,declined)")
    .lt("start_time", args.endTime)
    .gt("end_time", args.startTime)
    .limit(1)
  if (args.excludeShiftId) query = query.neq("id", args.excludeShiftId)

  const { data, error } = await query
  if (error) throw new StaffingFlowError("database", "Unable to check the worker's schedule.", error)
  if (data?.length) {
    throw new StaffingFlowError(
      "conflict",
      "This person already has an overlapping shift. Adjust the time or choose another person.",
      { conflictingShiftId: data[0].id },
    )
  }
}

export async function createEventStaffAssignment(args: {
  supabase: SupabaseClient
  actorUserId: string
  orgId: string
  eventId: string
  venueId?: string | null
  staffMemberId: string
  shiftDate: string
  startTime: string
  endTime: string
  role?: string | null
  zone?: string | null
  notes?: string | null
  assignmentStatus?: "invited" | "confirmed"
  notify?: boolean
}) {
  const member = await assertOrgStaffMember(args.supabase, {
    orgId: args.orgId,
    staffMemberId: args.staffMemberId,
  })
  await assertNoShiftConflict(args.supabase, {
    staffMemberId: args.staffMemberId,
    shiftDate: args.shiftDate,
    startTime: args.startTime,
    endTime: args.endTime,
  })

  const { data: shift, error } = await args.supabase
    .from("staff_shifts")
    .insert({
      org_id: args.orgId,
      venue_id: args.venueId ?? null,
      event_id: args.eventId,
      staff_member_id: args.staffMemberId,
      shift_date: args.shiftDate,
      start_time: args.startTime,
      end_time: args.endTime,
      role_assignment: args.role?.trim() || member.role || "Staff",
      zone_assignment: args.zone ?? null,
      notes: args.notes ?? null,
      status: args.assignmentStatus === "confirmed" ? "confirmed" : "scheduled",
      created_by: args.actorUserId,
    })
    .select("*")
    .single()
  if (error) {
    if (error.code === "23505") {
      throw new StaffingFlowError("conflict", "This exact shift is already assigned.", error)
    }
    throw new StaffingFlowError("database", "Unable to create the staff shift.", error)
  }

  const workMode = await syncEmploymentAssignmentForShift({
    supabase: args.supabase,
    shift,
    notify: args.notify ?? true,
    actorUserId: args.actorUserId,
    assignmentStatus: args.assignmentStatus ?? "invited",
  })

  return { shift, staffMember: member, workMode }
}

export async function syncTourEmploymentAssignment(args: {
  supabase: SupabaseClient
  orgId: string
  tourId: string
  userId: string
  staffMemberId: string
  role: string
  department?: string | null
  status?: "invited" | "confirmed" | "declined"
  applicationId?: string | null
  jobPostingId?: string | null
}) {
  const now = new Date().toISOString()
  const status = args.status ?? "invited"
  const permissions = resolveWorkModePermissions({ position: args.role, department: args.department })
  const { data: existing, error: lookupError } = await args.supabase
    .from("employment_assignments")
    .select("id")
    .eq("employer_entity_type", "organization")
    .eq("employer_entity_id", args.orgId)
    .eq("user_id", args.userId)
    .eq("tour_id", args.tourId)
    .in("status", ["invited", "confirmed", "active"])
    .maybeSingle()
  if (lookupError) throw new StaffingFlowError("database", "Unable to load the tour Work Mode assignment.", lookupError)

  const payload = {
    user_id: args.userId,
    employer_entity_type: "organization",
    employer_entity_id: args.orgId,
    staff_member_id: args.staffMemberId,
    tour_id: args.tourId,
    assignment_kind: "tour",
    role_title: args.role,
    department: args.department ?? "Tour",
    permissions,
    status,
    source: "tour_team",
    job_application_id: args.applicationId ?? null,
    job_posting_id: args.jobPostingId ?? null,
    updated_at: now,
  }
  const query = existing?.id
    ? args.supabase.from("employment_assignments").update(payload).eq("id", existing.id)
    : args.supabase.from("employment_assignments").insert({ ...payload, created_at: now })
  const { data, error } = await query.select("*").single()
  if (error) throw new StaffingFlowError("database", "Unable to synchronize the tour with Work Mode.", error)
  return data
}
