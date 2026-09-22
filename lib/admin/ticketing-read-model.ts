/**
 * TIX-104 — Feature-flagged Admin dual-read model (legacy vs canonical totals).
 * Mismatches block cutover and expose causes for operators.
 */

export const TICKETING_CANONICAL_FLAG = "admin_ticketing_canonical_v1"

function envFlagOn(env: NodeJS.ProcessEnv, keys: string[]): boolean {
  for (const key of keys) {
    const raw = String(env[key] || "").toLowerCase().trim()
    if (!raw || raw === "0" || raw === "false" || raw === "off") continue
    if (raw === "1" || raw === "true" || raw === "on" || raw === "enforce") return true
  }
  return false
}

/** Dual-read / cutover UI is on when V2 or explicit read-model env flag is set. */
export function isTicketingReadModelEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagOn(env, [
    "FEATURE_TICKETING_V2",
    "NEXT_PUBLIC_FEATURE_TICKETING_V2",
    "FEATURE_ADMIN_TICKETING_READ_MODEL",
    "NEXT_PUBLIC_FEATURE_ADMIN_TICKETING_READ_MODEL",
  ])
}

export interface TicketingSourceTotals {
  orderCount: number
  ticketsSold: number
  revenue: number
  quantityAvailable: number
  quantityReserved: number
  issuedTicketRows: number
}

export interface TicketingMismatch {
  code: string
  metric: string
  legacy: number
  canonical: number
  delta: number
  cause: string
  eventId?: string | null
}

export interface TicketingReadModelComparison {
  flag: typeof TICKETING_CANONICAL_FLAG
  readModelEnabled: boolean
  orgId: string
  eventId: string | null
  legacy: TicketingSourceTotals
  canonical: TicketingSourceTotals
  mismatches: TicketingMismatch[]
  canCutover: boolean
  cutoverBlockedReasons: string[]
}

const EPSILON = 0.01

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON
}

export function compareTicketingTotals(args: {
  orgId: string
  eventId?: string | null
  legacy: TicketingSourceTotals
  canonical: TicketingSourceTotals
  readModelEnabled?: boolean
}): TicketingReadModelComparison {
  const mismatches: TicketingMismatch[] = []
  const eventId = args.eventId ?? null

  function push(
    code: string,
    metric: string,
    legacy: number,
    canonical: number,
    cause: string,
  ) {
    if (nearlyEqual(legacy, canonical)) return
    mismatches.push({
      code,
      metric,
      legacy,
      canonical,
      delta: Number((canonical - legacy).toFixed(4)),
      cause,
      eventId,
    })
  }

  push(
    "sold_vs_issued",
    "tickets_sold",
    args.legacy.ticketsSold,
    args.canonical.issuedTicketRows,
    "Legacy ticket_types.quantity_sold / sales qty does not match issued tickets rows",
  )
  push(
    "order_qty_vs_issued",
    "order_ticket_quantity",
    args.legacy.ticketsSold,
    args.canonical.ticketsSold,
    "Completed order quantities do not match canonical sold counter",
  )
  push(
    "revenue",
    "revenue",
    args.legacy.revenue,
    args.canonical.revenue,
    "Completed sale revenue differs between legacy aggregate and canonical read model",
  )
  push(
    "reserved",
    "quantity_reserved",
    args.legacy.quantityReserved,
    args.canonical.quantityReserved,
    "ticket_types.quantity_reserved does not match active inventory reservations",
  )
  push(
    "available",
    "quantity_available",
    args.legacy.quantityAvailable,
    args.canonical.quantityAvailable,
    "Configured available capacity differs across legacy type sum and canonical config/capacity",
  )
  push(
    "orders",
    "order_count",
    args.legacy.orderCount,
    args.canonical.orderCount,
    "Completed order counts differ between aggregates",
  )

  const cutoverBlockedReasons = mismatches.map(
    (m) => `${m.code}: ${m.cause} (legacy=${m.legacy}, canonical=${m.canonical})`,
  )
  const readModelEnabled = args.readModelEnabled ?? true

  return {
    flag: TICKETING_CANONICAL_FLAG,
    readModelEnabled,
    orgId: args.orgId,
    eventId,
    legacy: args.legacy,
    canonical: args.canonical,
    mismatches,
    canCutover: readModelEnabled && mismatches.length === 0,
    cutoverBlockedReasons,
  }
}


type SupabaseLike = { from: (table: string) => any }

