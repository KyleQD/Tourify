/**
 * Thin wrapper around OptimizedNotificationService for logistics fan-out.
 * Never notify recipients who are not authorized for the record.
 */

export interface LogisticsNotificationRecipient {
  userId: string
  isAuthorized: boolean
}

export interface LogisticsNotificationPayload {
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
  requireAck?: boolean
  sourceType?: string
  sourceId?: string
}

export function filterAuthorizedRecipients(
  recipients: LogisticsNotificationRecipient[]
): string[] {
  return recipients
    .filter((r) => r.isAuthorized && Boolean(r.userId))
    .map((r) => r.userId)
}

export async function sendLogisticsNotifications(args: {

  notify: (input: any) => Promise<unknown>
  actorUserId: string
  recipients: LogisticsNotificationRecipient[]
  payload: LogisticsNotificationPayload
  idempotencyKey?: string
}): Promise<{ sentTo: string[]; skipped: number }> {
  const userIds = filterAuthorizedRecipients(args.recipients)
  if (userIds.length === 0) return { sentTo: [], skipped: args.recipients.length }

  const unique = Array.from(new Set(userIds.filter((id) => id !== args.actorUserId)))
  if (unique.length === 0) return { sentTo: [], skipped: args.recipients.length }

  await args.notify({
    userIds: unique,
    type: args.payload.type,
    title: args.payload.title,
    message: args.payload.message,
    link: args.payload.link,
    metadata: {
      ...(args.payload.metadata || {}),
      logistics: true,
      require_ack: Boolean(args.payload.requireAck),
      source_type: args.payload.sourceType,
      source_id: args.payload.sourceId,
      idempotency_key: args.idempotencyKey,
    },
  })

  return {
    sentTo: unique,
    skipped: args.recipients.length - unique.length,
  }
}
