import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

export async function sendPromoterLifecycleNotification(input: {
  userId: string | null | undefined
  eventId: string
  programId: string
  applicationId?: string | null
  membershipId?: string | null
  action: string
  eventTitle?: string | null
}) {
  if (!input.userId) return { sent: false }

  const label = input.eventTitle?.trim() || 'an event'
  const copy = {
    apply: { title: 'New promoter application', content: `A promoter applied to help promote ${label}.` },
    invite: { title: 'You are invited to promote an event', content: `You have been invited to promote ${label}.` },
    approve: { title: 'Promoter application approved', content: `You are approved to promote ${label}.` },
    reject: { title: 'Promoter application update', content: `Your application to promote ${label} was not approved.` },
    accept_invitation: { title: 'Promoter invitation accepted', content: `A promoter accepted an invitation for ${label}.` },
    suspend: { title: 'Promoter access paused', content: `Your promoter access for ${label} has been suspended.` },
    revoke: { title: 'Promoter access revoked', content: `Your promoter access for ${label} has been revoked.` },
  }[input.action] || { title: 'Promoter program update', content: `There is an update to the promoter program for ${label}.` }

  try {
    await OptimizedNotificationService.createNotification({
      userId: input.userId,
      type: `event_promoter_${input.action}`,
      title: copy.title,
      content: copy.content,
      priority: input.action === 'approve' || input.action === 'invite' ? 'high' : 'normal',
      relatedContentId: input.programId,
      relatedContentType: 'event_promoter_program',
      metadata: {
        event_id: input.eventId,
        program_id: input.programId,
        application_id: input.applicationId || null,
        membership_id: input.membershipId || null,
        action: input.action,
        link: '/promoter/opportunities',
      },
    })
    return { sent: true }
  } catch (error) {
    console.warn('[event-promoter] lifecycle notification failed', input.action, error)
    return { sent: false }
  }
}

export async function sendPromoterPayoutNotification(input: {
  userId: string | null | undefined
  eventId: string
  programId: string
  membershipId: string
  action: 'allocated' | 'paid' | 'failed'
  eventTitle?: string | null
}) {
  if (!input.userId) return { sent: false }

  const label = input.eventTitle?.trim() || 'an event'
  const copy = {
    allocated: { title: 'Promoter payout scheduled', content: `Your promoter earnings for ${label} are being prepared for settlement.` },
    paid: { title: 'Promoter payout confirmed', content: `Your promoter payout for ${label} has been confirmed.` },
    failed: { title: 'Promoter payout delayed', content: `Your promoter payout for ${label} needs additional review before it can be completed.` },
  }[input.action]

  try {
    await OptimizedNotificationService.createNotification({
      userId: input.userId,
      type: `event_promoter_payout_${input.action}`,
      title: copy.title,
      content: copy.content,
      priority: input.action === 'paid' ? 'high' : 'normal',
      relatedContentId: input.programId,
      relatedContentType: 'event_promoter_program',
      metadata: {
        event_id: input.eventId,
        program_id: input.programId,
        membership_id: input.membershipId,
        action: input.action,
        link: '/promoter/earnings',
      },
    })
    return { sent: true }
  } catch (error) {
    console.warn('[event-promoter] payout notification failed', input.action, error)
    return { sent: false }
  }
}
