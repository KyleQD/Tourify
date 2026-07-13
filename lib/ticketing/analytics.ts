/**
 * Normalized ticketing analytics event emitter.
 */

export type TicketAnalyticsEventName =
  | 'ticket_sales_published'
  | 'ticket_page_viewed'
  | 'ticket_type_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'ticket_purchased'
  | 'ticket_issued'
  | 'ticket_assigned'
  | 'ticket_transferred'
  | 'ticket_refunded'
  | 'ticket_canceled'
  | 'ticket_scanned'
  | 'ticket_checkin_reversed'
  | 'promo_code_used'
  | 'complimentary_ticket_issued'

export interface AnalyticsClient {
  from: (table: string) => any
}

export async function emitTicketAnalyticsEvent(params: {
  supabase: AnalyticsClient
  eventName: TicketAnalyticsEventName
  eventId?: string | null
  ticketTypeId?: string | null
  orderId?: string | null
  ticketId?: string | null
  actorUserId?: string | null
  attribution?: Record<string, unknown>
  amounts?: Record<string, unknown>
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await params.supabase.from('ticket_analytics_events').insert({
      event_name: params.eventName,
      event_id: params.eventId ?? null,
      ticket_type_id: params.ticketTypeId ?? null,
      order_id: params.orderId ?? null,
      ticket_id: params.ticketId ?? null,
      actor_user_id: params.actorUserId ?? null,
      attribution: params.attribution ?? {},
      amounts: params.amounts ?? {},
      metadata: params.metadata ?? {},
    })
  } catch (error) {
    console.error('[ticketing.analytics] failed to emit', params.eventName, error)
  }
}
