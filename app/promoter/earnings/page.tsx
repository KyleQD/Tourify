"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Copy, Link2, RefreshCw, WalletCards } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Earnings = {
  currency: string
  earned_minor: number
  reinstated_minor: number
  reversed_minor: number
  pending_minor: number
  available_minor: number
  paid_minor: number
  held_minor: number
  net_commission_minor: number
}

type Program = {
  membership_id: string
  membership_status: string
  program_id: string
  program_status: string
  event_id: string
  event_title: string | null
  event_starts_at: string | null
  currency: string
  clicks: number
  unique_sessions: number
  attributed_sales: number
  tickets_sold: number
  eligible_revenue_minor: number
  conversion_rate: number
  earned_minor: number
  reversed_minor: number
  pending_minor: number
  available_minor: number
  paid_minor: number
  net_commission_minor: number
  assets: {
    tracking_links: Array<{ id: string; label: string | null; status: string; destination_path: string; expires_at: string | null; created_at: string }>
    promo_codes: Array<{ id: string; code: string; status: string; created_at: string }>
    social_sources: Array<{ id: string; source_type: string; source_id: string; created_at: string }>
  }
  source_performance: Array<{ source_type: string; clicks: number; attributed_sales: number; eligible_revenue_minor: number }>
}

type LedgerEntry = {
  id: string
  membership_id: string
  program_id: string
  event_id: string
  entry_type: string
  status: string
  amount_minor: number
  currency: string
  eligible_revenue_minor: number
  reason: string | null
  occurred_at: string
}

type Dashboard = {
  summary: {
    program_count: number
    clicks: number
    unique_sessions: number
    attributed_sales: number
    tickets_sold: number
    eligible_revenue_minor: number
    earnings_by_currency: Earnings[]
  }
  programs: Program[]
  ledger_entries: LedgerEntry[]
  payout_setup: { enabled: boolean; status: string }
}

const emptyDashboard: Dashboard = {
  summary: { program_count: 0, clicks: 0, unique_sessions: 0, attributed_sales: 0, tickets_sold: 0, eligible_revenue_minor: 0, earnings_by_currency: [] },
  programs: [],
  ledger_entries: [],
  payout_setup: { enabled: false, status: 'not_available' },
}

function money(minor: number, currency = 'usd') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(Number(minor || 0) / 100)
}

function label(value: string) {
  return value.replaceAll('_', ' ')
}

