"use client"

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Download, RefreshCw, TrendingUp, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActingContext } from '@/hooks/use-acting-context'

type FinancialTotal = { currency: string; earned_minor: number; reversed_minor: number; pending_minor: number; available_minor: number; paid_minor: number; net_commission_minor: number }
type Promoter = { membership_id: string; membership_status: string; promoter_user_id: string; currency: string; clicks: number; attributed_sales: number; tickets_sold: number; eligible_revenue_minor: number; earned_minor: number; reversed_minor: number; net_commission_minor: number; conversion_rate: number }
type Source = { source_type: string; clicks: number; attributed_sales: number; eligible_revenue_minor: number }
type TicketType = { ticket_type_id: string; ticket_type_name: string; attributed_sales: number; tickets_sold: number; eligible_revenue_minor: number; earned_minor: number; reversed_minor: number }
type LedgerEntry = { id: string; membership_id: string; entry_type: string; status: string; amount_minor: number; currency: string; ticket_type_id: string | null; source_type: string; occurred_at: string; reason: string | null }
type Data = { summary: { applicants: number; approved_applications: number; approval_rate: number; active_promoters: number; attributed_sales: number; tickets_sold: number; eligible_revenue_minor: number; financial_by_currency: FinancialTotal[] }; promoter_rankings: Promoter[]; source_performance: Source[]; ticket_type_performance: TicketType[]; ledger_entries: LedgerEntry[]; tour_aggregate: { tour_name: string; managed_events: number; attributed_sales: number; eligible_revenue_minor: number; net_commission_minor: number } | null }

const empty: Data = { summary: { applicants: 0, approved_applications: 0, approval_rate: 0, active_promoters: 0, attributed_sales: 0, tickets_sold: 0, eligible_revenue_minor: 0, financial_by_currency: [] }, promoter_rankings: [], source_performance: [], ticket_type_performance: [], ledger_entries: [], tour_aggregate: null }

function money(minor: number, currency = 'usd') { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(Number(minor || 0) / 100) }
function label(value: string) { return value.replaceAll('_', ' ') }
function shortId(value: string) { return `${value.slice(0, 8)}…` }

