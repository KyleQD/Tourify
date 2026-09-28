import { requireFinalizedInventory, releaseInventory } from '@/lib/ticketing/inventory'
import { issueTicketsForOrder } from '@/lib/ticketing/issuance'
import { writeSaleLedger, writeRefundLedger } from '@/lib/ticketing/ledger'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { notifyOrderConfirmed, notifyTicketRefunded } from '@/lib/ticketing/notifications'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'

/**
 * Idempotent webhook finalization for paid ticket orders.
 */

type AwaitablePostgrestResult = PromiseLike<{ data: any; error: any }>

export interface FinalizeClient {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => AwaitablePostgrestResult
}

/**
 * TICKET-005 / HF-INTG-006-TICKETING — the outcome of claiming a Stripe event.
 *
 * `duplicate` deliberately carries NO "already handled" meaning. Before the
 * claim/complete split, a 23505 was collapsed into a boolean `false` and the
 * route answered `{received: true, duplicate: true}`, which reported success for
 * work that may never have happened. The caller must now read the completion
 * marker (readWebhookEventCompletion) to learn whether the prior claim actually
 * finished.
 */
export type WebhookEventClaim =
  | { kind: 'claimed' }
  | { kind: 'duplicate' }

/**
 * Claims a verified Stripe event in `ticket_stripe_webhook_events` BEFORE any
 * processing, and returns `duplicate` on a 23505 unique violation.
 *
 * The insert writes NO completion stamp. `processed_at` is the claim timestamp
 * (column default) and `completed_at` is written only by completeWebhookEvent
 * after every handler write has succeeded, so an interrupted claim stays
 * observable as incomplete instead of being indistinguishable from a finished
 * one. See migration 20260926130000_ticketing_webhook_completion_marker.sql.
 *
 * Every non-duplicate error throws: an unavailable or unprovisioned ledger must
 * surface as a 500 so Stripe retries, never as a silent acknowledgement.
 */
export async function claimWebhookEvent(params: {
  supabase: FinalizeClient
  stripeEventId: string
  eventType: string
  orderId?: string | null
  summary?: Record<string, unknown>
}): Promise<WebhookEventClaim> {
  const { error } = await params.supabase.from('ticket_stripe_webhook_events').insert({
    id: params.stripeEventId,
    event_type: params.eventType,
    order_id: params.orderId ?? null,
    payload_summary: params.summary ?? {},
  })

  // Duplicate event: the row exists, so a prior delivery claimed it. Whether it
  // finished is a separate question answered by readWebhookEventCompletion.
  if (error) {
    if (String(error.code) === '23505' || /duplicate key/i.test(String(error.message || '')))
      return { kind: 'duplicate' }
    throw new Error(`Ticketing webhook claim failed: ${error.message || 'event persistence error'}`)
  }
  return { kind: 'claimed' }
}

/**
 * Reads the completion marker of an already-claimed event.
 *
 * FAILS CLOSED. A missing row, an unreadable row, or a row whose completion
 * column cannot be read throws instead of returning a default: the caller must
 * never conclude "already handled" from a read it could not perform, because
 * that is exactly how a paid order stays unfinalized while the route reports
 * success.
 */
export async function readWebhookEventCompletion(params: {
  supabase: FinalizeClient
  stripeEventId: string
}): Promise<{ completed: boolean; attempts: number }> {
  const { data, error } = await params.supabase
    .from('ticket_stripe_webhook_events')
    .select('completed_at, attempts')
    .eq('id', params.stripeEventId)
    .maybeSingle()

  if (error)
    throw new Error(`Ticketing webhook completion read failed: ${error.message || 'event ledger read error'}`)
  if (!data)
    throw new Error('Ticketing webhook completion read failed: claimed event not found')

  return {
    completed: Boolean(data.completed_at),
    attempts: Number.isFinite(Number(data.attempts)) ? Number(data.attempts) : 1,
  }
}

/**
 * Marks a claimed event COMPLETE. Called only after every handler write in the
 * route has returned successfully.
 *
 * Returns the PostgREST error rather than throwing so the route can answer 500
 * and let Stripe retry: a completion write that is not persisted must leave the
 * claim incomplete, otherwise a failed resume becomes a false acknowledgement.
 * Re-applying a completion is safe — the write is `completed_at` plus an
 * attempts increment, both idempotent in effect.
 */
export async function completeWebhookEvent(params: {
  supabase: FinalizeClient
  stripeEventId: string
  priorAttempts?: number | null
}): Promise<{ code?: string; message?: string } | null> {
  const { error } = await params.supabase
    .from('ticket_stripe_webhook_events')
    .update({
      completed_at: new Date().toISOString(),
      attempts: (params.priorAttempts ?? 0) + 1,
    })
    .eq('id', params.stripeEventId)

  return error ?? null
}

/**
 * Has the revenue receipt for this order actually been recorded?
 *
 * An unreadable read is reported as ABSENT, never as recorded. The write it
 * guards is idempotent (the partial unique index on
 * financial_transactions.idempotency_key absorbs a repeat), so re-posting is
 * safe while skipping it loses money, and the asymmetry has to point at
 * writing.
 */
