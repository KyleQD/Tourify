/**
 * In-app notification when an admin approves onboarding and adds the worker to the roster.
 */

import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import { generalNotificationTarget } from "@/lib/notifications/notification-target"

export interface RosterAddedNotificationContext {
  workerUserId: string
  candidateId: string
  staffMemberId?: string | null
  jobTitle?: string | null
  employerName?: string | null
  employerEntityType?: string | null
  employerEntityId?: string | null
}

export async function sendRosterAddedNotification(
  ctx: RosterAddedNotificationContext
): Promise<{ sent: boolean }> {
  const { workerUserId, candidateId, staffMemberId, jobTitle, employerName, employerEntityType, employerEntityId } =
    ctx

  const forRole = jobTitle ? ` as ${jobTitle}` : ""
  const fromEmployer = employerName ? ` at ${employerName}` : ""
  const title = `You're on the roster${fromEmployer}`
  const content = `Your onboarding was approved and you've been added to the team roster${forRole}. Your admin can assign your role, team, and shifts next.`

  try {
    await OptimizedNotificationService.createNotification({
      userId: workerUserId,
      type: "hiring_roster_added",
      title,
      content,
      priority: "high",
      ...generalNotificationTarget(workerUserId),
      metadata: {
        candidate_id: candidateId,
        staff_member_id: staffMemberId ?? null,
        job_title: jobTitle ?? null,
        employer_name: employerName ?? null,
        employer_entity_type: employerEntityType ?? null,
        employer_entity_id: employerEntityId ?? null,
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[hiring-roster-notify] Failed to send roster-added notification:", err)
    return { sent: false }
  }
}
