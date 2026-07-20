/**
 * Post-approve side-effects for the staffing hiring pipeline.
 *
 * This module is the single canonical hook that runs after an application is
 * approved (application status → "approved").  The approve endpoint in
 * app/api/admin/applications/route.ts already handles the heavyweight steps
 * (candidate creation, invitation token stamping, contract sending, audit
 * events).  This hook is the place for lighter, optional side-effects that
 * would otherwise be copy-pasted across callers or silently dropped.
 *
 * All steps run in try/catch so that a failure in one does not roll back the
 * approval itself.
 */

import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { postApplicantHiringMessage } from '@/lib/rebuild/hiring-applicant-comms'
import {
  entityNotificationTarget,
  generalNotificationTarget,
} from '@/lib/notifications/notification-target'

export interface ApplicationApprovedContext {
  applicationId: string
  applicantUserId: string
  /** Onboarding candidate id, used to attribute the onboarding invitation. */
  candidateId?: string | null
  venueId?: string | null
  /** Hiring employer entity (org/venue/artist) — scopes actor notifications. */
  employerEntityType?: string | null
  employerEntityId?: string | null
  jobPostingId?: string | null
  actorUserId: string
  /**
   * Onboarding URL to send in the follow-up onboarding notification when a real
   * template is ready at approval time. The approval notification itself never
   * embeds the link — onboarding is always a separate notification + message.
   */
  onboardingUrl?: string | null
  /** Position/role title for human-readable messages. */
  positionTitle?: string | null
  /** Job posting title, used in the approval message when available. */
  jobTitle?: string | null
  /** Hiring organization/employer display name, used to attribute the message. */
  employerName?: string | null
  /** Resolved onboarding template name, surfaced as the onboarding process. */
  templateName?: string | null
  /** True when a real onboarding template + link are available to send now. */
  onboardingReady?: boolean
  /** True when approved but no employer onboarding template is configured yet. */
  onboardingPending?: boolean
  /** Non-blocking admin-facing warnings (e.g. roster shell failure). */
  warnings?: string[]
}

/**
 * Run all post-approve side-effects for a staffing job application.
 * Safe to call from any context — each step is wrapped in its own try/catch.
 */
export async function runStaffApplicationApprovedSideEffects(
  ctx: ApplicationApprovedContext
): Promise<void> {
  const {
    applicationId,
    applicantUserId,
    candidateId,
    venueId,
    employerEntityType,
    employerEntityId,
    jobPostingId,
    actorUserId,
    onboardingUrl,
    positionTitle,
    jobTitle,
    employerName,
    templateName,
    onboardingReady,
    onboardingPending,
    warnings,
  } = ctx

  // Onboarding is ready only when a real template + link exist. Fall back to the
  // link presence when the flags are not supplied by the caller.
  const hasOnboarding = onboardingReady ?? Boolean(onboardingUrl && templateName)
  const isPending = onboardingPending ?? !hasOnboarding

  const roleLabel = jobTitle || positionTitle
  const forRole = roleLabel ? ` for ${roleLabel}` : ''

  // 1. Post a hiring-manager message into the applicant's work thread so the
  //    approval shows up in their message center, and capture the conversation
  //    id so the notification can deep-link straight to it.
  let conversationId: string | null = null
  try {
    const messageEmployer = employerName ? ` at ${employerName}` : ''
    const messageBody = `You've been approved${forRole}${messageEmployer}. Welcome aboard!${
      isPending ? ' Your onboarding details will be sent here shortly.' : ''
    }`
    const result = await postApplicantHiringMessage({
      applicationId,
      applicantUserId,
      hiringManagerUserId: actorUserId,
      content: messageBody,
    })
    conversationId = result.conversationId
  } catch (err) {
    console.warn('⚠️ [hiring-automation] Failed to post approval message to applicant thread:', err)
  }

  // 2. Notify the applicant that they have been approved. This notification is
  //    congratulations only — onboarding instructions are always delivered as a
  //    separate notification (step 4) so the two events stay distinct.
  try {
    const fromEmployer = employerName ? ` by ${employerName}` : ''
    const title = employerName ? `You're hired at ${employerName}!` : "You've been hired!"

    const instructionLines = [
      `Congratulations! Your application${forRole} was approved${fromEmployer}.`,
    ]
    instructionLines.push(
      isPending
        ? 'Your onboarding information will be sent to you soon.'
        : 'Your onboarding instructions are on the way.'
    )

    const applicantTarget = generalNotificationTarget(applicantUserId)
    await OptimizedNotificationService.createNotification({
      userId: applicantUserId,
      type: 'hiring_application_approved',
      title,
      content: instructionLines.join(' '),
      ...applicantTarget,
      metadata: {
        application_id: applicationId,
        venue_id: venueId ?? null,
        job_posting_id: jobPostingId ?? null,
        conversation_id: conversationId,
        onboarding_pending: isPending,
        job_title: jobTitle ?? null,
        employer_name: employerName ?? null,
        onboarding_template_name: templateName ?? null,
        approved_by: actorUserId,
      },
    })
  } catch (err) {
    console.warn('⚠️ [hiring-automation] Failed to send approval notification to applicant:', err)
  }

  // 3. Notify the approving organizer / actor for their own activity feed.
  try {
    const actorLines = [`You approved an application${positionTitle ? ` for ${positionTitle}` : ''}.`]
    if (hasOnboarding) {
      actorLines.push('Onboarding invitation sent to the applicant.')
    } else if (isPending) {
      actorLines.push('Assign an onboarding template to send onboarding instructions.')
    }
    if (warnings && warnings.length > 0) actorLines.push(...warnings)

    const resolvedEmployerId = employerEntityId || venueId || null
    const resolvedEmployerType =
      employerEntityType || (venueId ? 'venue' : resolvedEmployerId ? 'organization' : null)
    const actorTarget = entityNotificationTarget({
      entityType: resolvedEmployerType,
      entityId: resolvedEmployerId,
      fallbackUserId: actorUserId,
    })

    await OptimizedNotificationService.createNotification({
      userId: actorUserId,
      type: 'hiring_application_approved_actor',
      title: 'Application approved',
      content: actorLines.join(' '),
      ...actorTarget,
      metadata: {
        application_id: applicationId,
        venue_id: venueId ?? null,
        employer_entity_type: resolvedEmployerType,
        employer_entity_id: resolvedEmployerId,
        job_posting_id: jobPostingId ?? null,
        onboarding_pending: isPending,
        warnings: warnings ?? [],
      },
    })
  } catch (err) {
    console.warn('⚠️ [hiring-automation] Failed to send approval notification to actor:', err)
  }

  // 4. When a real onboarding template + link are ready at approval time, send
  //    the onboarding invitation as its own notification + task-card message so
  //    the applicant always receives two distinct events (approval, onboarding).
  if (hasOnboarding && onboardingUrl) {
    try {
      const { sendOnboardingInviteNotification } = await import('@/lib/rebuild/hiring-onboarding-notify')
      await sendOnboardingInviteNotification({
        applicantUserId,
        candidateId: candidateId ?? applicationId,
        applicationId,
        hiringManagerUserId: actorUserId,
        onboardingUrl,
        templateName,
        jobTitle: jobTitle ?? positionTitle ?? null,
        employerName: employerName ?? null,
      })
    } catch (err) {
      console.warn('⚠️ [hiring-automation] Failed to send onboarding invite at approval:', err)
    }
  }
}
