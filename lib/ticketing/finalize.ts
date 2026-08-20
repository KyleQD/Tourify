import { finalizeInventory, releaseInventory } from '@/lib/ticketing/inventory'
import { issueTicketsForOrder } from '@/lib/ticketing/issuance'
import { writeSaleLedger, writeRefundLedger } from '@/lib/ticketing/ledger'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { notifyOrderConfirmed, notifyTicketRefunded } from '@/lib/ticketing/notifications'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'
import { finalizePromoterCommission } from '@/lib/promoter-network/commission-finalization'

/**
 * Idempotent webhook finalization for paid ticket orders.
 */

type AwaitablePostgrestResult = PromiseLike<{ data: any; error: any }>

export interface FinalizeClient {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => AwaitablePostgrestResult
}

export async function claimWebhookEvent(params: {
  supabase: FinalizeClient
  stripeEventId: string
  eventType: string
  orderId?: string | null
  summary?: Record<string, unknown>
}): Promise<boolean> {
  if (!isTicketingV2Enabled()) return true

  const { error } = await params.supabase.from('ticket_stripe_webhook_events').insert({
    id: params.stripeEventId,
    event_type: params.eventType,
    order_id: params.orderId ?? null,
    payload_summary: params.summary ?? {},
  })

  // Duplicate event
  if (error) {
    if (String(error.code) === '23505' || String(error.message || '').includes('duplicate'))
      return false
    console.warn('[ticketing.webhook] claim failed', error)
  }
  return true
}

export async function finalizePaidOrder(params: {
  supabase: FinalizeClient
  orderId: string
  stripeEventId: string
  paymentIntentId?: string | null
  checkoutSessionId?: string | null
}): Promise<{ alreadyFinalized: boolean }> {
  const { supabase, orderId } = params

  const { data: order, error } = await supabase
    .from('ticket_sales')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order)
    throw new Error(error?.message || 'Order not found')

  if (order.payment_status === 'completed' && order.issuance_status === 'issued') {
    // The Stripe receipt may already be claimed when a prior non-ticketing
    // finalization attempt failed. Re-run the idempotent financial command so
    // a duplicate provider delivery can heal that gap without reissuing tickets.
    await finalizePromoterCommission({
      orderId,
      paymentReference: params.paymentIntentId || order.payment_reference,
    })
    return { alreadyFinalized: true }
  }

  const updatePayload: Record<string, unknown> = {
    payment_status: 'completed',
    payment_reference: params.paymentIntentId || order.payment_reference,
    stripe_payment_intent_id: params.paymentIntentId || order.stripe_payment_intent_id,
    stripe_checkout_session_id: params.checkoutSessionId || order.stripe_checkout_session_id,
    webhook_event_id: params.stripeEventId,
    finalized_at: order.finalized_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from('ticket_sales')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('payment_status', 'pending')

  // If not pending, another worker may have won — still ensure issuance
  if (updateError)
    console.warn('[ticketing.finalize] status update', updateError)

  if (isTicketingV2Enabled() && order.reservation_id) {
    try {
      await finalizeInventory({ supabase, reservationId: order.reservation_id })
    } catch (err) {
      console.warn('[ticketing.finalize] inventory finalize', err)
      // Fallback to classic increment if reservation already consumed/missing
      await supabase.rpc('increment_ticket_quantity_sold', {
        p_ticket_type_id: order.ticket_type_id,
        p_quantity: order.quantity,
      })
    }
  } else {
    await supabase.rpc('increment_ticket_quantity_sold', {
      p_ticket_type_id: order.ticket_type_id,
      p_quantity: order.quantity,
    })
  }

  if (isTicketingV2Enabled()) {
    await issueTicketsForOrder({
      supabase,
      orderId: order.id,
      eventId: order.event_id,
      ticketTypeId: order.ticket_type_id,
      quantity: order.quantity,
      unitPrice: Number(order.unit_price || 0),
      ownerUserId: order.buyer_user_id,
      ownerEmail: order.buyer_email,
      ownerName: order.buyer_name,
      actorUserId: order.buyer_user_id,
    })

    // Increment promo usage only after successful payment
    if (order.promo_code_id) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('id, code')
        .eq('id', order.promo_code_id)
        .eq('event_id', order.event_id)
        .maybeSingle()
      if (promo) {
        const { data: usage, error: usageError } = await supabase.rpc(
          'increment_promo_code_usage',
          { p_promo_id: promo.id, p_event_id: order.event_id },
        )
        if (!usageError && usage !== null) {
          await emitTicketAnalyticsEvent({
            supabase,
            eventName: 'promo_code_used',
            eventId: order.event_id,
            orderId: order.id,
            metadata: { code: promo.code },
          })
        }
      }
    }

    const referralId = (order.metadata as any)?.referral_id
    if (referralId) {
      await supabase
        .from('ticket_referrals')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', referralId)
        .eq('event_id', order.event_id)
        .eq('is_used', false)
    }

    const { data: eventRow } = await supabase
      .from('events_v2')
      .select('org_id, title')
      .eq('id', order.event_id)
      .maybeSingle()

    if (eventRow?.org_id) {
      await writeSaleLedger({
        supabase,
        orgId: eventRow.org_id,
        eventId: order.event_id,
        orderId: order.id,
        createdBy: order.buyer_user_id || eventRow.org_id,
        paymentReference: params.paymentIntentId || order.payment_reference,
        grossAmount: Number(order.total_amount || 0) - Number(order.platform_fee_amount || 0) - Number(order.processing_fee_amount || 0) - Number(order.tax_amount || 0),
        platformFeeAmount: Number(order.platform_fee_amount || 0),
        processingFeeAmount: Number(order.processing_fee_amount || 0),
        taxAmount: Number(order.tax_amount || 0),
        description: `Ticket sale for ${eventRow.title || order.event_id}`,
      })
    }

    await emitTicketAnalyticsEvent({
      supabase,
      eventName: 'checkout_completed',
      eventId: order.event_id,
      ticketTypeId: order.ticket_type_id,
      orderId: order.id,
      actorUserId: order.buyer_user_id,
      amounts: {
        gross: order.total_amount,
        platform_fee: order.platform_fee_amount,
        processing_fee: order.processing_fee_amount,
        tax: order.tax_amount,
        net: order.net_amount,
        quantity: order.quantity,
      },
    })

    await emitTicketAnalyticsEvent({
      supabase,
      eventName: 'ticket_purchased',
      eventId: order.event_id,
      ticketTypeId: order.ticket_type_id,
      orderId: order.id,
      actorUserId: order.buyer_user_id,
      amounts: { quantity: order.quantity, total: order.total_amount },
    })

    await emitTicketAnalyticsEvent({
      supabase,
      eventName: 'ticket_issued',
      eventId: order.event_id,
      ticketTypeId: order.ticket_type_id,
      orderId: order.id,
      actorUserId: order.buyer_user_id,
      amounts: { quantity: order.quantity },
    })

    if (order.buyer_user_id) {
      await notifyOrderConfirmed({
        userId: order.buyer_user_id,
        orderId: order.id,
        eventTitle: eventRow?.title,
      })
    }
  }

  // Financial finalization is after the authoritative ticket issuance path.
  // A failure here intentionally causes the verified webhook to retry, while
  // ticket issuance remains safely idempotent on the retry.
  await finalizePromoterCommission({
    orderId: order.id,
    paymentReference: params.paymentIntentId || order.payment_reference,
  })

  return { alreadyFinalized: false }
}

