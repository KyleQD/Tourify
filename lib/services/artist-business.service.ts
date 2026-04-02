import { createClient } from '@/lib/supabase/server'

/** Hub metrics. Revenue from merch sales is not modeled until an orders table exists. */
export interface BusinessOverview {
  totalRevenue: number
  monthlyRevenue: number
  /** Month-over-month income growth %; null when not enough data to compare */
  revenueGrowthPercent: number | null
  activeProducts: number
  totalEvents: number
  totalTracks: number
  /** Profile follower count (real signal for fan reach) */
  fanEngagement: number
  /** Contracts in sent or signed status */
  contractsActive: number
  expenses: number
  profit: number
  /** True when headline revenue comes from logged transactions, not estimates */
  revenueFromTransactions: boolean
  /** Draft + active campaigns (marketing hub activity) */
  marketingCampaignsCount: number
  /** Tours this artist is attached to (collaboration hub) */
  toursCount: number
}

export interface BusinessTransaction {
  id: string
  type: 'revenue' | 'expense' | 'royalty' | 'merchandise' | 'event'
  description: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  category: string
}

const INCOME_TYPES = new Set(['income', 'royalty', 'merchandise', 'event', 'other'])

/** UTC month range: [start, end) */
function monthBounds(offset: number) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1))
  return { startMs: start.getTime(), endMs: end.getTime() }
}

export async function getBusinessOverview({ userId }: { userId: string }): Promise<BusinessOverview> {
  if (!userId) return getEmptyOverview()

  const supabase = await createClient()

  const [
    merchandiseRes,
    eventsRes,
    musicHeadRes,
    contractsRes,
    profileRes,
    finTxRes,
    campaignsHeadRes,
    tourArtistsRes,
  ] = await Promise.all([
    supabase.from('artist_merchandise').select('id, is_active').eq('user_id', userId),
    supabase.from('artist_events').select('id, ticket_price_min, expected_attendance').eq('user_id', userId),
    supabase.from('artist_music').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('artist_contracts').select('id, status').eq('user_id', userId),
    supabase.from('profiles').select('followers_count').eq('id', userId).maybeSingle(),
    supabase
      .from('artist_financial_transactions')
      .select('amount, type, occurred_at, status')
      .eq('user_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('artist_marketing_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('tour_artists').select('tour_id').eq('artist_user_id', userId),
  ])

  const merchandise = merchandiseRes.data || []
  const events = eventsRes.data || []
  const contracts = contractsRes.data || []

  let totalTracks = 0
  if (!musicHeadRes.error && typeof musicHeadRes.count === 'number') totalTracks = musicHeadRes.count || 0
  else {
    const fallback = await supabase.from('artist_works').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    totalTracks = fallback.count || 0
  }

  const marketingCampaignsCount =
    !campaignsHeadRes.error && typeof campaignsHeadRes.count === 'number' ? campaignsHeadRes.count || 0 : 0

  const tourRows = tourArtistsRes.error ? [] : tourArtistsRes.data || []
  const toursCount = new Set(tourRows.map((r: { tour_id?: string }) => r.tour_id).filter(Boolean)).size

  const activeProducts = merchandise.filter((m: { is_active?: boolean }) => m.is_active === true).length
  const contractsActive = contracts.filter((c: { status?: string }) => c.status === 'signed' || c.status === 'sent').length
  const fanEngagement = Number(profileRes.data?.followers_count) || 0

  const eventRevenueEstimate = events.reduce((sum: number, e: { ticket_price_min?: unknown; expected_attendance?: unknown }) => {
    const price = Number(e.ticket_price_min) || 0
    const expected = Number(e.expected_attendance) || 0
    return sum + price * expected
  }, 0)

  const finRows = finTxRes.error ? [] : finTxRes.data || []

  let totalIncome = 0
  let totalExpenses = 0
  let thisMonthIncome = 0
  let prevMonthIncome = 0

  const thisMonth = monthBounds(0)
  const prevMonth = monthBounds(-1)

  for (const row of finRows) {
    const amt = Math.abs(Number(row.amount) || 0)
    const t = String(row.type)
    const occurred = row.occurred_at ? new Date(row.occurred_at).getTime() : 0

    if (INCOME_TYPES.has(t)) {
      totalIncome += amt
      if (occurred >= thisMonth.startMs && occurred < thisMonth.endMs) thisMonthIncome += amt
      if (occurred >= prevMonth.startMs && occurred < prevMonth.endMs) prevMonthIncome += amt
    } else if (t === 'expense') {
      totalExpenses += amt
    }
  }

  const hasFinancialRows = finRows.length > 0
  const revenueFromTransactions = hasFinancialRows && (totalIncome > 0 || totalExpenses > 0)

  let totalRevenue: number
  let expenses: number
  let profit: number
  let monthlyRevenue: number
  let revenueGrowthPercent: number | null

  if (revenueFromTransactions) {
    totalRevenue = Math.round(totalIncome)
    expenses = Math.round(totalExpenses)
    profit = Math.round(totalIncome - totalExpenses)
    monthlyRevenue = Math.round(thisMonthIncome)
    if (prevMonthIncome > 0) {
      revenueGrowthPercent = Math.round(((thisMonthIncome - prevMonthIncome) / prevMonthIncome) * 100)
    } else if (thisMonthIncome > 0 && prevMonthIncome === 0) {
      revenueGrowthPercent = 100
    } else {
      revenueGrowthPercent = null
    }
  } else {
    totalRevenue = Math.round(eventRevenueEstimate)
    expenses = 0
    profit = totalRevenue
    monthlyRevenue = 0
    revenueGrowthPercent = null
  }

  return {
    totalRevenue,
    monthlyRevenue,
    revenueGrowthPercent,
    activeProducts,
    totalEvents: events.length,
    totalTracks,
    fanEngagement,
    contractsActive,
    expenses,
    profit,
    revenueFromTransactions,
    marketingCampaignsCount,
    toursCount,
  }
}

export async function getRecentTransactions({ userId, limit = 5 }: { userId: string; limit?: number }): Promise<BusinessTransaction[]> {
  if (!userId) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artist_financial_transactions')
    .select('id, type, amount, description, occurred_at, status, metadata')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error || !data?.length) return []

  return data.map(row => mapFinancialRowToTransaction(row))
}

