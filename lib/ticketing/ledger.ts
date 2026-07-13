/**
 * Immutable financial ledger writes for ticket orders.
 */

export interface LedgerClient {
  from: (table: string) => any
}

export interface WriteSaleLedgerParams {
  supabase: LedgerClient
  orgId: string
  eventId: string
  orderId: string
  createdBy: string
  paymentReference?: string | null
  grossAmount: number
  platformFeeAmount: number
  processingFeeAmount: number
  taxAmount?: number
  description?: string
}

export async function writeSaleLedger(params: WriteSaleLedgerParams): Promise<void> {
  const {
    supabase,
    orgId,
    eventId,
    orderId,
    createdBy,
    paymentReference,
    grossAmount,
    platformFeeAmount,
    processingFeeAmount,
    taxAmount = 0,
    description,
  } = params

  const rows = [
    {
      org_id: orgId,
      event_id: eventId,
      type: 'income',
      category: 'ticket_revenue',
      amount: Math.max(0, grossAmount),
      description: description || `Ticket order ${orderId}`,
      payment_status: 'paid',
      payment_method: 'stripe',
      payment_reference: paymentReference ?? null,
      paid_at: new Date().toISOString(),
      created_by: createdBy,
      ticket_order_id: orderId,
      idempotency_key: `ticket_sale:${orderId}:revenue`,
    },
  ] as Record<string, unknown>[]

  if (platformFeeAmount > 0) {
    rows.push({
      org_id: orgId,
      event_id: eventId,
      type: 'expense',
      category: 'platform_fee',
      amount: platformFeeAmount,
      description: `Platform fee for order ${orderId}`,
      payment_status: 'paid',
      payment_method: 'stripe',
      payment_reference: paymentReference ?? null,
      paid_at: new Date().toISOString(),
      created_by: createdBy,
      ticket_order_id: orderId,
      idempotency_key: `ticket_sale:${orderId}:platform_fee`,
    })
  }

  if (processingFeeAmount > 0) {
    rows.push({
      org_id: orgId,
      event_id: eventId,
      type: 'expense',
      category: 'processing_fee',
      amount: processingFeeAmount,
      description: `Processing fee for order ${orderId}`,
      payment_status: 'paid',
      payment_method: 'stripe',
      payment_reference: paymentReference ?? null,
      paid_at: new Date().toISOString(),
      created_by: createdBy,
      ticket_order_id: orderId,
      idempotency_key: `ticket_sale:${orderId}:processing_fee`,
    })
  }

  if (taxAmount > 0) {
    rows.push({
      org_id: orgId,
      event_id: eventId,
      type: 'expense',
      category: 'tax',
      amount: taxAmount,
      description: `Tax for order ${orderId}`,
      payment_status: 'paid',
      payment_method: 'stripe',
      payment_reference: paymentReference ?? null,
      paid_at: new Date().toISOString(),
      created_by: createdBy,
      ticket_order_id: orderId,
      idempotency_key: `ticket_sale:${orderId}:tax`,
    })
  }

  const { error } = await supabase.from('financial_transactions').upsert(rows, {
    onConflict: 'idempotency_key',
    ignoreDuplicates: true,
  })

  // Fallback if upsert on partial unique index is unsupported
  if (error) {
    for (const row of rows) {
      const { data: existing } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('idempotency_key', row.idempotency_key)
        .maybeSingle()
      if (existing?.id) continue
      await supabase.from('financial_transactions').insert(row)
    }
  }
}

export async function writeRefundLedger(params: {
  supabase: LedgerClient
  orgId: string
  eventId: string
  orderId: string
  ticketId?: string | null
  createdBy: string
  refundAmount: number
  paymentReference?: string | null
  description?: string
}): Promise<void> {
  const key = params.ticketId
    ? `ticket_refund:${params.orderId}:${params.ticketId}`
    : `ticket_refund:${params.orderId}:full`

  const { data: existing } = await params.supabase
    .from('financial_transactions')
    .select('id')
    .eq('idempotency_key', key)
    .maybeSingle()

  if (existing?.id) return

  await params.supabase.from('financial_transactions').insert({
    org_id: params.orgId,
    event_id: params.eventId,
    type: 'expense',
    category: 'refund',
    amount: Math.max(0, params.refundAmount),
    description: params.description || `Refund for order ${params.orderId}`,
    payment_status: 'refunded',
    payment_method: 'stripe',
    payment_reference: params.paymentReference ?? null,
    paid_at: new Date().toISOString(),
    created_by: params.createdBy,
    ticket_order_id: params.orderId,
    ticket_id: params.ticketId ?? null,
    idempotency_key: key,
  })
}
