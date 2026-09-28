import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { HiringEntity } from "@/types/hiring-entity"

interface ReconcileJobPostingFillArgs {
  supabase: SupabaseClient
  employer: HiringEntity
  jobPostingId: string
  actorUserId: string
}

export interface JobPostingFillResult {
  jobPostingId: string
  activeHires: number
  requestedPositions: number
  status: string
  changed: boolean
}

export async function reconcileJobPostingFillStatus({
  supabase,
  employer,
  jobPostingId,
  actorUserId,
}: ReconcileJobPostingFillArgs): Promise<JobPostingFillResult | null> {
  const { data: job, error: jobError } = await supabase
    .from("job_posting_templates")
    .select("id,status,number_of_positions")
    .eq("id", jobPostingId)
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .maybeSingle()

  if (jobError) throw new Error(jobError.message)
  if (!job) return null

  const { data: candidates, error: candidateError } = await supabase
    .from("staff_onboarding_candidates")
    .select("id")
    .eq("job_posting_id", jobPostingId)
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)

  if (candidateError) throw new Error(candidateError.message)

  const candidateIds = (candidates ?? []).map((candidate) => candidate.id).filter(Boolean)
  const activeHires = candidateIds.length
    ? await supabase
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("employer_entity_type", employer.entityType)
        .eq("employer_entity_id", employer.entityId)
        .eq("status", "active")
        .in("onboarding_candidate_id", candidateIds)
    : { count: 0, error: null }

  if (activeHires.error) throw new Error(activeHires.error.message)

  const activeHireCount = activeHires.count ?? 0
  const requestedPositions = Math.max(1, Number(job.number_of_positions) || 1)
  const currentStatus = String(job.status ?? "draft")
  const shouldFill =
    activeHireCount >= requestedPositions &&
    currentStatus !== "filled" &&
    currentStatus !== "archived" &&
    currentStatus !== "draft"

  if (!shouldFill) {
    return {
      jobPostingId,
      activeHires: activeHireCount,
      requestedPositions,
      status: currentStatus,
      changed: false,
    }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("job_posting_templates")
    .update({ status: "filled", filled_at: now, updated_at: now })
    .eq("id", jobPostingId)
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .neq("status", "archived")

  if (updateError) throw new Error(updateError.message)

  const { error: auditError } = await supabase.from("hiring_audit_events").insert({
    employer_entity_type: employer.entityType,
    employer_entity_id: employer.entityId,
    venue_id: employer.entityType === "venue" ? employer.entityId : employer.scope?.venueId ?? null,
    application_id: null,
    job_id: jobPostingId,
    actor_user_id: actorUserId,
    event_type: "job_filled",
    action: "job_filled",
    from_status: currentStatus,
    to_status: "filled",
    subject_type: "job_posting",
    subject_id: jobPostingId,
    title: "Role filled",
    content: "The job posting reached its requested active headcount.",
    metadata: {
      entity_table: "job_posting_templates",
      entity_id: jobPostingId,
      job_posting_id: jobPostingId,
      active_hires: activeHireCount,
      requested_positions: requestedPositions,
    },
    created_at: now,
  })

  if (auditError) throw new Error(auditError.message)

  return {
    jobPostingId,
    activeHires: activeHireCount,
    requestedPositions,
    status: "filled",
    changed: true,
  }
}

