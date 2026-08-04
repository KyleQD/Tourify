import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyNotificationAccountScope,
  applyNotificationAccountScopes,
  type NotificationAccountScope,
} from '@/lib/notifications/account-scope'
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
  /** Acting-entity profile UUID when not on personal/general */
  targetProfileId?: string | null
  accountType?: string | null
  /** Allowed inboxes for a combined account feed; takes precedence over active-account fields. */
  accountScopes?: NotificationAccountScope[]
}

export interface FetchUserNotificationsResult {
  notifications: HydratedNotification[]
  unreadCount: number
  error: string | null
  inAppDisabled: boolean
}

function toScope(params: {
  userId: string
  targetProfileId?: string | null
  accountType?: string | null
}): NotificationAccountScope {
  return {
    userId: params.userId,
    targetProfileId: params.targetProfileId,
    accountType: params.accountType,
  }
}

function applyRequestedAccountScope<T>(
  query: T,
  params: {
    userId: string
    targetProfileId?: string | null
    accountType?: string | null
    accountScopes?: NotificationAccountScope[]
  },
): T {
  if (params.accountScopes)
    return applyNotificationAccountScopes(query, params.userId, params.accountScopes)

  return applyNotificationAccountScope(query, toScope(params))
}

/** Cheap unread badge query — does not load the full notification list. */
export async function fetchUnreadNotificationCount(args: {
  supabase: SupabaseClient
  userId: string
  targetProfileId?: string | null
  accountType?: string | null
  accountScopes?: NotificationAccountScope[]
}): Promise<number> {
  const { supabase, userId, targetProfileId, accountType, accountScopes } = args
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  query = applyRequestedAccountScope(query, {
    userId,
    targetProfileId,
    accountType,
    accountScopes,
  })

  const { count } = await query
  return count ?? 0
}

/** Mark all unread notifications in the active account inbox as read. */
export async function markAccountNotificationsAsRead(args: {
  supabase: SupabaseClient
  userId: string
  targetProfileId?: string | null
  accountType?: string | null
  accountScopes?: NotificationAccountScope[]
}): Promise<{ error: string | null }> {
  const { supabase, userId, targetProfileId, accountType, accountScopes } = args
  const readAt = new Date().toISOString()

  let query = supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq('user_id', userId)
    .eq('is_read', false)

  query = applyRequestedAccountScope(query, {
    userId,
    targetProfileId,
    accountType,
    accountScopes,
  })

  const { error } = await query
  if (error) return { error: error.message || 'Failed to mark notifications as read' }
  return { error: null }
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
    accountScopes,
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

  notifQuery = applyRequestedAccountScope(notifQuery, {
    userId,
    targetProfileId,
    accountType,
    accountScopes,
  })

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
    username: string | null
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

  const unreadCount = await fetchUnreadNotificationCount({
    supabase,
    userId,
    targetProfileId,
    accountType,
    accountScopes,
  })

  return {
    notifications,
    unreadCount,
    error: null,
    inAppDisabled: false,
  }
}
