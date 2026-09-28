import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { deliverNotificationOutbound } from '@/lib/services/notification-delivery'
import { isUniqueViolation, safeCompare } from '@/lib/integrations/webhook-security'

const RECEIPT_PROVIDER = 'supabase_notifications'

/**
 * Bounded reclaim window. A `processing` claim older than this is treated as an
 * interrupted attempt (crash/deploy between claim and completion) and may be
 * taken over by exactly one request through a conditional update.
 */
const STALE_PROCESSING_SECONDS = 300

type ClaimOutcome = 'claimed' | 'resumed' | 'duplicate' | 'error'

/**
 * Supabase Database Webhook target: subscribe to INSERT on public.notifications.
 * Headers: Authorization: Bearer ${NOTIFICATION_INSERT_WEBHOOK_SECRET}
 * See docs/NOTIFICATION_SERVICES_SETUP.md for setup.
 *
 * Security properties:
 * - The shared bearer secret is compared in constant time and a missing secret
 *   or token fails closed before any read or delivery.
 * - Supabase Database Webhooks do not sign a timestamp, so the durable
 *   `webhook_delivery_receipts` claim (unique on provider + notification id) is
 *   the replay defense: a duplicate delivery is acknowledged with no additional
 *   side effects, and only one request can ever own a delivery.
 * - The claim is atomic insert-before-side-effect; any non-duplicate persistence
 *   failure returns 500 so Supabase retries instead of double-sending.
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
  if (!token || !safeCompare(token, secret))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const record = (body?.record ?? body?.payload) as Record<string, unknown> | undefined
  if (!record || typeof record !== 'object' || Array.isArray(record))
    return NextResponse.json({ error: 'Invalid payload: expected record with id and user_id' }, { status: 400 })

  const notificationId = normalizeId(record.id)
  const userId = normalizeId(record.user_id)
  if (!notificationId || !userId)
    return NextResponse.json({ error: 'Invalid payload: expected record with id and user_id' }, { status: 400 })

  const supabase = createServiceRoleClient()

  // Deliveries recorded before the receipt ledger existed are still suppressed.
  const { data: priorDelivery, error: deliveryLookupError } = await supabase
    .from('notification_delivery_log')
    .select('id')
    .eq('notification_id', notificationId)
    .eq('status', 'delivered')
    .maybeSingle()
  if (deliveryLookupError) {
    console.error('[webhook notifications] delivery lookup failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery lookup failed' }, { status: 500 })
  }
  if (priorDelivery)
    return NextResponse.json({ ok: true, duplicate: true })

  const claim = await claimDelivery(supabase, notificationId)
  if (claim === 'duplicate')
    return NextResponse.json({ ok: true, duplicate: true })
  if (claim === 'error') {
    console.error('[webhook notifications] delivery claim failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery claim failed' }, { status: 500 })
  }

  try {
    await deliverNotificationOutbound({
      id: notificationId,
      userId,
      type: normalizeId(record.type) || 'general',
      title: normalizeId(record.title) || 'Notification',
      content: normalizeId(record.content ?? record.message) ?? '',
      priority: (record.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
      metadata: (record.metadata as Record<string, unknown>) || undefined,
    })
  } catch {
    await releaseClaim(supabase, notificationId)
    console.error('[webhook notifications] deliver failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery failed' }, { status: 500 })
  }

  const { error: completionError } = await supabase
    .from('webhook_delivery_receipts')
    .update({ status: 'delivered', processed_at: new Date().toISOString() })
    .eq('provider', RECEIPT_PROVIDER)
    .eq('delivery_id', notificationId)
  if (completionError) {
    console.error('[webhook notifications] delivery completion failed', { kind: 'internal_error' })
    return NextResponse.json({ error: 'Delivery completion failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * Atomic claim-before-side-effect.
 *
 * - Fresh insert wins the delivery outright.
 * - A unique violation means the delivery is already claimed. `delivered` is a
 *   duplicate; a `failed` claim or an interrupted `processing` claim older than
 *   the bounded window is reclaimed through a conditional update that only one
 *   concurrent request can win; anything else is an in-flight duplicate.
 */
async function claimDelivery(supabase: any, notificationId: string): Promise<ClaimOutcome> {
  const { error } = await supabase.from('webhook_delivery_receipts').insert({
    provider: RECEIPT_PROVIDER,
    delivery_id: notificationId,
    status: 'processing',
    attempts: 1,
  })

  if (!error) return 'claimed'
  if (!isUniqueViolation(error)) return 'error'

  const { data: existing, error: readError } = await supabase
    .from('webhook_delivery_receipts')
    .select('status, attempts, received_at')
    .eq('provider', RECEIPT_PROVIDER)
    .eq('delivery_id', notificationId)
    .maybeSingle()
  if (readError || !existing) return 'error'
  if (existing.status === 'delivered') return 'duplicate'

  const cutoff = new Date(Date.now() - STALE_PROCESSING_SECONDS * 1000).toISOString()
  const reclaim =
    existing.status === 'failed' || (existing.status === 'processing' && isBefore(existing.received_at, cutoff))
  if (!reclaim) return 'duplicate'

  let takeover = supabase
    .from('webhook_delivery_receipts')
    .update({
      status: 'processing',
      attempts: Number(existing.attempts ?? 1) + 1,
      received_at: new Date().toISOString(),
    })
    .eq('provider', RECEIPT_PROVIDER)
    .eq('delivery_id', notificationId)
    .eq('status', existing.status)
  if (existing.status === 'processing') takeover = takeover.lte('received_at', cutoff)

  const { data: reclaimed, error: takeoverError } = await takeover.select('delivery_id').maybeSingle()
  if (takeoverError) return 'error'
  return reclaimed?.delivery_id ? 'resumed' : 'duplicate'
}

/** Failed attempts release the claim so a provider retry can re-deliver. */
async function releaseClaim(supabase: any, notificationId: string) {
  const { error } = await supabase
    .from('webhook_delivery_receipts')
    .update({ status: 'failed' })
    .eq('provider', RECEIPT_PROVIDER)
    .eq('delivery_id', notificationId)
    .eq('status', 'processing')
  if (error) console.error('[webhook notifications] claim release failed', { kind: 'internal_error' })
}

function isBefore(value: unknown, cutoffIso: string) {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return false
  return parsed < Date.parse(cutoffIso)
}

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}
