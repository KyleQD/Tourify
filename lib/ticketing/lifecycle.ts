export interface TicketSaleGateInput {
  eventStatus?: string | null
  ticketingEnabled?: boolean | null
  saleStart?: string | null
  saleEnd?: string | null
  now?: Date
}

export type TicketSaleGate =
  | { allowed: true }
  | { allowed: false; code: 'EVENT_NOT_PUBLISHED' | 'TICKETING_NOT_ENABLED' | 'SALE_NOT_STARTED' | 'SALE_ENDED' }

/**
 * Canonical public-sale gate. A ticket type existing is not publication proof:
 * the event must be published and its ticketing configuration explicitly on.
 */
export function evaluateTicketSaleGate(input: TicketSaleGateInput): TicketSaleGate {
  if (String(input.eventStatus || '').toLowerCase() !== 'published')
    return { allowed: false, code: 'EVENT_NOT_PUBLISHED' }

  if (input.ticketingEnabled !== true)
    return { allowed: false, code: 'TICKETING_NOT_ENABLED' }

  const now = (input.now || new Date()).getTime()
  const saleStart = input.saleStart ? new Date(input.saleStart).getTime() : null
  const saleEnd = input.saleEnd ? new Date(input.saleEnd).getTime() : null

  if (saleStart !== null && Number.isFinite(saleStart) && now < saleStart)
    return { allowed: false, code: 'SALE_NOT_STARTED' }
  if (saleEnd !== null && Number.isFinite(saleEnd) && now > saleEnd)
    return { allowed: false, code: 'SALE_ENDED' }

  return { allowed: true }
}

/** Inventory visible to a new buyer after both sold and active holds. */
export function remainingTicketInventory(input: {
  quantityAvailable?: number | null
  quantitySold?: number | null
  quantityReserved?: number | null
}): number {
  const capacity = Math.max(0, Math.floor(Number(input.quantityAvailable) || 0))
  const sold = Math.max(0, Math.floor(Number(input.quantitySold) || 0))
  const reserved = Math.max(0, Math.floor(Number(input.quantityReserved) || 0))
  return Math.max(0, capacity - sold - reserved)
}