export default function PromoterEarningsPage() {
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard)
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [linkLabel, setLinkLabel] = useState<Record<string, string>>({})
  const [newLinks, setNewLinks] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/promoter/earnings', { credentials: 'include' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load promoter earnings.')
      setEnabled(payload?.enabled !== false)
      setDashboard({ ...emptyDashboard, ...(payload?.data || {}) })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load promoter earnings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createLink(program: Program) {
    setCreatingFor(program.membership_id)
    try {
      const response = await fetch(`/api/promoter/memberships/${program.membership_id}/tracking-links`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: linkLabel[program.membership_id] || null,
          destination_path: `/tickets/purchase?event_id=${encodeURIComponent(program.event_id)}`,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to create tracking link.')
      const publicUrl = payload?.data?.public_url
      if (!publicUrl) throw new Error('Tracking link was created without a safe public URL.')
      setNewLinks((current) => ({ ...current, [program.membership_id]: publicUrl }))
      setLinkLabel((current) => ({ ...current, [program.membership_id]: '' }))
      toast.success('New tracking link created. Copy it now; its raw token is never stored.')
      await load()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to create tracking link.')
    } finally {
      setCreatingFor(null)
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Copy is unavailable in this browser.')
    }
  }

  if (loading) return <main className="container mx-auto max-w-6xl px-4 py-8"><Card><CardContent className="py-12 text-center text-slate-400">Loading your promoter earnings…</CardContent></Card></main>

  if (error) return <main className="container mx-auto max-w-6xl px-4 py-8"><Card><CardHeader><CardTitle>Promoter earnings are unavailable</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card></main>

  if (!enabled) return <main className="container mx-auto max-w-6xl px-4 py-8"><Card><CardHeader><CardTitle>Promoter earnings are not available yet</CardTitle><CardDescription>This workspace will appear when the Promoter Network rollout is enabled for your account.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/promoter/opportunities">View opportunities</Link></Button></CardContent></Card></main>

  return <main className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-cyan-300">Promoter Network</p><h1 className="mt-1 text-3xl font-semibold text-slate-100">Earnings and performance</h1><p className="mt-2 max-w-2xl text-slate-400">Money totals are calculated from the immutable commission ledger. Clicks and sales are server-resolved attribution records.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button asChild><Link href="/promoter/opportunities">Find programs</Link></Button></div>
    </section>

    {dashboard.summary.earnings_by_currency.length > 0 ? <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dashboard.summary.earnings_by_currency.map((earnings) => <Card key={earnings.currency}><CardHeader className="pb-2"><CardDescription>Net commission · {earnings.currency.toUpperCase()}</CardDescription><CardTitle className="text-2xl">{money(earnings.net_commission_minor, earnings.currency)}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Pending {money(earnings.pending_minor, earnings.currency)}</span><span>Available {money(earnings.available_minor, earnings.currency)}</span><span>Paid {money(earnings.paid_minor, earnings.currency)}</span><span>Reversed {money(earnings.reversed_minor, earnings.currency)}</span></CardContent></Card>)}</section> : null}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardDescription>Clicks</CardDescription><CardTitle>{dashboard.summary.clicks.toLocaleString()}</CardTitle></CardHeader><CardContent className="text-xs text-slate-400">{dashboard.summary.unique_sessions.toLocaleString()} unique sessions</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Attributed sales</CardDescription><CardTitle>{dashboard.summary.attributed_sales.toLocaleString()}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Tickets sold</CardDescription><CardTitle>{dashboard.summary.tickets_sold.toLocaleString()}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Promoter programs</CardDescription><CardTitle>{dashboard.summary.program_count.toLocaleString()}</CardTitle></CardHeader></Card>
    </section>

    {dashboard.programs.length === 0 ? <Card><CardHeader><CardTitle>No approved promoter programs yet</CardTitle><CardDescription>Once an organizer approves you, your tracking links, attributed sales, and earnings will appear here.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/promoter/opportunities">Explore opportunities</Link></Button></CardContent></Card> : dashboard.programs.map((program) => <Card key={program.membership_id} className="border-slate-800 bg-slate-950/55"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{program.event_title || 'Event promoter program'}</CardTitle><CardDescription>{program.event_starts_at ? new Date(program.event_starts_at).toLocaleString() : 'Event date to be announced'}</CardDescription></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{label(program.membership_status)}</Badge><Badge variant="outline">{label(program.program_status)}</Badge></div></div></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Clicks" value={program.clicks.toLocaleString()} note={`${program.unique_sessions.toLocaleString()} unique`} /><Metric label="Sales" value={program.attributed_sales.toLocaleString()} note={`${program.tickets_sold.toLocaleString()} tickets`} /><Metric label="Conversion" value={`${(program.conversion_rate * 100).toFixed(1)}%`} note="attributed sales / clicks" /><Metric label="Net commission" value={money(program.net_commission_minor, program.currency)} note={`Reversed ${money(program.reversed_minor, program.currency)}`} /></div>
      <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border border-slate-800 p-4"><div className="mb-3 flex items-center gap-2 font-medium text-slate-100"><Link2 className="h-4 w-4 text-cyan-300" />Tracking links</div><div className="flex flex-col gap-2 sm:flex-row"><Input value={linkLabel[program.membership_id] || ''} onChange={(event) => setLinkLabel((current) => ({ ...current, [program.membership_id]: event.target.value }))} placeholder="Optional link label" /><Button disabled={creatingFor === program.membership_id || program.membership_status !== 'approved'} onClick={() => void createLink(program)}>{creatingFor === program.membership_id ? 'Creating…' : 'Create link'}</Button></div>{newLinks[program.membership_id] ? <div className="mt-3 flex flex-col gap-2 rounded bg-cyan-500/10 p-3 text-sm text-cyan-100 sm:flex-row sm:items-center sm:justify-between"><span className="break-all">{newLinks[program.membership_id]}</span><Button size="sm" variant="outline" onClick={() => void copy(newLinks[program.membership_id])}><Copy className="mr-2 h-3.5 w-3.5" />Copy</Button></div> : null}<ul className="mt-3 space-y-2 text-sm text-slate-400">{program.assets.tracking_links.length ? program.assets.tracking_links.map((link) => <li key={link.id} className="flex items-center justify-between gap-2"><span className="truncate">{link.label || link.destination_path}</span><Badge variant="outline">{link.status}</Badge></li>) : <li>No links yet.</li>}</ul></div>
        <div className="rounded-lg border border-slate-800 p-4"><div className="mb-3 flex items-center gap-2 font-medium text-slate-100"><BarChart3 className="h-4 w-4 text-cyan-300" />Codes and source activity</div><div className="flex flex-wrap gap-2">{program.assets.promo_codes.length ? program.assets.promo_codes.map((code) => <Badge key={code.id} variant="outline">{code.code} · {code.status}</Badge>) : <span className="text-sm text-slate-400">No promoter codes linked.</span>}</div><div className="mt-4 space-y-2 text-sm text-slate-400">{program.source_performance.length ? program.source_performance.map((source) => <div key={source.source_type} className="flex justify-between gap-3"><span>{label(source.source_type)}</span><span>{source.clicks} clicks · {source.attributed_sales} sales</span></div>) : <p>No attributed sources yet.</p>}</div></div></div>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5"><Metric label="Eligible revenue" value={money(program.eligible_revenue_minor, program.currency)} /><Metric label="Pending" value={money(program.pending_minor, program.currency)} /><Metric label="Available" value={money(program.available_minor, program.currency)} /><Metric label="Paid" value={money(program.paid_minor, program.currency)} /><Metric label="Payout setup" value={dashboard.payout_setup.enabled ? 'Available' : 'Not available'} note={dashboard.payout_setup.enabled ? 'Set up in payout workspace' : 'Coming in the payout phase'} /></div>
    </CardContent></Card>)}

    <Card><CardHeader><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-cyan-300" /><div><CardTitle>Commission ledger</CardTitle><CardDescription>Most recent immutable earned, reversal, and settlement entries.</CardDescription></div></div></CardHeader><CardContent>{dashboard.ledger_entries.length ? <div className="space-y-2">{dashboard.ledger_entries.map((entry) => <div key={entry.id} className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-100">{label(entry.entry_type)}</p><p className="text-xs text-slate-400">{new Date(entry.occurred_at).toLocaleString()} · {entry.reason || 'Verified payment record'}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{label(entry.status)}</Badge><span className={entry.amount_minor < 0 ? 'font-medium text-rose-300' : 'font-medium text-emerald-300'}>{money(entry.amount_minor, entry.currency)}</span></div></div>)}</div> : <div className="py-8 text-center text-sm text-slate-400">No commission entries yet. Paid, attributed sales will appear after verified payment processing.</div>}</CardContent></Card>
  </main>
}

function Metric({ label: metricLabel, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-lg border border-slate-800 p-3"><p className="text-xs text-slate-400">{metricLabel}</p><p className="mt-1 font-semibold text-slate-100">{value}</p>{note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}</div>
}