export function EventPromoterAnalyticsPanel({ eventId }: { eventId: string }) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [data, setData] = useState<Data>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/promoter-analytics`, { credentials: 'include', headers: actingHeaders })
      if (response.status === 404) { setData(empty); return }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load promoter analytics.')
      setData({ ...empty, ...(payload?.data || {}) })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load promoter analytics.')
    } finally { setLoading(false) }
  }, [actingHeaders, eventId, isActingReady])

  useEffect(() => { void load() }, [load])

  async function downloadCsv() {
    const query = new URLSearchParams({ format: 'csv' })
    try {
      const response = await fetch(`/api/admin/events/${eventId}/promoter-analytics?${query.toString()}`, {
        credentials: 'include',
        headers: actingHeaders,
      })
      if (!response.ok) throw new Error('Unable to export promoter analytics.')
      const href = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = `event-${eventId}-promoter-analytics.csv`
      anchor.click()
      URL.revokeObjectURL(href)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to export promoter analytics.')
    }
  }

  if (loading) return <Card className="border-slate-800 bg-slate-950/50"><CardContent className="py-10 text-center text-sm text-slate-400">Loading promoter analytics…</CardContent></Card>
  if (error) return <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle>Promoter analytics unavailable</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>

  return <div className="space-y-6">
    <Card className="border-slate-800 bg-slate-950/50"><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-slate-100"><BarChart3 className="h-5 w-5 text-cyan-300" />Promoter performance</CardTitle><CardDescription>Trusted attribution and ledger totals for this event. Payment references are excluded.</CardDescription></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button><Button size="sm" variant="outline" onClick={() => void downloadCsv()}><Download className="mr-2 h-3.5 w-3.5" />CSV</Button></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Applicants" value={data.summary.applicants.toLocaleString()} note={`${(data.summary.approval_rate * 100).toFixed(1)}% approved`} /><Metric label="Active promoters" value={data.summary.active_promoters.toLocaleString()} /><Metric label="Attributed sales" value={data.summary.attributed_sales.toLocaleString()} note={`${data.summary.tickets_sold.toLocaleString()} tickets`} /><Metric label="Eligible revenue" value={data.summary.financial_by_currency[0] ? money(data.summary.eligible_revenue_minor, data.summary.financial_by_currency[0].currency) : '—'} /></CardContent></Card>

    {data.summary.financial_by_currency.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.summary.financial_by_currency.map((finance) => <Card key={finance.currency} className="border-slate-800 bg-slate-950/50"><CardHeader className="pb-2"><CardDescription>Net liability · {finance.currency.toUpperCase()}</CardDescription><CardTitle>{money(finance.net_commission_minor, finance.currency)}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Pending {money(finance.pending_minor, finance.currency)}</span><span>Available {money(finance.available_minor, finance.currency)}</span><span>Paid {money(finance.paid_minor, finance.currency)}</span><span>Reversed {money(finance.reversed_minor, finance.currency)}</span></CardContent></Card>)}</div> : null}

    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="flex items-center gap-2 text-slate-100"><UsersRound className="h-4 w-4 text-cyan-300" />Promoter rankings</CardTitle><CardDescription>Ranked by net commission, then attributed sales.</CardDescription></CardHeader><CardContent className="space-y-2">{data.promoter_rankings.length ? data.promoter_rankings.map((promoter) => <div key={promoter.membership_id} className="grid gap-2 rounded-lg border border-slate-800 p-3 text-sm sm:grid-cols-[1.2fr_.8fr_.8fr_.8fr]"><div><p className="font-medium text-slate-100">Promoter {shortId(promoter.promoter_user_id)}</p><Badge variant="outline">{label(promoter.membership_status)}</Badge></div><div><p className="text-xs text-slate-400">Clicks / sales</p><p>{promoter.clicks} / {promoter.attributed_sales}</p></div><div><p className="text-xs text-slate-400">Conversion</p><p>{(promoter.conversion_rate * 100).toFixed(1)}%</p></div><div><p className="text-xs text-slate-400">Net commission</p><p className="font-medium text-emerald-300">{money(promoter.net_commission_minor, promoter.currency)}</p></div></div>) : <p className="text-sm text-slate-400">No promoter memberships yet.</p>}</CardContent></Card>
      <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="flex items-center gap-2 text-slate-100"><TrendingUp className="h-4 w-4 text-cyan-300" />Source performance</CardTitle><CardDescription>Server-resolved touchpoints and final attributions.</CardDescription></CardHeader><CardContent className="space-y-3">{data.source_performance.length ? data.source_performance.map((source) => <div key={source.source_type} className="flex items-center justify-between gap-3 text-sm"><span className="capitalize text-slate-300">{label(source.source_type)}</span><span className="text-slate-400">{source.clicks} clicks · {source.attributed_sales} sales</span></div>) : <p className="text-sm text-slate-400">No source activity yet.</p>}</CardContent></Card></div>

    <div className="grid gap-6 xl:grid-cols-2"><Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="text-slate-100">Ticket type performance</CardTitle><CardDescription>Attributed sales and financial impact by eligible ticket type.</CardDescription></CardHeader><CardContent className="space-y-2">{data.ticket_type_performance.length ? data.ticket_type_performance.map((ticket) => <div key={ticket.ticket_type_id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 p-3 text-sm"><div><p className="font-medium text-slate-100">{ticket.ticket_type_name}</p><p className="text-xs text-slate-400">{ticket.tickets_sold} tickets · {ticket.attributed_sales} sales</p></div><div className="text-right"><p>{money(ticket.eligible_revenue_minor)}</p><p className="text-xs text-slate-400">Earned {money(ticket.earned_minor)}</p></div></div>) : <p className="text-sm text-slate-400">No attributed ticket sales yet.</p>}</CardContent></Card>
      <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="text-slate-100">Tour aggregate</CardTitle><CardDescription>Only tour stops this organizer can manage are included.</CardDescription></CardHeader><CardContent>{data.tour_aggregate ? <div className="space-y-2 text-sm"><p className="font-medium text-slate-100">{data.tour_aggregate.tour_name}</p><p className="text-slate-400">{data.tour_aggregate.managed_events} managed stops · {data.tour_aggregate.attributed_sales} attributed sales</p><p className="text-emerald-300">Net commission {money(data.tour_aggregate.net_commission_minor)}</p></div> : <p className="text-sm text-slate-400">This event is not linked to a manageable tour.</p>}</CardContent></Card></div>

    <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="text-slate-100">Transactions and reversals</CardTitle><CardDescription>Recent immutable promoter commission entries for this event.</CardDescription></CardHeader><CardContent className="space-y-2">{data.ledger_entries.length ? data.ledger_entries.map((entry) => <div key={entry.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm sm:flex-row sm:items-center"><div><p className="font-medium text-slate-100">{label(entry.entry_type)} · {label(entry.status)}</p><p className="text-xs text-slate-400">{new Date(entry.occurred_at).toLocaleString()} · {entry.source_type}</p></div><span className={entry.amount_minor < 0 ? 'font-medium text-rose-300' : 'font-medium text-emerald-300'}>{money(entry.amount_minor, entry.currency)}</span></div>) : <p className="text-sm text-slate-400">No commission transactions yet.</p>}</CardContent></Card>
  </div>
}

function Metric({ label: metricLabel, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-lg border border-slate-800 p-3"><p className="text-xs text-slate-400">{metricLabel}</p><p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>{note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}</div>
}