async function hasSaleLedgerReceipt(params: {
  supabase: FinalizeClient
  orderId: string
}): Promise<boolean> {
  const { data, error } = await params.supabase
    .from('financial_transactions')
    .select('id')
    .eq('ticket_order_id', params.orderId)
    .eq('idempotency_key', `ticket_sale:${params.orderId}:revenue`)
    .maybeSingle()

  if (error) return false
  return Boolean(data)
}

export async function finalizePaidOrder(params: {
  supabase: FinalizeClient
  orderId: string
  stripeEventId: string
  paymentIntentId?: string | null
  checkoutSessionId?: string | null
}): Promise<{ alreadyFinalized: boolean; skipped?: 'terminal_state' }> {
  const { supabase, orderId } = params

  const { data: order, error } = await supabase
    .from('ticket_sales')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order)
    throw new Error(error?.message || 'Order not found')

  if (order.payment_status === 'completed' && order.issuance_status === 'issued') {
    // The status flags alone are not proof of finalization. A delivery that died
    // after issuance but BEFORE the ledger write leaves an order that looks
    // finalized and has no revenue receipt at all, so treating the flags as
    // final would discard the money permanently. The receipt is verified instead,
    // and an order missing it falls through to the repair path below, where every
    // write is idempotent.
    if (await hasSaleLedgerReceipt({ supabase, orderId: order.id }))
      return { alreadyFinalized: true }
  }

  // Refund replay safety: an order that reached a money-terminal refund state
  // (full refund, cancelled, or any partial refund recorded in metadata.refund)
  // must acknowledge a delivered/replayed paid event WITHOUT re-running
  // issuance, promo accounting, analytics, ledger, or notification side
  // effects. Late-arriving checkout.session.completed webhooks after a
  // charge.refunded are the canonical case.
  const refundRecorded = Boolean((order.metadata as Record<string, unknown> | null | undefined)?.refund)
  if (
    order.payment_status === 'refunded' ||
    order.payment_status === 'cancelled' ||
    refundRecorded
  )
    return { alreadyFinalized: true, skipped: 'terminal_state' }

  const updatePayload: Record<string, unknown> = {
    payment_status: 'completed',
    payment_reference: params.paymentIntentId || order.payment_reference,
    stripe_payment_intent_id: params.paymentIntentId || order.stripe_payment_intent_id,
    stripe_checkout_session_id: params.checkoutSessionId || order.stripe_checkout_session_id,
    webhook_event_id: params.stripeEventId,
    updated_at: new Date().toISOString(),
  }

  // The pending -> completed transition is this delivery's OWNERSHIP signal, and
  // returning the updated row is what makes it observable. An empty result means
  // a prior delivery already moved this order off 'pending', so this delivery is
  // a RESUME of interrupted work, not the transition. Resumes still repair
  // issuance and the ledger below (both idempotent), but they must not re-run
  // the side effects that belong to the transition itself — an unguarded counter
  // is the money-path hazard a resume would otherwise introduce, because every
  // Stripe retry would increment it again.
  const { data: transitioned, error: updateError } = await supabase
    .from('ticket_sales')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('payment_status', 'pending')
    .select('id')

  // If not pending, another worker may have won — still ensure issuance
  if (updateError)
    console.warn('[ticketing.finalize] status update', updateError)

  const isTransition = Array.isArray(transitioned) && transitioned.length > 0

  if (isTicketingV2Enabled() && order.reservation_id) {
    await requireFinalizedInventory({ supabase, reservationId: order.reservation_id })
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

    // Increment promo usage only after successful payment, and only on the
    // delivery that actually performed the pending -> completed transition.
    // increment_promo_code_usage is an unconditional counter with no per-order
    // key, so a resume would otherwise redeem the same promo once per Stripe
    // retry. The bounded failure mode of skipping is one missed increment for
    // an order whose transition happened in an earlier attempt; the unbounded
    // alternative is revenue lost on every retry.
    if (order.promo_code_id && isTransition) {
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
}): Promise<{ duplicate: boolean }> {
  const { data, error } = await params.supabase.rpc('apply_ticket_refund', {
    p_order_id: params.orderId,
    p_actor_user_id: params.actorUserId,
    p_refund_amount: params.refundAmount,
    p_ticket_ids: params.ticketIds?.length ? params.ticketIds : null,
  })

  // Canonical refund replay: apply_ticket_refund raises
  // "Order has already been refunded" once metadata.refund exists. A replay
  // of an already-applied refund is a duplicate acknowledgement with NO side
  // effects — no re-restored inventory, no second ledger receipt, no
  // analytics, no notification.
  if (error) {
    if (String(error.message || '').includes('already been refunded'))
      return { duplicate: true }
    throw new Error(error.message || 'Failed to apply ticket refund')
  }

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

  return { duplicate: false }
}
