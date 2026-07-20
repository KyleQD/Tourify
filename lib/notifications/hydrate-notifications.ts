export interface NotificationRelatedUser {
  id: string
  full_name: string | null
  username: string
  avatar_url: string | null
}

export interface NotificationRow {
  id: string
  type: string
  title: string
  content: string
  summary?: string | null
  metadata?: Record<string, unknown> | null
  related_user_id?: string | null
  is_read: boolean
  priority?: string | null
  created_at: string
  target_profile_id?: string | null
  target_account_type?: string | null
  expires_at?: string | null
  [key: string]: unknown
}

export interface HydratedNotification extends NotificationRow {
  related_user?: NotificationRelatedUser | null
}

/**
 * Hydrate related_user from profiles without relying on PostgREST FK embeds.
 * notifications.related_user_id → auth.users, not profiles.
 */
export function hydrateNotificationsWithProfiles(params: {
  notifications: NotificationRow[]
  profiles: NotificationRelatedUser[]
}): HydratedNotification[] {
  const profileMap = new Map(params.profiles.map((profile) => [profile.id, profile]))

  return params.notifications.map((notification) => ({
    ...notification,
    related_user: notification.related_user_id
      ? profileMap.get(notification.related_user_id) ?? null
      : null,
  }))
}

export function collectRelatedUserIds(notifications: NotificationRow[]): string[] {
  return [...new Set(
    notifications
      .map((notification) => notification.related_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  )]
}
