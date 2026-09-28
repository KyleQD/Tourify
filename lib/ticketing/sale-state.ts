/**
 * VEN-150 — Canonical ticket sale-state derivation.
 *
 * Sale states derive from the event lifecycle + event_ticketing_config +
 * live inventory. Never derived from UI convenience ("inquiry == Draft").
 */

export type TicketSaleState =
  | 'draft'
  | 'scheduled'
  | 'sales_not_open'
  | 'on_sale'
  | 'paused'
  | 'sold_out'
  | 'ended'
  | 'cancelled'

export interface SaleStateInput {
  /** Canonical events_v2.status (draft|published|cancelled|completed|inquiry…). */
  eventStatus?: string | null
  /** ISO timestamps. */
  eventStartAt?: string | null
  eventEndAt?: string | null
  saleStart?: string | null
  saleEnd?: string | null
  ticketingEnabled?: boolean | null
  /** Config-level pause flag (publish/unpublish surface). */
  salesPaused?: boolean | null
  /** Sum of active ticket-type inventory; falls back to event capacity. */
  totalInventory?: number | null
  totalSold?: number | null
  /** Number of active, visible ticket types. */
  activeTypeCount?: number | null
  now?: Date
}

const CLOSED_EVENT_STATUSES = new Set(['cancelled', 'canceled'])
const DRAFT_EVENT_STATUSES = new Set(['draft', 'inquiry', 'pending'])

export interface SaleStateResult {
  state: TicketSaleState
  label: string
  reason: string
}

export function deriveSaleState(input: SaleStateInput): SaleStateResult {
  const now = input.now || new Date()
  const status = String(input.eventStatus || '').toLowerCase()

  if (CLOSED_EVENT_STATUSES.has(status)) {
    return { state: 'cancelled', label: 'Cancelled', reason: `Event status is ${status}.` }
  }
  if (DRAFT_EVENT_STATUSES.has(status)) {
    return { state: 'draft', label: 'Draft', reason: `Event status is ${status}; publish the event first.` }
  }

  const startAt = input.eventStartAt ? new Date(input.eventStartAt) : null
  const endAt = input.eventEndAt ? new Date(input.eventEndAt) : startAt ? new Date(startAt.getTime() + 6 * 60 * 60 * 1000) : null
  const eventOver = endAt ? endAt.getTime() < now.getTime() : false

  if (!input.ticketingEnabled) {
    if (eventOver) return { state: 'ended', label: 'Ended', reason: 'Event has finished and ticketing was never enabled.' }
    if (startAt && startAt.getTime() < now.getTime()) {
      // Started but no ticketing configured — treat as ended for sales purposes.
      return { state: 'ended', label: 'Ended', reason: 'Event already started without ticketing.' }
    }
    return { state: 'scheduled', label: 'Scheduled', reason: 'Ticketing not configured yet for this event.' }
  }

  if (input.salesPaused) {
    return { state: 'paused', label: 'Paused', reason: 'Sales paused by an operator.' }
  }
  if (eventOver) {
    return { state: 'ended', label: 'Ended', reason: 'Event end time has passed.' }
  }

  const saleStart = input.saleStart ? new Date(input.saleStart) : null
  const saleEnd = input.saleEnd ? new Date(input.saleEnd) : null
  if (saleEnd && saleEnd.getTime() < now.getTime()) {
    return { state: 'ended', label: 'Sale window closed', reason: `Sale window closed ${saleEnd.toISOString()}.` }
  }
  if (saleStart && saleStart.getTime() > now.getTime()) {
    return { state: 'sales_not_open', label: 'Sales open soon', reason: `Sales begin ${saleStart.toISOString()}.` }
  }

  const inventory = Math.max(0, Math.floor(Number(input.totalInventory ?? 0)))
  const sold = Math.max(0, Math.floor(Number(input.totalSold ?? 0)))
  const activeTypes = Math.max(0, Math.floor(Number(input.activeTypeCount ?? 0)))

  if (activeTypes === 0) {
    return { state: 'sales_not_open', label: 'No ticket types', reason: 'Ticketing is on but no purchasable ticket types exist.' }
  }
  if (inventory > 0 && sold >= inventory) {
    return { state: 'sold_out', label: 'Sold out', reason: `All ${inventory} tickets sold.` }
  }

  return { state: 'on_sale', label: 'On sale', reason: `${Math.max(0, inventory - sold)} of ${inventory || '?'} available.` }
}
