/**
 * Focused in-app notification for hiring onboarding invitations.
 *
 * Used both on approval (when a template is ready) and when an admin
 * assigns/changes an onboarding template or resends from the Candidates page.
 * The applicant receives the link in their general profile notifications and,
 * when the application context is known, an actionable task card in their
 * message center. No email/SMS is sent here.
 */

import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import { postApplicantHiringMessage } from "@/lib/rebuild/hiring-applicant-comms"

export interface OnboardingInviteNotificationContext {
  applicantUserId: string
  candidateId: string
  onboardingUrl?: string | null
  templateName?: string | null
  jobTitle?: string | null
  employerName?: string | null
  /** True when this is a re-send rather than the first assignment. */
  isResend?: boolean
  /** Job application id, required to post the onboarding task card in messages. */
  applicationId?: string | null
  /** Hiring manager user id, used as the sender of the task-card message. */
  hiringManagerUserId?: string | null
}

export async function sendOnboardingInviteNotification(
  ctx: OnboardingInviteNotificationContext
): Promise<{ sent: boolean }> {
  const {
    applicantUserId,
    candidateId,
    onboardingUrl,
    templateName,
    jobTitle,
    employerName,
    isResend,
    applicationId,
    hiringManagerUserId,
  } = ctx

  const forRole = jobTitle ? ` for ${jobTitle}` : ""
  const fromEmployer = employerName ? ` at ${employerName}` : ""
  const title = isResend ? "Onboarding reminder" : `Complete your onboarding${fromEmployer}`

  // Post an actionable task card into the applicant's work thread when we have
  // enough context to resolve the conversation.
  let conversationId: string | null = null
  if (onboardingUrl && applicationId && hiringManagerUserId) {
    const messageBody = templateName
      ? `Complete your "${templateName}" onboarding${forRole} to get started.`
      : `Complete your onboarding${forRole} to get started.`
    const result = await postApplicantHiringMessage({
      applicationId,
      applicantUserId,
      hiringManagerUserId,
      content: messageBody,
      taskCard: {
        title: isResend ? "Onboarding reminder" : "Start your onboarding",
        description: messageBody,
        actionUrl: onboardingUrl,
        actionLabel: "Start onboarding",
      },
    })
    conversationId = result.conversationId
  }

  const lines = [
    templateName
      ? `Please complete your "${templateName}" onboarding${forRole} to get started.`
      : `Please complete your onboarding${forRole} to get started.`,
  ]
  if (onboardingUrl) lines.push(onboardingUrl)

  try {
    await OptimizedNotificationService.createNotification({
      userId: applicantUserId,
      type: "hiring_onboarding_invite",
      title,
      content: lines.join(" "),
      priority: "high",
      metadata: {
        candidate_id: candidateId,
        onboarding_url: onboardingUrl ?? null,
        onboarding_template_name: templateName ?? null,
        job_title: jobTitle ?? null,
        employer_name: employerName ?? null,
        conversation_id: conversationId,
        is_resend: Boolean(isResend),
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[hiring-onboarding-notify] Failed to send onboarding invite notification:", err)
    return { sent: false }
  }
}
