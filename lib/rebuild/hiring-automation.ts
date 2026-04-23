/**
 * Phase 9 (rebuild) — automation hooks for hiring → onboarding → notifications.
 * Call sites should invoke these from job_application / artist application approval flows
 * once product rules are finalized (see docs/tourify-rebuild-phase-0-1-dependency-map.md).
 */

export interface ApplicationApprovedContext {
  applicationId: string
  applicantUserId: string
  venueId?: string | null
  jobPostingId?: string | null
  actorUserId: string
}

/** Placeholder: extend with staff_onboarding_candidates / checklist inserts + notifications */
export async function runStaffApplicationApprovedSideEffects(_ctx: ApplicationApprovedContext): Promise<void> {
  // Intentionally empty — wire in Phase 9 after DB triggers and UI gate checklist ship.
}
