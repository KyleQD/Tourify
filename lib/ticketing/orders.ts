import { calculateTicketFees, generateOrderNumber, type TicketingFeeConfig } from '@/lib/ticketing/fees'
import { reserveInventory, releaseInventory } from '@/lib/ticketing/inventory'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'

/**
 * Order (ticket_sales) lifecycle helpers for v2 ticketing.
 */

export interface OrderClient {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>
}

export async function getEventTicketingConfig(params: {
  supabase: OrderClient
  eventId: string
}): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await params.supabase
      .from('event_ticketing_config')
      .select('*')
      .eq('event_id', params.eventId)
      .maybeSingle()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export function feeConfigFromRow(row: Record<string, any> | null | undefined): TicketingFeeConfig {
  if (!row) {
    return {
      platformFeeType: 'flat_per_ticket',
      platformFeeAmount: 1,
      processingFeePassthrough: true,
      taxEnabled: false,
      taxRate: 0,
    }
  }
  return {
    platformFeeType: row.platform_fee_type,
    platformFeeAmount: Number(row.platform_fee_amount ?? 1),
    processingFeePassthrough: row.processing_fee_passthrough !== false,
    taxEnabled: Boolean(row.tax_enabled),
    taxRate: Number(row.tax_rate ?? 0),
  }
}

export interface IdempotentPurchaseResult {
  id: string
  order_number: string | null
  payment_status: string
  total_amount: number
  stripe_checkout_session_id: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Request-scoped purchase idempotency lookup. A client-supplied idempotency
 * key (header or metadata) dedupes retries/double-clicks to the original
 * order for the SAME buyer and event while the order is still actionable
 * (pending/completed/paid). Newest-order-wins keeps an earlier race winner
 * stable once one row carries the key.
 *
 * This is the local request-scoped contract. The schema's active chain holds
 * no distributed DB-unique purchase idempotency key (ticket_sales has no
 * idempotency column or unique expression index), so two concurrent first
 * requests can both create rows; the DB-unique constraint is a DB-005
 * migration concern (see TICKET-005 handoff).
 */
export async function findIdempotentPurchase(params: {
  supabase: OrderClient
  buyerUserId: string
  eventId: string
  idempotencyKey: string
}): Promise<IdempotentPurchaseResult | null> {
  const { data } = await params.supabase
    .from('ticket_sales')
    .select('id, order_number, payment_status, total_amount, stripe_checkout_session_id, metadata')
    .contains('metadata', { idempotency_key: params.idempotencyKey })
    .eq('buyer_user_id', params.buyerUserId)
    .eq('event_id', params.eventId)
    .in('payment_status', ['pending', 'completed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export async function createPendingOrder(params: {
  supabase: OrderClient
  ticketTypeId: string
  eventId: string
  quantity: number
  unitPrice: number
  buyerUserId?: string | null
  buyerName: string
  buyerEmail: string
  promoCodeId?: string | null
  discountAmount?: number
  metadata?: Record<string, unknown>
  ttlSeconds?: number
}): Promise<{
  orderId: string
  reservationId: string | null
  orderNumber: string
  fees: ReturnType<typeof calculateTicketFees>
  v2: boolean
}> {
  const v2 = isTicketingV2Enabled()
  const config = await getEventTicketingConfig({
    supabase: params.supabase,
    eventId: params.eventId,
  })
  const fees = v2
    ? calculateTicketFees({
        unitPrice: params.unitPrice,
        quantity: params.quantity,
        discountAmount: params.discountAmount ?? 0,
        config: feeConfigFromRow(config),
      })
    : (() => {
        const subtotal = Math.max(0, params.unitPrice * params.quantity - (params.discountAmount ?? 0))
        const processingFeeAmount = Math.round(subtotal * 0.03 * 100) / 100
        return {
          subtotal: params.unitPrice * params.quantity,
          discountAmount: params.discountAmount ?? 0,
          taxableAmount: subtotal,
          taxAmount: 0,
          platformFeeAmount: 0,
          processingFeeAmount,
          grossAmount: subtotal,
          netAmount: subtotal,
          buyerTotal: Math.round((subtotal + processingFeeAmount) * 100) / 100,
        }
      })()

  const orderNumber = generateOrderNumber()

  let reservationId: string | null = null
  if (v2) {
    const reserved = await reserveInventory({
      supabase: params.supabase,
      ticketTypeId: params.ticketTypeId,
      quantity: params.quantity,
      createdBy: params.buyerUserId ?? null,
      ttlSeconds: params.ttlSeconds ?? 900,
    })
    reservationId = reserved.reservationId
  }

  const insertPayload: Record<string, unknown> = {
    ticket_type_id: params.ticketTypeId,
    event_id: params.eventId,
    buyer_user_id: params.buyerUserId ?? null,
    buyer_name: params.buyerName,
    buyer_email: params.buyerEmail,
    quantity: params.quantity,
    unit_price: params.unitPrice,
    total_amount: fees.buyerTotal,
    discount_amount: fees.discountAmount,
    promo_code_id: params.promoCodeId ?? null,
    payment_status: 'pending',
    payment_method: 'stripe',
    metadata: {
      ...(params.metadata || {}),
      order_number: orderNumber,
      fee_breakdown: fees,
      ticketing_v2: v2,
    },
  }

  if (v2) {
    insertPayload.order_number = orderNumber
    insertPayload.platform_fee_amount = fees.platformFeeAmount
    insertPayload.processing_fee_amount = fees.processingFeeAmount
    insertPayload.tax_amount = fees.taxAmount
    insertPayload.net_amount = fees.netAmount
    insertPayload.reservation_id = reservationId
    insertPayload.issuance_status = 'pending'
  }

  const { data: order, error } = await params.supabase
    .from('ticket_sales')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !order) {
    if (reservationId) {
      try {
        await releaseInventory({ supabase: params.supabase, reservationId })
      } catch {
        // best-effort release
      }
    }
    throw new Error(error?.message || 'Failed to create order')
  }

  if (reservationId) {
    await params.supabase
      .from('ticket_inventory_reservations')
      .update({ order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', reservationId)
  }

  return {
    orderId: order.id,
    reservationId,
    orderNumber,
    fees,
    v2,
  }
}
