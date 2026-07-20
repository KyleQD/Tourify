import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveEmployerFromApplicationRow } from "@/lib/hiring/resolve-employer-from-application"
import { resolveHiringEntityDisplayName } from "@/lib/auth/hiring-entity-resolver"
import { canTransitionApplicationStatus } from "@/lib/hiring/application-transitions"
import { assertCanManageHiring } from "@/lib/auth/hiring-permissions"
import { CONTRACT_PROVIDERS, sendHireContractWithProvider } from "@/lib/contracts/provider-adapter"
import { runStaffApplicationApprovedSideEffects } from "@/lib/rebuild/hiring-automation"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import {
  evaluateHiringEligibility,
  recordHiringEligibilitySnapshot,
} from "@/lib/services/hiring-eligibility.service"
import { recordAchievementMetricEvent } from "@/lib/services/achievement-metric-events.service"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { HiringActor, HiringEntity } from "@/types/hiring-entity"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"

export interface ApproveStaffApplicationOptions {
  note?: string
  feedback?: string
  sendContract?: boolean
  contractProvider?: string
  contractTerms?: string
  onboardingTemplateId?: string | null
}

export interface ApproveStaffApplicationOnboarding {
  id: string | null
  name: string | null
  source: string | null
  state: "explicit" | "employerResolved" | "pending"
  isPending: boolean
}

export interface ApproveStaffApplicationResult {
  application: Record<string, unknown>
  candidate: Record<string, unknown>
  invitation: Record<string, unknown>
  workflow: Record<string, unknown> | null
  employmentAssignment: Record<string, unknown> | null
  onboardingUrl: string | null
  contract: Record<string, unknown> | null
  onboarding: ApproveStaffApplicationOnboarding
  warnings: string[]
}

function buildOnboardingUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "")
  if (!appUrl) return `/onboarding/hire/${token}`
  const base = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`
  return `${base}/onboarding/hire/${encodeURIComponent(token)}`
}

async function writeLegacyAuditEvent(input: {
  supabase: SupabaseClient
  actorUserId: string
  applicationId: string
  jobId?: string | null
  venueId?: string | null
  employer?: HiringEntity | null
  action: string
  fromStatus: string
  toStatus: string
  metadata?: Record<string, unknown>
}) {
  const title = `Hiring status changed: ${input.fromStatus} -> ${input.toStatus}`
  const content = `Application ${input.applicationId} moved from ${input.fromStatus} to ${input.toStatus} via ${input.action}.`

  try {
    await input.supabase.from("hiring_audit_events").insert({
      application_id: input.applicationId,
      job_id: input.jobId || null,
      venue_id: input.venueId || null,
      employer_entity_type: input.employer?.entityType ?? null,
      employer_entity_id: input.employer?.entityId ?? null,
      actor_user_id: input.actorUserId,
      action: input.action,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      title,
      content,
      metadata: {
        actor_user_id: input.actorUserId,
        application_id: input.applicationId,
        action: input.action,
        from_status: input.fromStatus,
        to_status: input.toStatus,
        timestamp: new Date().toISOString(),
        ...(input.metadata ?? {}),
      },
    })
  } catch (error) {
    console.warn("[HiringApproval] Failed to write hiring_audit_events row:", error)
  }
}

async function recordApprovedApplicationMetric(input: {
  applicantId?: string | null
  applicationId: string
  jobPostingId?: string | null
  venueId?: string | null
  source?: string
}) {
  if (!input.applicantId) return

  try {
    const serviceRoleSupabase = createServiceRoleClient()
    await recordAchievementMetricEvent({
      supabase: serviceRoleSupabase,
      userId: input.applicantId,
      metricKey: "accepted_applications_total",
      eventType: "job_application_approved",
      delta: 1,
      eventData: {
        application_id: input.applicationId,
        job_posting_id: input.jobPostingId,
        venue_id: input.venueId,
        source: input.source || "approve",
      },
      relatedProjectId: input.jobPostingId || undefined,
    })
  } catch (error) {
    console.warn("[HiringApproval] Failed to record approved-application metric:", error)
  }
}

export async function approveStaffApplication({
  supabase,
  actorUserId,
  applicationId,
  options = {},
}: {
  supabase: SupabaseClient
  actorUserId: string
  applicationId: string
  options?: ApproveStaffApplicationOptions
}): Promise<HiringServiceResult<ApproveStaffApplicationResult>> {
  const { data: application, error: applicationError } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle()

  if (applicationError) {
    return fail({ code: "DATABASE_ERROR", message: "Unable to load application.", details: applicationError })
  }

  if (!application) {
    return fail({ code: "NOT_FOUND", message: "Application not found." })
  }

  const employer = resolveEmployerFromApplicationRow(application as Record<string, unknown>)
  if (!employer) {
    return fail({ code: "VALIDATION_ERROR", message: "Application is missing employer scope." })
  }

  const actor: HiringActor = { userId: actorUserId, employer }
  const currentStatus = typeof application.status === "string" ? application.status : "pending"

  const permission = await assertCanManageHiring({ supabase, userId: actorUserId, employer })
  if (!permission.ok) return permission

  if (!canTransitionApplicationStatus(currentStatus, "approved")) {
    return fail({
      code: "CONFLICT",
      message: `Cannot transition application from ${currentStatus} to approved`,
    })
  }

  const eligibility = await evaluateHiringEligibility({ supabase, applicationId })
  try {
    await recordHiringEligibilitySnapshot({ supabase, assessment: eligibility, actorUserId })
  } catch (snapshotError) {
    console.warn("[HiringApproval] Failed to write eligibility snapshot:", snapshotError)
  }

  if (eligibility.mode === "enforce" && !eligibility.is_eligible) {
    await writeLegacyAuditEvent({
      supabase,
      actorUserId,
      applicationId,
      jobId: application.job_posting_id,
      venueId: application.venue_id,
      employer,
      action: "approve_blocked",
      fromStatus: currentStatus,
      toStatus: "approved",
      metadata: {
        eligibility_mode: eligibility.mode,
        blocking_reasons: eligibility.blocking_reasons,
        checklist: eligibility.checklist,
      },
    })

    return fail({
      code: "CONFLICT",
      message: "Application cannot be approved until required verified evidence is complete",
      details: {
        code: "HIRING_ELIGIBILITY_BLOCKED",
        eligibility: {
          mode: eligibility.mode,
          blocking_reasons: eligibility.blocking_reasons,
          checklist: eligibility.checklist,
          summary: eligibility.summary,
        },
      },
    })
  }

  if (eligibility.mode === "shadow" && !eligibility.is_eligible) {
    await writeLegacyAuditEvent({
      supabase,
      actorUserId,
      applicationId,
      jobId: application.job_posting_id,
      venueId: application.venue_id,
      employer,
      action: "approve_shadow_failed",
      fromStatus: currentStatus,
      toStatus: "approved",
      metadata: {
        eligibility_mode: eligibility.mode,
        blocking_reasons: eligibility.blocking_reasons,
      },
    })
  }

  const approvalResult = await HiringOnboardingService.approveApplication({
    supabase,
    actor,
    applicationId,
    note: options.note ?? options.feedback,
    onboardingTemplateId: options.onboardingTemplateId ?? null,
  })

  if (!approvalResult.ok) return approvalResult

  const candidate = approvalResult.data.candidate as Record<string, unknown>
  const invitation = approvalResult.data.invitation as Record<string, unknown>
  const token = typeof invitation.token === "string" ? invitation.token : null
  const onboardingUrl = token ? buildOnboardingUrl(token) : null

  const jobPosting = (approvalResult.data.jobPosting as Record<string, unknown> | null) ?? null
  const jobTitle =
    (jobPosting && typeof jobPosting.title === "string" && jobPosting.title) ||
    (typeof candidate.position === "string" ? candidate.position : null)
  const onboardingTemplate = approvalResult.data.onboardingTemplate as {
    id: string | null
    name: string | null
    source: string | null
    state: "explicit" | "employerResolved" | "pending"
    isPending: boolean
  } | null
  const templateName = onboardingTemplate?.name ?? null
  const isPendingTemplate = onboardingTemplate?.isPending ?? true
  const onboardingReady = Boolean(!isPendingTemplate && onboardingUrl)
  const warnings = Array.isArray(approvalResult.data.warnings)
    ? (approvalResult.data.warnings as string[])
    : []

  // Prefer the resolved employer name; fall back to a neutral label when only a
  // synthetic "type:id" identifier is available.
  const resolvedEmployerName = await resolveHiringEntityDisplayName({
    supabase,
    entityType: employer.entityType,
    entityId: employer.entityId,
  })
  const employerName = resolvedEmployerName.includes(":") ? null : resolvedEmployerName

  await recordApprovedApplicationMetric({
    applicantId: (application.applicant_id as string | null) ?? null,
    applicationId,
    jobPostingId: (application.job_posting_id as string | null) ?? null,
    venueId: (application.venue_id as string | null) ?? null,
    source: "approve",
  })

  // Nudge the hiring manager to recognize the new hire with a badge or endorsement.
  try {
    const applicantId = (application.applicant_id as string | null) ?? null
    if (applicantId && actorUserId !== applicantId) {
      const { OptimizedNotificationService } = await import(
        '@/lib/services/optimized-notification-service'
      )
      const candidateName =
        (typeof candidate.name === 'string' && candidate.name) ||
        (typeof candidate.full_name === 'string' && candidate.full_name) ||
        'your new hire'
      await OptimizedNotificationService.createNotification({
        userId: actorUserId,
        type: 'feature_update',
        title: `Recognize ${candidateName}`,
        content: `They were just approved${jobTitle ? ` for ${jobTitle}` : ''}. Award a badge or send a verified endorsement from your jobs team panel.`,
        summary: 'Recognize your team',
        relatedUserId: applicantId,
        relatedContentId: applicationId,
        relatedContentType: 'job_application',
        metadata: {
          link: '/admin/dashboard/jobs',
          prompt: 'recognition',
          application_id: applicationId,
          job_posting_id: application.job_posting_id,
          endorsee_id: applicantId,
        },
      })
    }
  } catch (recognitionPromptError) {
    console.warn('[HiringApproval] Recognition prompt skipped:', recognitionPromptError)
  }

  let contract: Record<string, unknown> | null = null
  const shouldSendContract = options.sendContract !== false
  const provider = CONTRACT_PROVIDERS.includes(options.contractProvider as (typeof CONTRACT_PROVIDERS)[number])
    ? options.contractProvider
    : "internal"

  const candidateUserId =
    (typeof candidate.user_id === "string" && candidate.user_id) ||
    (typeof candidate.applicant_id === "string" && candidate.applicant_id) ||
    null

  if (shouldSendContract && candidateUserId) {
    try {
      const contractTerms = options.contractTerms || `Offer details for ${candidate.position ?? "the role"}`
      contract = (await sendHireContractWithProvider({
        supabase,
        payload: {
          ownerUserId: actorUserId,
          counterpartyUserId: candidateUserId,
          clientName: (candidate.name as string) || (candidate.email as string) || "Candidate",
          clientEmail: (candidate.email as string) || null,
          title: `${candidate.position ?? "Role"} - Employment Contract`,
          terms: contractTerms,
          provider: provider as (typeof CONTRACT_PROVIDERS)[number],
          metadata: {
            source: "hiring_application_approval",
            application_id: applicationId,
            candidate_id: candidate.id,
            venue_id: application.venue_id,
          },
        },
      })) as unknown as Record<string, unknown>
    } catch (contractError) {
      console.warn("[HiringApproval] Failed to send contract:", contractError)
    }
  }

  // The approval + onboarding messages are posted into the applicant's work
  // thread by runStaffApplicationApprovedSideEffects (below), which works for
  // every employer entity type — not just venues. When onboarding is ready at
  // approval time, stamp the candidate so the admin Candidates UI reflects that
  // the onboarding invitation was delivered.
  if (candidateUserId && onboardingReady) {
    try {
      await supabase
        .from("staff_onboarding_candidates")
        .update({ onboarding_notification_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", candidate.id)
    } catch (stampError) {
      console.warn("[HiringApproval] Failed to stamp onboarding_notification_sent_at:", stampError)
    }
  }

  await writeLegacyAuditEvent({
    supabase,
    actorUserId,
    applicationId,
    jobId: application.job_posting_id,
    venueId: application.venue_id,
    employer,
    action: "approve",
    fromStatus: currentStatus,
    toStatus: "approved",
    metadata: {
      candidate_id: candidate.id,
      onboarding_url: onboardingUrl,
      contract_id: contract?.contractId || contract?.id || null,
      contract_provider: contract?.provider || null,
      eligibility_mode: eligibility.mode,
      eligibility_blocking_reasons: eligibility.blocking_reasons,
    },
  })

  if (candidateUserId) {
    void runStaffApplicationApprovedSideEffects({
      applicationId,
      applicantUserId: candidateUserId,
      candidateId: typeof candidate.id === "string" ? candidate.id : null,
      venueId: application.venue_id,
      employerEntityType: employer.entityType,
      employerEntityId: employer.entityId,
      jobPostingId: application.job_posting_id,
      actorUserId,
      onboardingUrl,
      positionTitle: (candidate.position as string | null) ?? null,
      jobTitle,
      employerName,
      templateName,
      onboardingReady,
      onboardingPending: isPendingTemplate,
      warnings,
    })
  }

  return ok({
    application: approvalResult.data.application as Record<string, unknown>,
    candidate,
    invitation,
    workflow: (approvalResult.data.workflow as Record<string, unknown> | null) ?? null,
    employmentAssignment: (approvalResult.data.employmentAssignment as Record<string, unknown> | null) ?? null,
    onboardingUrl,
    contract,
    onboarding: {
      id: onboardingTemplate?.id ?? null,
      name: templateName,
      source: onboardingTemplate?.source ?? null,
      state: onboardingTemplate?.state ?? "pending",
      isPending: isPendingTemplate,
    },
    warnings,
  })
}
