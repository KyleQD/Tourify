import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"
import {
  createEventStaffAssignment,
  ensureOrgStaffMember,
  StaffingFlowError,
  staffingErrorStatus,
} from "@/lib/services/staffing-assignment.service"
import { hasEventPermission } from "../../_lib/event-permissions"
import { resolveEventReference } from "../../_lib/event-reference"

const assignStaffSchema = z.object({
  staff_member_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  shift_date: z.string().date(),
  start_time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  role_assignment: z.string().trim().max(160).optional(),
  zone_assignment: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(4000).optional(),
}).refine((input) => Boolean(input.staff_member_id || input.user_id), {
  message: "Select an organization person.",
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Review the highlighted assignment fields.", code: "validation", details: error.flatten() },
      { status: 400 },
    )
  }
  if (error instanceof StaffingFlowError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: staffingErrorStatus(error) },
    )
  }
  console.error("[event staff]", error)
  return NextResponse.json({ error: fallback, code: "database" }, { status: 500 })
}

async function requireEventStaffAccess(args: {
  supabase: any
  eventParam: string
  userId: string
  orgId: string
}) {
  const reference = await resolveEventReference(args.supabase, args.eventParam)
  if (!reference) throw new StaffingFlowError("not_found", "Event not found.")
  if (!reference.orgId || reference.orgId !== args.orgId) {
    throw new StaffingFlowError("forbidden", "This event does not belong to the active organization.")
  }
  const allowed = await hasEventPermission({
    supabase: args.supabase,
    eventId: reference.id,
    userId: args.userId,
    ownerUserId: reference.ownerUserId,
    permissionName: "ASSIGN_EVENT_ROLES",
  })
  if (!allowed) throw new StaffingFlowError("forbidden", "You do not have permission to manage event staff.")
  return reference
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: eventParam } = await context.params
  return withAdminCapability("workforce.view", async (_request, { supabase, user, admin }) => {
    try {
      const reference = await requireEventStaffAccess({
        supabase,
        eventParam,
        userId: user.id,
        orgId: admin.orgId,
      })

      const [{ data: shiftRows, error: shiftsError }, availablePeople] =
        await Promise.all([
          supabase
            .from("staff_shifts")
            .select("*")
            .eq("event_id", reference.id)
            .eq("org_id", admin.orgId)
            .is("deleted_at", null)
            .order("shift_date", { ascending: true }),
          listWorkforcePeople({
            supabase,
            employerEntityType: "organization",
            employerEntityId: admin.orgId,
            includePending: true,
            limit: 300,
          }),
        ])
      if (shiftsError) throw new StaffingFlowError("database", "Unable to load event shifts.", shiftsError)

      const memberIds = Array.from(
        new Set((shiftRows ?? []).map((shift: any) => shift.staff_member_id).filter(Boolean)),
      )
      const memberResult = memberIds.length
        ? await supabase
            .from("staff_members")
            .select("id, user_id, name, email, phone, role, department, status")
            .in("id", memberIds)
        : { data: [], error: null }
      if (memberResult.error) {
        throw new StaffingFlowError("database", "Unable to resolve assigned staff profiles.", memberResult.error)
      }
      const membersById = new Map((memberResult.data ?? []).map((member: any) => [member.id, member]))
      const shifts = (shiftRows ?? []).map((shift: any) => ({
        ...shift,
        staff_members: membersById.get(shift.staff_member_id) ?? null,
      }))

      return NextResponse.json({
        success: true,
        shifts,
        availableMembers: availablePeople.map((person) => ({
          id: person.userId,
          user_id: person.userId,
          staff_member_id: person.staffMemberId,
          name: person.name,
          email: person.email,
          phone: person.phone,
          role: person.role,
          department: person.department,
          status: person.status,
          connection_state: person.connectionState,
          onboarding_status: person.onboardingStatus,
        })),
        totalAssigned: shifts.length,
        defaults: {
          shiftDate: reference.eventDate,
          startTime: reference.eventTime?.slice(0, 5) || "09:00",
          endTime: "17:00",
        },
      })
    } catch (error) {
      return routeError(error, "Unable to load event staff.")
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: eventParam } = await context.params
  return withAdminCapability("workforce.manage", async (_request, { supabase, user, admin }) => {
    try {
      const reference = await requireEventStaffAccess({
        supabase,
        eventParam,
        userId: user.id,
        orgId: admin.orgId,
      })
      const input = assignStaffSchema.parse(await request.json())
      let staffMemberId = input.staff_member_id
      if (!staffMemberId && input.user_id) {
        const people = await listWorkforcePeople({
          supabase,
          employerEntityType: "organization",
          employerEntityId: admin.orgId,
          includePending: true,
          limit: 500,
        })
        const person = people.find((candidate) => candidate.userId === input.user_id)
        if (!person) throw new StaffingFlowError("forbidden", "That person is not connected to the active organization.")
        const member = await ensureOrgStaffMember(supabase, {
          orgId: admin.orgId,
          userId: person.userId,
          name: person.name,
          email: person.email || `${person.userId}@member.tourify.invalid`,
          phone: person.phone,
          role: input.role_assignment || person.role || "Staff",
          department: person.department || "General",
          status: "active",
        })
        staffMemberId = member.id
      }
      if (!staffMemberId) throw new StaffingFlowError("validation", "Select an organization person.")
      const assignment = await createEventStaffAssignment({
        supabase,
        actorUserId: user.id,
        orgId: admin.orgId,
        eventId: reference.id,
        venueId: reference.venueId,
        staffMemberId,
        shiftDate: input.shift_date,
        startTime: input.start_time,
        endTime: input.end_time,
        role: input.role_assignment,
        zone: input.zone_assignment,
        notes: input.notes,
        assignmentStatus: "invited",
        notify: true,
      })

      return NextResponse.json(
        {
          success: true,
          shift: { ...assignment.shift, staff_members: assignment.staffMember },
          staffMember: assignment.staffMember,
          workModeAssignment: assignment.workMode,
          syncWarnings: assignment.workMode.assignmentId
            ? []
            : ["The shift was saved, but Work Mode could not be synchronized yet."],
        },
        { status: 201 },
      )
    } catch (error) {
      return routeError(error, "Unable to assign this staff member.")
    }
  })(request)
}