function mapFinancialRowToTransaction(row: {
  id: string
  type: string
  amount: unknown
  description?: string | null
  occurred_at: string
  status: string
  metadata?: Record<string, unknown> | null
}): BusinessTransaction {
  const isExpense = row.type === 'expense'
  const raw = Number(row.amount) || 0
  const amt = isExpense ? -Math.abs(raw) : Math.abs(raw)
  const uiType: BusinessTransaction['type'] =
    row.type === 'expense'
      ? 'expense'
      : row.type === 'royalty'
        ? 'royalty'
        : row.type === 'merchandise'
          ? 'merchandise'
          : row.type === 'event'
            ? 'event'
            : 'revenue'
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const category = typeof meta.category === 'string' ? meta.category : row.type

  return {
    id: row.id,
    type: uiType,
    description: row.description || row.type,
    amount: amt,
    date: row.occurred_at.split('T')[0],
    status: row.status === 'completed' ? 'completed' : row.status === 'failed' ? 'failed' : 'pending',
    category,
  }
}

function getEmptyOverview(): BusinessOverview {
  return {
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowthPercent: null,
    activeProducts: 0,
    totalEvents: 0,
    totalTracks: 0,
    fanEngagement: 0,
    contractsActive: 0,
    expenses: 0,
    profit: 0,
    revenueFromTransactions: false,
    marketingCampaignsCount: 0,
    toursCount: 0,
  }
}
