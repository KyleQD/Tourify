/**
 * In-app notification when an admin requests onboarding changes after review.
 */

import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import { generalNotificationTarget } from "@/lib/notifications/notification-target"

export interface OnboardingChangesRequestedContext {
  workerUserId: string
  candidateId: string
  notes: string
  onboardingUrl?: string | null
  jobTitle?: string | null
  employerName?: string | null
  employerEntityType?: string | null
  employerEntityId?: string | null
}

export async function sendOnboardingChangesRequestedNotification(
  ctx: OnboardingChangesRequestedContext
): Promise<{ sent: boolean }> {
  const {
    workerUserId,
    candidateId,
    notes,
    onboardingUrl,
    jobTitle,
    employerName,
    employerEntityType,
    employerEntityId,
  } = ctx

  const fromEmployer = employerName ? ` from ${employerName}` : ""
  const forRole = jobTitle ? ` for ${jobTitle}` : ""
  const title = `Changes requested on your onboarding${fromEmployer}`
  const contentLines = [
    `Your hiring team asked you to update your onboarding${forRole}.`,
    notes.trim(),
  ]
  if (onboardingUrl) contentLines.push(`Open your onboarding link: ${onboardingUrl}`)

  try {
    await OptimizedNotificationService.createNotification({
      userId: workerUserId,
      type: "hiring_onboarding_changes_requested",
      title,
      content: contentLines.join("\n\n"),
      priority: "high",
      ...generalNotificationTarget(workerUserId),
      metadata: {
        candidate_id: candidateId,
        notes: notes.trim(),
        onboarding_url: onboardingUrl ?? null,
        job_title: jobTitle ?? null,
        employer_name: employerName ?? null,
        employer_entity_type: employerEntityType ?? null,
        employer_entity_id: employerEntityId ?? null,
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[hiring-onboarding-changes-notify] Failed to send changes-requested notification:", err)
    return { sent: false }
  }
}
