import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

/**
 * Ticket lifecycle notifications via existing notification service.
 * Failures are logged and never break payment/issuance flows.
 */

async function safeNotify(input: {
  userId: string
  type: string
  title: string
  content: string
  relatedContentId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await OptimizedNotificationService.createNotification({
      userId: input.userId,
      type: input.type as any,
      title: input.title,
      content: input.content,
      relatedContentId: input.relatedContentId,
      relatedContentType: 'ticket',
      priority: 'normal',
      metadata: {
        ...input.metadata,
        idempotency_key: input.metadata?.idempotency_key,
      },
    })
  } catch (error) {
    console.warn('[ticketing.notify] skipped', input.type, error)
  }
}

export async function notifyOrderConfirmed(params: {
  userId: string
  orderId: string
  eventTitle?: string
}): Promise<void> {
  await safeNotify({
    userId: params.userId,
    type: 'ticket',
    title: 'Order confirmed',
    content: params.eventTitle
      ? `Your tickets for ${params.eventTitle} are ready.`
      : 'Your ticket order is confirmed.',
    relatedContentId: params.orderId,
    metadata: { idempotency_key: `order_confirmed:${params.orderId}` },
  })
}

export async function notifyTransferRequested(params: {
  toUserId: string
  transferId: string
  fromName?: string
}): Promise<void> {
  await safeNotify({
    userId: params.toUserId,
    type: 'ticket',
    title: 'Ticket transfer request',
    content: params.fromName
      ? `${params.fromName} wants to transfer a ticket to you.`
      : 'You have a pending ticket transfer.',
    relatedContentId: params.transferId,
    metadata: { idempotency_key: `transfer_requested:${params.transferId}` },
  })
}

export async function notifyTransferAccepted(params: {
  fromUserId: string
  toUserId: string
  transferId: string
}): Promise<void> {
  await safeNotify({
    userId: params.fromUserId,
    type: 'ticket',
    title: 'Transfer accepted',
    content: 'Your ticket transfer was accepted.',
    relatedContentId: params.transferId,
    metadata: { idempotency_key: `transfer_accepted_from:${params.transferId}` },
  })
  await safeNotify({
    userId: params.toUserId,
    type: 'ticket',
    title: 'Ticket received',
    content: 'A ticket was transferred to you. Open your wallet to view the QR code.',
    relatedContentId: params.transferId,
    metadata: { idempotency_key: `transfer_accepted_to:${params.transferId}` },
  })
}

export async function notifyTicketRefunded(params: {
  userId: string
  orderId: string
}): Promise<void> {
  await safeNotify({
    userId: params.userId,
    type: 'ticket',
    title: 'Ticket refunded',
    content: 'A refund was processed for your ticket order.',
    relatedContentId: params.orderId,
    metadata: { idempotency_key: `ticket_refunded:${params.orderId}` },
  })
}

export async function notifyCompIssued(params: {
  userId: string
  ticketId: string
  eventTitle?: string
}): Promise<void> {
  await safeNotify({
    userId: params.userId,
    type: 'ticket',
    title: 'Complimentary ticket issued',
    content: params.eventTitle
      ? `You received a complimentary ticket for ${params.eventTitle}.`
      : 'You received a complimentary ticket.',
    relatedContentId: params.ticketId,
    metadata: { idempotency_key: `comp_issued:${params.ticketId}` },
  })
}