export async function loadTicketingReadModel(args: {
  supabase: SupabaseLike
  orgId: string
  eventIds: string[]
  eventId?: string | null
}): Promise<TicketingReadModelComparison> {
  const ids = args.eventIds.length > 0 ? args.eventIds : ["00000000-0000-0000-0000-000000000000"]

  const [typesResult, salesResult, ticketsResult, reservationsResult, configResult] =
    await Promise.all([
      args.supabase
        .from("ticket_types")
        .select("id,event_id,quantity_available,quantity_sold,quantity_reserved")
        .in("event_id", ids)
        .limit(5_000),
      args.supabase
        .from("ticket_sales")
        .select("id,event_id,quantity,total_amount,payment_status,issuance_status")
        .in("event_id", ids)
        .in("payment_status", ["completed", "paid"])
        .limit(10_000),
      args.supabase
        .from("tickets")
        .select("id,event_id,status")
        .in("event_id", ids)
        .limit(20_000),
      args.supabase
        .from("ticket_inventory_reservations")
        .select("id,event_id,quantity,status")
        .in("event_id", ids)
        .eq("status", "active")
        .limit(10_000),
      args.supabase
        .from("event_ticketing_config")
        .select("event_id,capacity")
        .in("event_id", ids)
        .limit(2_000),
    ])

  if (typesResult.error)
    throw new Error(typesResult.error.message || "Failed to load ticket types for read model")
  if (salesResult.error)
    throw new Error(salesResult.error.message || "Failed to load ticket sales for read model")
  // tickets / reservations / config may be empty on orgs without foundation rows
  const types = (typesResult.data || []) as Array<{
    quantity_available: number | null
    quantity_sold: number | null
    quantity_reserved: number | null
  }>
  const sales = (salesResult.data || []) as Array<{
    quantity: number | null
    total_amount: number | null
  }>
  const ticketRows = ticketsResult.error ? [] : ((ticketsResult.data || []) as Array<{ status: string }>)
  const reservations = reservationsResult.error
    ? []
    : ((reservationsResult.data || []) as Array<{ quantity: number | null }>)
  const configs = configResult.error
    ? []
    : ((configResult.data || []) as Array<{ capacity: number | null }>)

  const legacySoldFromTypes = types.reduce((sum, t) => sum + Number(t.quantity_sold || 0), 0)
  const legacyAvailable = types.reduce((sum, t) => sum + Number(t.quantity_available || 0), 0)
  const legacyReserved = types.reduce((sum, t) => sum + Number(t.quantity_reserved || 0), 0)
  const legacyOrderQty = sales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
  const legacyRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  const issuedStatuses = new Set(["issued", "active", "transferred", "checked_in", "used"])
  const issuedTicketRows = ticketRows.filter((t) => issuedStatuses.has(String(t.status || "").toLowerCase())).length
  const activeReserved = reservations.reduce((sum, r) => sum + Number(r.quantity || 0), 0)
  const configCapacity = configs.reduce((sum, c) => sum + Number(c.capacity || 0), 0)

  const legacy: TicketingSourceTotals = {
    orderCount: sales.length,
    ticketsSold: legacySoldFromTypes || legacyOrderQty,
    revenue: Math.round(legacyRevenue * 100) / 100,
    quantityAvailable: legacyAvailable,
    quantityReserved: legacyReserved,
    issuedTicketRows: legacySoldFromTypes || legacyOrderQty,
  }

  const canonical: TicketingSourceTotals = {
    orderCount: sales.length,
    ticketsSold: issuedTicketRows || legacyOrderQty,
    revenue: Math.round(legacyRevenue * 100) / 100,
    // Prefer config capacity only when set; otherwise mirror legacy so unset config is not a false mismatch
    quantityAvailable: configCapacity > 0 ? configCapacity : legacyAvailable,
    quantityReserved: activeReserved,
    issuedTicketRows,
  }

  // Pre-issuance orgs: no ticket rows yet — align sold counters when reservation books match
  if (ticketRows.length === 0 && nearlyEqual(legacyReserved, activeReserved)) {
    canonical.issuedTicketRows = legacy.ticketsSold
    canonical.ticketsSold = legacy.ticketsSold
  }

  return compareTicketingTotals({
    orgId: args.orgId,
    eventId: args.eventId ?? null,
    legacy,
    canonical,
    readModelEnabled: isTicketingReadModelEnabled(),
  })
}
