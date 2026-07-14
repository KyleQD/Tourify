import type { SupabaseClient } from '@supabase/supabase-js'
import {
  collectRelatedUserIds,
  hydrateNotificationsWithProfiles,
  type HydratedNotification,
  type NotificationRow,
} from '@/lib/notifications/hydrate-notifications'

export interface FetchUserNotificationsParams {
  supabase: SupabaseClient
  userId: string
  limit?: number
  unreadOnly?: boolean
  type?: string
  /** When set and not general, filter by target_profile_id if column exists */
  targetProfileId?: string | null
  accountType?: string | null
}

export interface FetchUserNotificationsResult {
  notifications: HydratedNotification[]
  unreadCount: number
  error: string | null
  inAppDisabled: boolean
}

let targetProfileColumnSupported: boolean | null = null

async function supportsTargetProfileColumn(supabase: SupabaseClient): Promise<boolean> {
  if (targetProfileColumnSupported !== null)
    return targetProfileColumnSupported

  const { error } = await supabase
    .from('notifications')
    .select('target_profile_id')
    .limit(1)

  if (!error) {
    targetProfileColumnSupported = true
    return true
  }

  if (/column .*target_profile_id.* does not exist/i.test(error.message || '')) {
    targetProfileColumnSupported = false
    return false
  }

  // Unknown error — do not apply entity filter
  return false
}

/** Cheap unread badge query — does not load the full notification list. */
export async function fetchUnreadNotificationCount(args: {
  supabase: SupabaseClient
  userId: string
}): Promise<number> {
  const { supabase, userId } = args
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  return count ?? 0
}

export async function fetchUserNotifications(
  params: FetchUserNotificationsParams
): Promise<FetchUserNotificationsResult> {
  const {
    supabase,
    userId,
    limit = 100,
    unreadOnly,
    type,
    targetProfileId,
    accountType,
  } = params

  const { data: prefsRow } = await supabase
    .from('notification_preferences')
    .select('in_app_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (prefsRow && prefsRow.in_app_enabled === false) {
    return {
      notifications: [],
      unreadCount: 0,
      error: null,
      inAppDisabled: true,
    }
  }

  let notifQuery = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly)
    notifQuery = notifQuery.eq('is_read', false)

  if (type)
    notifQuery = notifQuery.eq('type', type)

  const shouldScopeEntity =
    accountType &&
    accountType !== 'general' &&
    targetProfileId

  if (shouldScopeEntity) {
    const hasTargetColumn = await supportsTargetProfileColumn(supabase)
    if (hasTargetColumn) {
      notifQuery = notifQuery.or(
        `target_profile_id.eq.${targetProfileId},target_profile_id.is.null`
      )
    }
  }

  const { data, error } = await notifQuery

  if (error) {
    return {
      notifications: [],
      unreadCount: 0,
      error: error.message || 'Failed to fetch notifications',
      inAppDisabled: false,
    }
  }

  const rows = (data || []) as NotificationRow[]
  const relatedIds = collectRelatedUserIds(rows)
  let profiles: Array<{
    id: string
    full_name: string | null
    username: string
    avatar_url: string | null
  }> = []

  if (relatedIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', relatedIds)

    profiles = profileRows || []
  }

  const notifications = hydrateNotificationsWithProfiles({
    notifications: rows,
    profiles,
  })

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  return {
    notifications,
    unreadCount: count ?? notifications.filter((n) => !n.is_read).length,
    error: null,
    inAppDisabled: false,
  }
}
