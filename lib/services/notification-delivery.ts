import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  sendEmailNotification,
  sendPushNotification,
  sendSMSNotification,
} from '@/lib/services/notification-channels'

export interface OutboundNotificationPayload {
  id: string
  userId: string
  type: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, unknown> | null
}

const PREFERENCE_TYPE_KEYS = [
  'like',
  'comment',
  'share',
  'follow',
  'message',
  'event_invite',
  'booking_request',
  'system_alert',
] as const

type PreferenceTypeKey = (typeof PREFERENCE_TYPE_KEYS)[number]

function notificationTypeToPreferenceKey(type: string): PreferenceTypeKey {
  if (type === 'follow_request' || type === 'follow_accepted' || type === 'unfollow') return 'follow'
  if (type === 'message_request' || type === 'group_message') return 'message'
  if (type === 'event_reminder') return 'event_invite'
  if (type === 'booking_accepted' || type === 'booking_declined') return 'booking_request'
  if (type === 'maintenance' || type === 'feature_update' || type === 'security_alert') return 'system_alert'
  if (PREFERENCE_TYPE_KEYS.includes(type as PreferenceTypeKey)) return type as PreferenceTypeKey
  return 'system_alert'
}

function defaultChannelRow() {
  return { email: true, push: true, sms: false }
}

function getPerTypeChannels(preferences: Record<string, unknown> | null | undefined, type: string) {
  const key = notificationTypeToPreferenceKey(type)
  const block = preferences?.[key]
  if (!block || typeof block !== 'object') return defaultChannelRow()
  const o = block as Record<string, unknown>
  return {
    email: typeof o.email === 'boolean' ? o.email : true,
    push: typeof o.push === 'boolean' ? o.push : true,
    sms: typeof o.sms === 'boolean' ? o.sms : false,
  }
}

function getDb() {
  return createServiceRoleClient()
}

export async function getUserContactForDelivery(userId: string): Promise<{
  email?: string
  phone?: string
  pushToken?: string
}> {
  const db = getDb()
  const [authResult, profileResult] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from('profiles').select('phone, push_token, metadata').eq('id', userId).maybeSingle(),
  ])

  const email = authResult.data?.user?.email ?? undefined
  const row = profileResult.data as
    | { phone?: string | null; push_token?: string | null; metadata?: Record<string, unknown> | null }
    | null

  const metaPhone =
    row?.metadata && typeof row.metadata === 'object' && 'phone' in row.metadata
      ? String((row.metadata as { phone?: string }).phone || '').trim() || undefined
      : undefined

  const phone = (row?.phone && String(row.phone).trim()) || metaPhone
  const pushToken = row?.push_token && String(row.push_token).trim() ? String(row.push_token) : undefined

  return { email, phone, pushToken }
}

/**
 * Sends email / push / SMS for one notification row using notification_preferences
 * (global flags, sms_enabled, per-type JSON, quiet hours are already applied for in-app;
 * outbound still respects quiet hours for normal priority only when implementing in SQL;
 * here we mirror quiet hours for email/push/sms for normal priority.)
 */
export async function deliverNotificationOutbound(
  notification: OutboundNotificationPayload
): Promise<Record<string, { success: boolean; error?: string }>> {
  const db = getDb()
  const results: Record<string, { success: boolean; error?: string }> = {}

  const { data: prefsRow } = await db
    .from('notification_preferences')
    .select('*')
    .eq('user_id', notification.userId)
    .maybeSingle()

  const prefs = prefsRow as Record<string, unknown> | null
  const emailEnabled = prefs ? Boolean(prefs.email_enabled ?? true) : true
  const pushEnabled = prefs ? Boolean(prefs.push_enabled ?? true) : true
  const smsEnabledGlobal = prefs ? Boolean(prefs.sms_enabled ?? false) : false
  const quietEnabled = prefs ? Boolean(prefs.quiet_hours_enabled ?? false) : false
  const qStart = prefs?.quiet_hours_start as string | undefined
  const qEnd = prefs?.quiet_hours_end as string | undefined
  const perType = getPerTypeChannels(
    prefs?.preferences as Record<string, unknown> | undefined,
    notification.type
  )

  const isNormal = notification.priority === 'normal' || !notification.priority
  let inQuietHours = false
  if (quietEnabled && isNormal && qStart && qEnd) {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const cur = `${hh}:${mm}:${ss}`
    if (qStart > qEnd) inQuietHours = cur >= qStart || cur <= qEnd
    else inQuietHours = cur >= qStart && cur <= qEnd
  }

  const contact = await getUserContactForDelivery(notification.userId)
  const metaStrings =
    notification.metadata && typeof notification.metadata === 'object'
      ? Object.fromEntries(
          Object.entries(notification.metadata).map(([k, v]) => [k, v == null ? '' : String(v)])
        )
      : undefined

  if (inQuietHours && isNormal) return results

  if (emailEnabled && perType.email && contact.email) {
    results.email = await sendEmailNotification({
      to: contact.email,
      subject: notification.title,
      body: `<h2>${notification.title}</h2><p>${notification.content}</p>`,
    })
  }

  if (pushEnabled && perType.push && contact.pushToken) {
    results.push = await sendPushNotification({
      pushToken: contact.pushToken,
      title: notification.title,
      body: notification.content,
      data: metaStrings,
    })
  }

  const smsForPriority =
    notification.priority === 'urgent' || notification.priority === 'high' || perType.sms

  if (smsEnabledGlobal && smsForPriority && perType.sms && contact.phone) {
    results.sms = await sendSMSNotification({
      to: contact.phone,
      body: `${notification.title}: ${notification.content}`,
    })
  }

  if (Object.keys(results).length > 0) {
    const deliveredAt = new Date().toISOString()
    try {
      await db.from('notification_delivery_log').insert({
        notification_id: notification.id,
        user_id: notification.userId,
        delivered_at: deliveredAt,
        channels: results as unknown as Record<string, unknown>,
        status: 'delivered',
      })
    } catch (e) {
      console.warn('[notification-delivery] delivery_log insert skipped:', e)
    }
  }

  return results
}
