import type { SupabaseClient } from "@supabase/supabase-js"

import { assertCanManageHiring } from "@/lib/auth/hiring-permissions"
import { resolveWorkModePermissions } from "@/lib/hiring/work-mode-permissions"
import type { HiringActor } from "@/types/hiring-entity"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"

export interface AssignCandidateInput {
  supabase: SupabaseClient
  actor: HiringActor
  candidateId: string
  assignedManagerId?: string | null
  assignedManagerName?: string | null
  intendedEventId?: string | null
  intendedShiftId?: string | null
  roleTemplateId?: string | null
  position?: string | null
  department?: string | null
  notes?: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

// Compose a timestamptz from a staff_shifts row (shift_date + start/end time).
function composeShiftTimestamp(date: unknown, time: unknown): string | null {
  if (typeof date !== "string" || !date) return null
  const timePart = typeof time === "string" && time ? time : "00:00:00"
  const composed = new Date(`${date}T${timePart}`)
  return Number.isNaN(composed.getTime()) ? null : composed.toISOString()
}

/**
 * Assign intended event / manager / shift / role to an onboarding candidate.
 *
 * Writes the intent onto the candidate row and, when the applicant already has a
 * user account, keeps a matching employment_assignments shell in sync so the hire
 * lands on the roster pre-attached to the right event and role.
 */
export async function assignCandidate(input: AssignCandidateInput): Promise<HiringServiceResult<Record<string, unknown>>> {
  const { supabase, actor, candidateId } = input

  const permission = await assertCanManageHiring({ supabase, userId: actor.userId, employer: actor.employer })
  if (!permission.ok) return permission

  const { data: candidate, error: candidateError } = await supabase
    .from("staff_onboarding_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("employer_entity_type", actor.employer.entityType)
    .eq("employer_entity_id", actor.employer.entityId)
    .maybeSingle()

  if (candidateError) return fail({ code: "DATABASE_ERROR", message: "Unable to load candidate.", details: candidateError })
  if (!candidate) return fail({ code: "NOT_FOUND", message: "Candidate not found." })

  // Only patch fields that were explicitly provided (undefined = leave untouched).
  const updatePayload: Record<string, unknown> = { updated_at: nowIso() }
  if (input.assignedManagerId !== undefined) updatePayload.assigned_manager_id = input.assignedManagerId
  if (input.assignedManagerName !== undefined) updatePayload.assigned_manager_name = input.assignedManagerName
  if (input.intendedEventId !== undefined) updatePayload.intended_event_id = input.intendedEventId
  if (input.intendedShiftId !== undefined) updatePayload.intended_shift_id = input.intendedShiftId
  if (input.roleTemplateId !== undefined) updatePayload.role_template_id = input.roleTemplateId
  if (input.position !== undefined) updatePayload.position = input.position
  if (input.department !== undefined) updatePayload.department = input.department
  if (input.notes !== undefined) updatePayload.notes = input.notes

  const { data: updated, error: updateError } = await supabase
    .from("staff_onboarding_candidates")
    .update(updatePayload)
    .eq("id", candidateId)
    .select("*")
    .single()

  if (updateError) return fail({ code: "DATABASE_ERROR", message: "Unable to update candidate assignment.", details: updateError })

  const warnings: string[] = []

  // Sync an employment_assignments shell when the applicant has an account.
  const userId = typeof candidate.user_id === "string" ? candidate.user_id : null
  if (userId) {
    const position = (input.position ?? candidate.position) as string | null
    const department = (input.department ?? candidate.department) as string | null
    const permissions = resolveWorkModePermissions({ position, department })

    let startsAt: string | null = null
    let endsAt: string | null = null
    if (input.intendedShiftId) {
      const { data: shift } = await supabase
        .from("staff_shifts")
        .select("shift_date,start_time,end_time")
        .eq("id", input.intendedShiftId)
        .maybeSingle()
      if (shift) {
        startsAt = composeShiftTimestamp(shift.shift_date, shift.start_time)
        endsAt = composeShiftTimestamp(shift.shift_date, shift.end_time)
      }
    }

    const { data: existing } = await supabase
      .from("employment_assignments")
      .select("id,event_id")
      .eq("user_id", userId)
      .eq("employer_entity_type", actor.employer.entityType)
      .eq("employer_entity_id", actor.employer.entityId)
      .maybeSingle()

    const assignmentPayload: Record<string, unknown> = {
      role_title: position ?? "Staff",
      department: department ?? null,
      permissions,
      updated_at: nowIso(),
    }
    if (input.intendedEventId !== undefined) assignmentPayload.event_id = input.intendedEventId
    if (input.roleTemplateId !== undefined) assignmentPayload.role_template_id = input.roleTemplateId
    if (startsAt) assignmentPayload.starts_at = startsAt
    if (endsAt) assignmentPayload.ends_at = endsAt

    if (existing) {
      const { error: assignError } = await supabase
        .from("employment_assignments")
        .update(assignmentPayload)
        .eq("id", existing.id)
      if (assignError) warnings.push("Candidate updated, but syncing the roster assignment failed.")
    } else {
      const { error: insertError } = await supabase.from("employment_assignments").insert({
        ...assignmentPayload,
        user_id: userId,
        employer_entity_type: actor.employer.entityType,
        employer_entity_id: actor.employer.entityId,
        venue_id: actor.employer.entityType === "venue" ? actor.employer.entityId : actor.employer.scope?.venueId ?? null,
        status: "invited",
        created_at: nowIso(),
      })
      if (insertError) warnings.push("Candidate updated, but creating the roster assignment failed.")
    }
  }

  try {
    await supabase.from("hiring_audit_events").insert({
      employer_entity_type: actor.employer.entityType,
      employer_entity_id: actor.employer.entityId,
      actor_user_id: actor.userId,
      event_type: "candidate_assignment_updated",
      subject_type: "staff_onboarding_candidate",
      subject_id: candidateId,
      metadata: {
        assigned_manager_id: input.assignedManagerId ?? null,
        intended_event_id: input.intendedEventId ?? null,
        intended_shift_id: input.intendedShiftId ?? null,
        role_template_id: input.roleTemplateId ?? null,
      },
    })
  } catch {
    // audit is best-effort
  }

  return ok({ candidate: updated, warnings })
}
