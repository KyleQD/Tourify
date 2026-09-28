import "server-only"

import type { SupabaseClient, User } from "@supabase/supabase-js"

import { buildOnboardingTemplateSnapshot } from "@/lib/hiring/template-snapshot"
import { sendOnboardingInviteNotification } from "@/lib/rebuild/hiring-onboarding-notify"
import { syncEmploymentAssignmentForShift } from "@/lib/services/staff-shift-assignment-sync"
import {
  createEventStaffAssignment,
  ensureOrgStaffMember,
  StaffingFlowError,
  syncTourEmploymentAssignment,
} from "@/lib/services/staffing-assignment.service"

export interface StaffingInviteInput {
  orgId: string
  actorUserId: string
  name: string
  email?: string | null
  phone?: string | null
  role: string
  department: string
  templateId: string
  eventId?: string | null
  tourId?: string | null
  shiftDate?: string | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
  teamId?: string | null
}

function placeholderEmail(token: string) {
  return `phone-${token}@invite.tourify.invalid`
}

export async function createStaffingInvitation(
  supabase: SupabaseClient,
  input: StaffingInviteInput,
) {
  if (!input.email && !input.phone) {
    throw new StaffingFlowError("validation", "An email address or phone number is required.")
  }
  if (Boolean(input.eventId) === Boolean(input.tourId)) {
    throw new StaffingFlowError("validation", "Choose exactly one event or tour for this invitation.")
  }
  if (input.eventId && (!input.shiftDate || !input.startTime || !input.endTime)) {
    throw new StaffingFlowError("validation", "Event invitations require a shift date, start time, and end time.")
  }

  const { data: template, error: templateError } = await supabase
    .from("staff_onboarding_templates")
    .select("*")
    .eq("id", input.templateId)
    .eq("employer_entity_type", "organization")
    .eq("employer_entity_id", input.orgId)
    .maybeSingle()
  if (templateError) throw new StaffingFlowError("database", "Unable to validate the onboarding packet.", templateError)
  if (!template) throw new StaffingFlowError("validation", "Select a valid organization onboarding packet.")

  const duplicateQuery = supabase
    .from("staff_invitations")
    .select("id")
    .eq("employer_entity_type", "organization")
    .eq("employer_entity_id", input.orgId)
    .eq("status", "pending")
    .eq("role", input.role)
  const scopedDuplicateQuery = input.eventId
    ? duplicateQuery.eq("event_id", input.eventId)
    : duplicateQuery.eq("tour_id", input.tourId!)
  const { data: duplicate } = input.email
    ? await scopedDuplicateQuery.eq("email", input.email).limit(1).maybeSingle()
    : await scopedDuplicateQuery.eq("phone", input.phone!).limit(1).maybeSingle()
  if (duplicate) {
    throw new StaffingFlowError("conflict", "A pending staffing invitation already exists for this person.")
  }

  const token = crypto.randomUUID()
  const now = new Date().toISOString()
  const snapshot = buildOnboardingTemplateSnapshot(template as any)
  const candidateEmail = input.email || placeholderEmail(token)
  const { data: candidate, error: candidateError } = await supabase
    .from("staff_onboarding_candidates")
    .insert({
      name: input.name,
      email: candidateEmail,
      phone: input.phone ?? null,
      position: input.role,
      department: input.department,
      status: "pending",
      stage: "invitation",
      employment_type: template.employment_type || "contractor",
      onboarding_progress: 0,
      template_id: template.id,
      template_snapshot: snapshot,
      template_version: `v${snapshot.version}`,
      invitation_token: token,
      employer_entity_type: "organization",
      employer_entity_id: input.orgId,
      assigned_manager: input.actorUserId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
  if (candidateError) throw new StaffingFlowError("database", "Unable to prepare onboarding for this invitation.", candidateError)

  const positionDetails = {
    candidate_id: candidate.id,
    name: input.name,
    position: input.role,
    department: input.department,
    employment_type: template.employment_type || "contractor",
    shift_date: input.shiftDate ?? null,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    notes: input.notes ?? null,
    team_id: input.teamId ?? null,
  }
  const { data: invitation, error: invitationError } = await supabase
    .from("staff_invitations")
    .insert({
      token,
      email: input.email ?? null,
      phone: input.phone ?? null,
      position_details: positionDetails,
      status: "pending",
      event_id: input.eventId ?? null,
      tour_id: input.tourId ?? null,
      role: input.role,
      origin: input.eventId ? "event" : "tour",
      employer_entity_type: "organization",
      employer_entity_id: input.orgId,
      template_id: template.id,
      template_snapshot: snapshot,
      template_version: `v${snapshot.version}`,
      created_by: input.actorUserId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
  if (invitationError) {
    await supabase.from("staff_onboarding_candidates").delete().eq("id", candidate.id)
    throw new StaffingFlowError("database", "Unable to create the staffing invitation.", invitationError)
  }

  return { invitation, candidate, template, token }
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") || ""
  return digits.length >= 7 ? digits : null
}

export function staffingInvitationDestinationMatches(args: {
  invitationEmail?: string | null
  invitationPhone?: string | null
  userEmail?: string | null
  userPhone?: string | null
}) {
  const inviteEmail = normalize(args.invitationEmail)
  const invitePhone = normalizePhone(args.invitationPhone)
  const userEmail = normalize(args.userEmail)
  const userPhone = normalizePhone(args.userPhone)
  return Boolean((inviteEmail && inviteEmail === userEmail) || (invitePhone && invitePhone === userPhone))
}

function positionDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

async function ensureDefaultTourTeam(
  supabase: SupabaseClient,
  args: { tourId: string; requestedTeamId?: string | null; actorUserId: string },
) {
  if (args.requestedTeamId) {
    const { data } = await supabase
      .from("tour_teams")
      .select("id")
      .eq("id", args.requestedTeamId)
      .eq("tour_id", args.tourId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }
  const { data: existing } = await supabase
    .from("tour_teams")
    .select("id")
    .eq("tour_id", args.tourId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id as string
  const { data, error } = await supabase
    .from("tour_teams")
    .insert({
      tour_id: args.tourId,
      name: "General Tour Team",
      role: "general",
      team_type: "general",
      description: "Default team for ungrouped tour members.",
      created_by: args.actorUserId,
    })
    .select("id")
    .single()
  if (error || !data?.id) throw new StaffingFlowError("database", "Unable to create the default tour team.", error)
  return data.id as string
}

export async function acceptStaffingInvitation(args: {
  supabase: SupabaseClient
  token: string
  user: User
}) {
  const { data: invitation, error } = await args.supabase
    .from("staff_invitations")
    .select("*")
    .eq("token", args.token)
    .maybeSingle()
  if (error) throw new StaffingFlowError("database", "Unable to load this invitation.", error)
  if (!invitation) throw new StaffingFlowError("not_found", "Invitation not found.")
  if (!["pending", "accepted"].includes(invitation.status)) {
    throw new StaffingFlowError("conflict", `This invitation is ${invitation.status}.`)
  }
  if (invitation.status === "accepted" && invitation.user_id === args.user.id) {
    return { invitation, alreadyAccepted: true, onboardingUrl: `/onboarding/hire/${encodeURIComponent(args.token)}` }
  }

  if (!staffingInvitationDestinationMatches({
    invitationEmail: invitation.email,
    invitationPhone: invitation.phone,
    userEmail: args.user.email,
    userPhone: args.user.phone,
  })) {
    throw new StaffingFlowError("forbidden", "Sign in with the email address or verified phone number that received this invitation.")
  }

  const orgId = invitation.employer_entity_type === "organization" ? invitation.employer_entity_id : null
  if (!orgId) throw new StaffingFlowError("validation", "This invitation is missing its organization scope.")
  const details = positionDetails(invitation.position_details)
  const { data: candidate, error: candidateError } = await args.supabase
    .from("staff_onboarding_candidates")
    .select("*")
    .eq("invitation_token", args.token)
    .maybeSingle()
  if (candidateError || !candidate) {
    throw new StaffingFlowError("database", "The onboarding packet for this invitation is unavailable.", candidateError)
  }

  const name = String(candidate.name || details.name || args.user.email || "Staff member")
  const role = String(invitation.role || candidate.position || "Staff")
  const department = String(candidate.department || details.department || "General")
  const staffMember = await ensureOrgStaffMember(args.supabase, {
    orgId,
    userId: args.user.id,
    name,
    email: invitation.email || args.user.email || String(candidate.email),
    phone: invitation.phone || args.user.phone || null,
    role,
    department,
    status: "pending",
  })

  let scopeRecord: Record<string, unknown> | null = null
  let workModeAssignment: Record<string, unknown> | null = null
  if (invitation.event_id) {
    const shiftDate = String(details.shift_date || "")
    const startTime = String(details.start_time || "")
    const endTime = String(details.end_time || "")
    const { data: replayShift } = await args.supabase
      .from("staff_shifts")
      .select("*")
      .eq("org_id", orgId)
      .eq("event_id", invitation.event_id)
      .eq("staff_member_id", staffMember.id)
      .eq("shift_date", shiftDate)
      .eq("start_time", startTime)
      .eq("end_time", endTime)
      .is("deleted_at", null)
      .maybeSingle()
    const assignment = replayShift
      ? {
          shift: replayShift,
          workMode: await syncEmploymentAssignmentForShift({
            supabase: args.supabase,
            shift: replayShift,
            notify: false,
            actorUserId: invitation.created_by || args.user.id,
            assignmentStatus: "confirmed",
          }),
        }
      : await createEventStaffAssignment({
          supabase: args.supabase,
          actorUserId: invitation.created_by || args.user.id,
          orgId,
          eventId: invitation.event_id,
          staffMemberId: staffMember.id,
          shiftDate,
          startTime,
          endTime,
          role,
          notes: typeof details.notes === "string" ? details.notes : null,
          assignmentStatus: "confirmed",
          notify: false,
        })
    scopeRecord = assignment.shift as Record<string, unknown>
    if (assignment.workMode.assignmentId) {
      const { data } = await args.supabase
        .from("employment_assignments")
        .select("*")
        .eq("id", assignment.workMode.assignmentId)
        .maybeSingle()
      workModeAssignment = data as Record<string, unknown> | null
    }
  } else if (invitation.tour_id) {
    const teamId = await ensureDefaultTourTeam(args.supabase, {
      tourId: invitation.tour_id,
      requestedTeamId: typeof details.team_id === "string" ? details.team_id : null,
      actorUserId: invitation.created_by || args.user.id,
    })
    const { data: existingMember } = await args.supabase
      .from("tour_team_members")
      .select("*")
      .eq("tour_id", invitation.tour_id)
      .eq("user_id", args.user.id)
      .eq("role", role)
      .maybeSingle()
    if (existingMember) {
      scopeRecord = existingMember as Record<string, unknown>
    } else {
      const { data, error: memberError } = await args.supabase
        .from("tour_team_members")
        .insert({
          tour_id: invitation.tour_id,
          team_id: teamId,
          user_id: args.user.id,
          assigned_by: invitation.created_by || args.user.id,
          assigned_at: new Date().toISOString(),
          name,
          role,
          role_in_team: role,
          email: invitation.email || args.user.email || null,
          phone: invitation.phone || args.user.phone || null,
          status: "confirmed",
          is_active: true,
          profile: { name, email: invitation.email || args.user.email || null, phone: invitation.phone || args.user.phone || null },
        })
        .select("*")
        .single()
      if (memberError) throw new StaffingFlowError("database", "Unable to add this person to the tour.", memberError)
      scopeRecord = data as Record<string, unknown>
    }
    workModeAssignment = await syncTourEmploymentAssignment({
      supabase: args.supabase,
      orgId,
      tourId: invitation.tour_id,
      userId: args.user.id,
      staffMemberId: staffMember.id,
      role,
      department,
      status: "confirmed",
    }) as Record<string, unknown>
  }

  const now = new Date().toISOString()
  const [{ error: invitationUpdateError }, { error: candidateUpdateError }] = await Promise.all([
    args.supabase
      .from("staff_invitations")
      .update({ status: "accepted", user_id: args.user.id, updated_at: now })
      .eq("id", invitation.id),
    args.supabase
      .from("staff_onboarding_candidates")
      .update({ user_id: args.user.id, status: "in_progress", stage: "onboarding", updated_at: now })
      .eq("id", candidate.id),
  ])
  if (invitationUpdateError || candidateUpdateError) {
    throw new StaffingFlowError("database", "The assignment was created, but invitation activation did not finish.", invitationUpdateError || candidateUpdateError)
  }

  const onboardingUrl = `/onboarding/hire/${encodeURIComponent(args.token)}`
  const notification = await sendOnboardingInviteNotification({
    applicantUserId: args.user.id,
    candidateId: candidate.id,
    onboardingUrl,
    templateName: typeof invitation.template_snapshot === "object" && invitation.template_snapshot && "name" in invitation.template_snapshot
      ? String((invitation.template_snapshot as Record<string, unknown>).name)
      : null,
    jobTitle: role,
  })

  return {
    invitation: { ...invitation, status: "accepted", user_id: args.user.id },
    alreadyAccepted: false,
    staffMember,
    scopeRecord,
    workModeAssignment,
    onboardingUrl,
    syncWarnings: notification.sent ? [] : ["Assignment activated, but the onboarding notification needs to be resent."],
  }
}