export async function markOrderFailedAndRelease(params: {
  supabase: FinalizeClient
  orderId: string
}): Promise<void> {
  const { data: order } = await params.supabase
    .from('ticket_sales')
    .select('id, reservation_id, payment_status')
    .eq('id', params.orderId)
    .maybeSingle()

  if (!order || order.payment_status === 'completed') return

  await params.supabase
    .from('ticket_sales')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)

  if (order.reservation_id && isTicketingV2Enabled()) {
    try {
      await releaseInventory({
        supabase: params.supabase,
        reservationId: order.reservation_id,
      })
    } catch (error) {
      console.warn('[ticketing] release on fail', error)
    }
  }

  await emitTicketAnalyticsEvent({
    supabase: params.supabase,
    eventName: 'checkout_abandoned',
    orderId: params.orderId,
  })
}

export async function refundOrderTickets(params: {
  supabase: FinalizeClient
  orderId: string
  actorUserId: string
  refundAmount: number
  ticketIds?: string[]
}): Promise<void> {
  const { data, error } = await params.supabase.rpc('apply_ticket_refund', {
    p_order_id: params.orderId,
    p_actor_user_id: params.actorUserId,
    p_refund_amount: params.refundAmount,
    p_ticket_ids: params.ticketIds?.length ? params.ticketIds : null,
  })
  if (error) throw new Error(error.message || 'Failed to apply ticket refund')

  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Refund did not update an order')

  if (result.org_id) {
    await writeRefundLedger({
      supabase: params.supabase,
      orgId: result.org_id,
      eventId: result.event_id,
      orderId: params.orderId,
      ticketId: params.ticketIds?.[0] ?? null,
      createdBy: params.actorUserId,
      refundAmount: params.refundAmount,
      paymentReference: result.payment_reference,
    })
  }

  await emitTicketAnalyticsEvent({
    supabase: params.supabase,
    eventName: 'ticket_refunded',
    eventId: result.event_id,
    orderId: params.orderId,
    actorUserId: params.actorUserId,
    amounts: { refund: params.refundAmount, quantity: result.restored_quantity },
  })

  if (result.buyer_user_id) {
    await notifyTicketRefunded({
      userId: result.buyer_user_id,
      orderId: params.orderId,
    })
  }
}
