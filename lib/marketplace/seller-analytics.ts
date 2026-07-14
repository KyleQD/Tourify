export interface SellerAnalyticsTopListing {
  listingId: string
  title: string
  unitsSold: number
  revenue: number
}

export interface SellerAnalyticsDailyPoint {
  date: string
  revenue: number
  orders: number
}

export interface SellerAnalyticsSummary {
  rangeDays: number
  grossRevenue: number
  paidOrders: number
  unitsSold: number
  pendingPayouts: number
  topListings: SellerAnalyticsTopListing[]
  dailySeries: SellerAnalyticsDailyPoint[]
}

function startOfDayIso(daysAgo: number) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString()
}

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

export function parseAnalyticsRangeDays(range: string | null | undefined) {
  if (range === "7d") return 7
  if (range === "90d") return 90
  return 30
}

export function buildSellerAnalyticsSummary({
  orders,
  payouts,
  rangeDays,
}: {
  orders: Array<{
    id: string
    payment_status?: string | null
    total_amount?: number | null
    created_at?: string | null
    marketplace_order_items?: Array<{
      listing_id?: string | null
      title?: string | null
      quantity?: number | null
      line_total?: number | null
    }>
  }>
  payouts: Array<{
    net_amount?: number | null
    payout_status?: string | null
  }>
  rangeDays: number
}): SellerAnalyticsSummary {
  const since = startOfDayIso(rangeDays - 1)
  const paidOrders = orders.filter(
    order => order.payment_status === "paid" && (!order.created_at || order.created_at >= since)
  )

  const grossRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  const unitsSold = paidOrders.reduce(
    (sum, order) =>
      sum +
      (order.marketplace_order_items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0
  )

  const listingMap = new Map<string, SellerAnalyticsTopListing>()
  for (const order of paidOrders) {
    for (const item of order.marketplace_order_items || []) {
      if (!item.listing_id) continue
      const current = listingMap.get(item.listing_id) || {
        listingId: item.listing_id,
        title: item.title || "Listing",
        unitsSold: 0,
        revenue: 0,
      }
      current.unitsSold += Number(item.quantity || 0)
      current.revenue += Number(item.line_total || 0)
      if (item.title) current.title = item.title
      listingMap.set(item.listing_id, current)
    }
  }

  const topListings = Array.from(listingMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  const seriesMap = new Map<string, SellerAnalyticsDailyPoint>()
  for (let i = rangeDays - 1; i >= 0; i -= 1) {
    const key = dayKey(startOfDayIso(i))
    seriesMap.set(key, { date: key, revenue: 0, orders: 0 })
  }
  for (const order of paidOrders) {
    if (!order.created_at) continue
    const key = dayKey(order.created_at)
    const point = seriesMap.get(key)
    if (!point) continue
    point.orders += 1
    point.revenue += Number(order.total_amount || 0)
  }

  const pendingPayouts = payouts
    .filter(row => row.payout_status === "pending" || row.payout_status === "scheduled")
    .reduce((sum, row) => sum + Number(row.net_amount || 0), 0)

  return {
    rangeDays,
    grossRevenue,
    paidOrders: paidOrders.length,
    unitsSold,
    pendingPayouts,
    topListings,
    dailySeries: Array.from(seriesMap.values()),
  }
}
