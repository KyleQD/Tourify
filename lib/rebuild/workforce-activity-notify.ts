import "server-only"

import { entityNotificationTarget, generalNotificationTarget } from "@/lib/notifications/notification-target"
import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface WorkforceActivityNotification {
  recipientUserId: string
  actorUserId: string
  type: string
  title: string
  content: string
  sourceType: string
  sourceId: string
  link: string
  priority?: "low" | "normal" | "high" | "urgent"
  targetEntityType?: "organization" | "venue" | "artist" | null
  targetEntityId?: string | null
}

export async function sendWorkforceActivityNotification(input: WorkforceActivityNotification) {
  if (input.recipientUserId === input.actorUserId) return { sent: false, duplicate: false }
  const service = createServiceRoleClient()
  const dedupeKey = `${input.sourceType}:${input.sourceId}:${input.type}`
  const { data: existing } = await service
    .from("notifications")
    .select("id")
    .eq("user_id", input.recipientUserId)
    .eq("type", input.type)
    .contains("metadata", { dedupe_key: dedupeKey })
    .limit(1)
    .maybeSingle()
  if (existing?.id) return { sent: false, duplicate: true }

  const { data: organizerAccount } = await service
    .from("organizer_accounts")
    .select("id")
    .eq("user_id", input.recipientUserId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  const target = input.targetEntityId
    ? entityNotificationTarget({ entityType: input.targetEntityType, entityId: input.targetEntityId, fallbackUserId: input.recipientUserId })
    : organizerAccount?.id
    ? entityNotificationTarget({ entityType: "organization", entityId: organizerAccount.id, fallbackUserId: input.recipientUserId })
    : generalNotificationTarget(input.recipientUserId)

  try {
    await OptimizedNotificationService.createNotification({
      userId: input.recipientUserId,
      type: input.type,
      title: input.title,
      content: input.content,
      priority: input.priority ?? "normal",
      ...target,
      relatedUserId: input.actorUserId,
      metadata: {
        source_type: input.sourceType,
        source_id: input.sourceId,
        dedupe_key: dedupeKey,
        link: input.link,
      },
    })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { sent: false, duplicate: true }
    }
    throw error
  }
  return { sent: true, duplicate: false }
}
