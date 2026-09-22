import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { deliverNotificationOutbound } from '@/lib/services/notification-delivery'

/**
 * Supabase Database Webhook target: subscribe to INSERT on public.notifications.
 * Headers: Authorization: Bearer ${NOTIFICATION_INSERT_WEBHOOK_SECRET}
 * See docs/NOTIFICATION_SERVICES_SETUP.md for setup.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_INSERT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      {
        error: 'Notification webhook is unavailable: NOTIFICATION_INSERT_WEBHOOK_SECRET is not configured',
        featureUnavailable: true,
      },
      { status: 503 },
    )
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : request.headers.get('x-notification-webhook-secret')
  if (!token || !secureEqual(token, secret))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const record = (body?.record ?? body?.payload) as Record<string, unknown> | undefined
  if (!record?.id || !record?.user_id)
    return NextResponse.json({ error: 'Invalid payload: expected record with id and user_id' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: priorDelivery, error: deliveryLookupError } = await supabase
    .from('notification_delivery_log')
    .select('id')
    .eq('notification_id', String(record.id))
    .eq('status', 'delivered')
    .maybeSingle()
  if (deliveryLookupError) {
    console.error('[webhook notifications] delivery lookup failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery lookup failed' }, { status: 500 })
  }
  if (priorDelivery)
    return NextResponse.json({ ok: true, duplicate: true })

  try {
    await deliverNotificationOutbound({
      id: String(record.id),
      userId: String(record.user_id),
      type: String(record.type || 'general'),
      title: String(record.title || 'Notification'),
      content: String(record.content ?? record.message ?? ''),
      priority: (record.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
      metadata: (record.metadata as Record<string, unknown>) || undefined,
    })
  } catch {
    console.error('[webhook notifications] deliver failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function secureEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}
