"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Megaphone, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Opportunity {
  id: string
  application_mode: string
  commission_type: string
  commission_rate_bps: number | null
  commission_fixed_amount_minor: number | null
  currency: string
  attribution_window_days: number
  terms_markdown: string | null
  events_v2: { title: string; start_at: string | null } | null
  application: { id: string; status: string; source: string } | null
  membership: { id: string; status: string } | null
}

function commissionLabel(opportunity: Opportunity) {
  if (opportunity.commission_type === 'percentage') return `${((opportunity.commission_rate_bps || 0) / 100).toFixed(2)}% of eligible ticket revenue`
  return `${(Number(opportunity.commission_fixed_amount_minor || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: opportunity.currency.toUpperCase() })} per eligible ticket`
}

export default function PromoterOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [messageByProgram, setMessageByProgram] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyProgram, setBusyProgram] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/promoter/opportunities', { credentials: 'include' })
      if (!response.ok) throw new Error('Unable to load promoter opportunities.')
      setOpportunities((await response.json()).data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load promoter opportunities.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function apply(opportunity: Opportunity) {
    setBusyProgram(opportunity.id)
    try {
      const response = await fetch(`/api/promoter/programs/${opportunity.id}/apply`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_message: messageByProgram[opportunity.id] || null }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to submit your application.')
      toast.success('Application submitted.')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to submit your application.') } finally { setBusyProgram(null) }
  }

  async function acceptInvitation(opportunity: Opportunity) {
    if (!opportunity.application) return
    setBusyProgram(opportunity.id)
    try {
      const response = await fetch(`/api/promoter/invitations/${opportunity.application.id}/accept`, { method: 'POST', credentials: 'include' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to accept invitation.')
      toast.success('Invitation accepted. Your promoter access is active.')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to accept invitation.') } finally { setBusyProgram(null) }
  }

  return <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-cyan-300">Promoter Network</p><h1 className="mt-1 text-3xl font-semibold text-slate-100">Promote live events</h1><p className="mt-2 text-slate-400">Discover open event programs, review their terms, and apply from your Tourify account.</p></div><Button asChild variant="outline"><Link href="/promoter/earnings">View earnings</Link></Button></div>{loading ? <Card><CardContent className="py-12 text-center text-slate-400">Loading opportunities…</CardContent></Card> : null}{!loading && opportunities.length === 0 ? <Card><CardContent className="py-12 text-center text-slate-400">There are no open promoter programs right now.</CardContent></Card> : null}<div className="grid gap-5 md:grid-cols-2">{opportunities.map((opportunity) => <Card key={opportunity.id} className="border-slate-800 bg-slate-950/55"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-slate-100"><Megaphone className="h-5 w-5 text-cyan-300" />{opportunity.events_v2?.title || 'Event promotion'}</CardTitle><CardDescription>{opportunity.events_v2?.start_at ? new Date(opportunity.events_v2.start_at).toLocaleString() : 'Event date to be announced'}</CardDescription></div>{opportunity.membership?.status === 'approved' ? <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-100">Approved</Badge> : null}</div></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3"><p className="font-medium text-cyan-100">Earn {commissionLabel(opportunity)}</p><p className="mt-1 text-sm text-slate-300">{opportunity.attribution_window_days}-day attribution window · {opportunity.application_mode.replaceAll('_', ' ')}</p></div>{opportunity.terms_markdown ? <p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-300">{opportunity.terms_markdown}</p> : null}{opportunity.membership ? <div className="flex items-center gap-2 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4" />Your membership is {opportunity.membership.status}.</div> : opportunity.application?.status === 'invited' ? <Button disabled={busyProgram === opportunity.id} onClick={() => void acceptInvitation(opportunity)}><CheckCircle2 className="mr-2 h-4 w-4" />Accept invitation</Button> : opportunity.application ? <p className="text-sm text-slate-300">Your application is {opportunity.application.status}.</p> : <div className="space-y-3"><Textarea value={messageByProgram[opportunity.id] || ''} onChange={(event) => setMessageByProgram((current) => ({ ...current, [opportunity.id]: event.target.value }))} placeholder="Optional note about your audience or promotion plan" /><Button disabled={busyProgram === opportunity.id} onClick={() => void apply(opportunity)}><Send className="mr-2 h-4 w-4" />Apply to promote</Button></div>}</CardContent></Card>)}</div></main>
}
