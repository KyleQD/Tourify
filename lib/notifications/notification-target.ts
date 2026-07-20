/**
 * Helpers for tagging notifications with the receiving acting-account inbox.
 */

export type NotificationTargetAccountType =
  | 'general'
  | 'artist'
  | 'service'
  | 'venue'
  | 'organization'

export interface NotificationTarget {
  targetProfileId: string
  targetAccountType: NotificationTargetAccountType
}

/** Personal / social / applicant-facing inbox. */
export function generalNotificationTarget(userId: string): NotificationTarget {
  return {
    targetProfileId: userId,
    targetAccountType: 'general',
  }
}

/** Map hiring employer entity types onto notification account types. */
export function entityNotificationTarget(args: {
  entityType?: string | null
  entityId?: string | null
  /** Fallback when entity is unknown — keeps row on personal until backfill. */
  fallbackUserId: string
}): NotificationTarget {
  const entityId = args.entityId?.trim()
  const rawType = (args.entityType || '').toLowerCase()

  if (!entityId)
    return generalNotificationTarget(args.fallbackUserId)

  if (rawType === 'venue')
    return { targetProfileId: entityId, targetAccountType: 'venue' }

  if (rawType === 'artist' || rawType === 'service')
    return {
      targetProfileId: entityId,
      targetAccountType: rawType === 'service' ? 'service' : 'artist',
    }

  if (
    rawType === 'organization' ||
    rawType === 'organizer' ||
    rawType === 'admin' ||
    rawType === 'org'
  ) {
    return { targetProfileId: entityId, targetAccountType: 'organization' }
  }

  // Unknown entity type with an id — treat as organization brand by default
  // when it looks like an employer-scoped notification.
  return { targetProfileId: entityId, targetAccountType: 'organization' }
}
