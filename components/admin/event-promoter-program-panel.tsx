"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Megaphone, Pause, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useActingContext } from '@/hooks/use-acting-context'

type ProgramStatus = 'draft' | 'scheduled' | 'open' | 'paused' | 'closed' | 'cancelled'
type CommissionType = 'percentage' | 'fixed_per_ticket'

interface TicketType {
  id: string
  name: string
  price: number | null
  is_active: boolean | null
  category: string | null
}

interface Eligibility {
  ticket_type_id: string
  commission_type_override?: CommissionType | null
  commission_rate_bps_override?: number | null
  commission_fixed_amount_minor_override?: number | null
}

interface Program {
  id: string
  status: ProgramStatus
  application_mode: 'open' | 'approval_required' | 'invite_only'
  commission_type: CommissionType
  commission_rate_bps: number | null
  commission_fixed_amount_minor: number | null
  currency: string
  attribution_window_days: number
  starts_at: string | null
  ends_at: string | null
  promoter_cap: number | null
  allow_promo_codes: boolean
  allow_native_post_attribution: boolean
  allow_external_links: boolean
  terms_markdown: string | null
  eligible_ticket_types: Eligibility[]
  current_version_number: number
}

interface ProgramData {
  program: Program | null
  ticketTypes: TicketType[]
  auditEvents: Array<{ id: string; action: string; created_at: string }>
}

interface ProgramForm {
  application_mode: Program['application_mode']
  commission_type: CommissionType
  commission_rate_bps: number | null
  commission_fixed_amount_minor: number | null
  currency: string
  attribution_window_days: number
  starts_at: string
  ends_at: string
  promoter_cap: string
  allow_promo_codes: boolean
  allow_native_post_attribution: boolean
  allow_external_links: boolean
  terms_markdown: string
  eligible_ticket_types: Eligibility[]
}

const EMPTY_FORM: ProgramForm = {
  application_mode: 'approval_required',
  commission_type: 'percentage',
  commission_rate_bps: 1_000,
  commission_fixed_amount_minor: null,
  currency: 'usd',
  attribution_window_days: 30,
  starts_at: '',
  ends_at: '',
  promoter_cap: '',
  allow_promo_codes: false,
  allow_native_post_attribution: true,
  allow_external_links: true,
  terms_markdown: '',
  eligible_ticket_types: [],
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function formFromProgram(program: Program | null): ProgramForm {
  if (!program) return { ...EMPTY_FORM }
  return {
    application_mode: program.application_mode,
    commission_type: program.commission_type,
    commission_rate_bps: program.commission_rate_bps,
    commission_fixed_amount_minor: program.commission_fixed_amount_minor,
    currency: program.currency,
    attribution_window_days: program.attribution_window_days,
    starts_at: toDateTimeLocal(program.starts_at),
    ends_at: toDateTimeLocal(program.ends_at),
    promoter_cap: program.promoter_cap?.toString() || '',
    allow_promo_codes: program.allow_promo_codes,
    allow_native_post_attribution: program.allow_native_post_attribution,
    allow_external_links: program.allow_external_links,
    terms_markdown: program.terms_markdown || '',
    eligible_ticket_types: program.eligible_ticket_types,
  }
}

function apiPayload(form: ProgramForm, status: ProgramStatus) {
  return {
    status,
    application_mode: form.application_mode,
    commission_type: form.commission_type,
    commission_rate_bps: form.commission_type === 'percentage' ? form.commission_rate_bps : null,
    commission_fixed_amount_minor: form.commission_type === 'fixed_per_ticket' ? form.commission_fixed_amount_minor : null,
    currency: form.currency.toLowerCase(),
    attribution_window_days: Number(form.attribution_window_days),
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    promoter_cap: form.promoter_cap ? Number(form.promoter_cap) : null,
    allow_promo_codes: form.allow_promo_codes,
    allow_native_post_attribution: form.allow_native_post_attribution,
    allow_external_links: form.allow_external_links,
    terms_markdown: form.terms_markdown.trim() || null,
    eligible_ticket_types: form.eligible_ticket_types,
  }
}

function statusStyle(status: ProgramStatus) {
  return {
    draft: 'bg-slate-700/60 text-slate-200 border-slate-600',
    scheduled: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
    open: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    paused: 'bg-amber-500/15 text-amber-100 border-amber-400/30',
    closed: 'bg-slate-700/60 text-slate-300 border-slate-600',
    cancelled: 'bg-red-500/15 text-red-200 border-red-400/30',
  }[status]
}

export function EventPromoterProgramPanel({ eventId }: { eventId: string }) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [data, setData] = useState<ProgramData | null>(null)
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disabled, setDisabled] = useState(false)

  const selectedTicketIds = useMemo(
    () => new Set(form.eligible_ticket_types.map((ticket) => ticket.ticket_type_id)),
    [form.eligible_ticket_types],
  )

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/promoter-program`, {
        credentials: 'include',
        headers: actingHeaders,
      })
      if (response.status === 404) {
        setDisabled(true)
        setData(null)
        return
      }
      if (!response.ok) throw new Error('Unable to load promoter program settings.')
      const payload = await response.json()
      setDisabled(false)
      setData(payload.data)
      setForm(formFromProgram(payload.data.program))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load promoter program settings.')
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady])

  useEffect(() => { void load() }, [load])

  function setField<K extends keyof ProgramForm>(key: K, value: ProgramForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleTicket(ticketTypeId: string, selected: boolean) {
    setForm((current) => ({
      ...current,
      eligible_ticket_types: selected
        ? [...current.eligible_ticket_types, { ticket_type_id: ticketTypeId }]
        : current.eligible_ticket_types.filter((ticket) => ticket.ticket_type_id !== ticketTypeId),
    }))
  }

  async function save() {
    if (form.eligible_ticket_types.length === 0) {
      toast.error('Select at least one eligible ticket type.')
      return
    }
    if (form.commission_type === 'percentage' && form.commission_rate_bps == null) {
      toast.error('Enter a percentage commission rate.')
      return
    }
    if (form.commission_type === 'fixed_per_ticket' && form.commission_fixed_amount_minor == null) {
      toast.error('Enter a fixed commission amount in cents.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/promoter-program`, {
        method: data?.program ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify(apiPayload(form, data?.program?.status || 'draft')),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to save the promoter program.')
      setData(payload.data)
      setForm(formFromProgram(payload.data.program))
      toast.success(data?.program ? 'Promoter program saved.' : 'Promoter program draft created.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the promoter program.')
    } finally {
      setSaving(false)
    }
  }

  async function transition(action: 'publish' | 'pause') {
    if (!data?.program) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/promoter-program/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: actingHeaders,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to update program state.')
      setData(payload.data)
      setForm(formFromProgram(payload.data.program))
      toast.success(action === 'publish' ? 'Promoter program is open.' : 'Promoter program is paused.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update program state.')
    } finally {
      setSaving(false)
    }
  }

  if (!isActingReady || loading) {
    return <Card className="border-slate-800 bg-slate-950/50"><CardContent className="flex min-h-48 items-center justify-center text-sm text-slate-400">Loading promoter controls…</CardContent></Card>
  }

  if (disabled) {
    return <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="flex items-center gap-2 text-slate-100"><ShieldCheck className="h-5 w-5 text-slate-400" />Promoter Network</CardTitle><CardDescription>Program controls are staged behind the Event Promoter rollout flag for this organization.</CardDescription></CardHeader></Card>
  }

  const program = data?.program
  return (
    <div className="space-y-6">
      <Card className="border-cyan-400/20 bg-slate-950/55">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Megaphone className="h-5 w-5 text-cyan-300" />Promoter program</CardTitle>
            <CardDescription>Set future-facing promoter terms for this event. Commission changes create a new version; past sales are never rewritten.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {program ? <Badge className={statusStyle(program.status)}>{program.status}</Badge> : <Badge className="bg-slate-700/60 text-slate-200 border-slate-600">Not configured</Badge>}
            {program ? <Badge variant="outline" className="border-slate-600 text-slate-300">Version {program.current_version_number}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>Application access</Label><Select value={form.application_mode} onValueChange={(value) => setField('application_mode', value as Program['application_mode'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approval_required">Approval required</SelectItem><SelectItem value="open">Open enrollment</SelectItem><SelectItem value="invite_only">Invite only</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Commission model</Label><Select value={form.commission_type} onValueChange={(value) => setForm((current) => ({ ...current, commission_type: value as CommissionType, commission_rate_bps: value === 'percentage' ? (current.commission_rate_bps ?? 1_000) : null, commission_fixed_amount_minor: value === 'fixed_per_ticket' ? (current.commission_fixed_amount_minor ?? 0) : null }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage of eligible ticket revenue</SelectItem><SelectItem value="fixed_per_ticket">Fixed amount per ticket</SelectItem></SelectContent></Select></div>
            {form.commission_type === 'percentage' ? <div className="space-y-2"><Label>Commission rate (%)</Label><Input type="number" min="0" max="100" step="0.01" value={form.commission_rate_bps == null ? '' : (form.commission_rate_bps / 100).toString()} onChange={(event) => setField('commission_rate_bps', event.target.value === '' ? null : Math.round(Number(event.target.value) * 100))} /></div> : <div className="space-y-2"><Label>Commission per ticket (cents)</Label><Input type="number" min="0" step="1" value={form.commission_fixed_amount_minor ?? ''} onChange={(event) => setField('commission_fixed_amount_minor', event.target.value === '' ? null : Math.round(Number(event.target.value)))} /></div>}
            <div className="space-y-2"><Label>Attribution window (days)</Label><Input type="number" min="1" max="90" value={form.attribution_window_days} onChange={(event) => setField('attribution_window_days', Number(event.target.value))} /></div>
            <div className="space-y-2"><Label>Program starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(event) => setField('starts_at', event.target.value)} /></div>
            <div className="space-y-2"><Label>Program ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(event) => setField('ends_at', event.target.value)} /></div>
            <div className="space-y-2"><Label>Promoter cap (optional)</Label><Input type="number" min="1" value={form.promoter_cap} onChange={(event) => setField('promoter_cap', event.target.value)} /></div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-3">
            <Toggle label="Promoter promo codes" checked={form.allow_promo_codes} onChange={(checked) => setField('allow_promo_codes', checked)} />
            <Toggle label="Native post attribution" checked={form.allow_native_post_attribution} onChange={(checked) => setField('allow_native_post_attribution', checked)} />
            <Toggle label="External tracking links" checked={form.allow_external_links} onChange={(checked) => setField('allow_external_links', checked)} />
          </div>

          <div className="space-y-3"><div><Label>Eligible ticket types</Label><p className="mt-1 text-sm text-slate-400">Only these ticket types can generate promoter commission. Ticket-level overrides can be added in a later campaign edit.</p></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data?.ticketTypes.map((ticket) => <label key={ticket.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/35 px-3 py-3 text-sm"><Checkbox checked={selectedTicketIds.has(ticket.id)} onCheckedChange={(checked) => toggleTicket(ticket.id, checked === true)} /><span className="min-w-0 flex-1 truncate text-slate-100">{ticket.name}</span><span className="text-xs text-slate-400">{ticket.is_active === false ? 'paused' : 'active'}</span></label>)}{data?.ticketTypes.length === 0 ? <p className="text-sm text-amber-200">Create ticket types before configuring a promoter program.</p> : null}</div></div>

          <div className="space-y-2"><Label>Program terms</Label><Textarea value={form.terms_markdown} onChange={(event) => setField('terms_markdown', event.target.value)} placeholder="Add promoter requirements, brand guidelines, and any commission exclusions." className="min-h-32" /></div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-800 pt-5"><Button variant="outline" onClick={() => void load()} disabled={saving}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><div className="flex flex-wrap gap-2"><Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{program ? 'Save changes' : 'Create draft'}</Button>{program?.status === 'draft' || program?.status === 'scheduled' || program?.status === 'paused' ? <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => void transition('publish')} disabled={saving}><Send className="mr-2 h-4 w-4" />Open program</Button> : null}{program?.status === 'open' ? <Button variant="outline" className="border-amber-500/40 text-amber-100 hover:bg-amber-500/10" onClick={() => void transition('pause')} disabled={saving}><Pause className="mr-2 h-4 w-4" />Pause</Button> : null}</div></div>
        </CardContent>
      </Card>

      {data?.auditEvents?.length ? <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-100"><CalendarClock className="h-4 w-4 text-slate-400" />Configuration history</CardTitle><CardDescription>Every program and financial-term change is recorded.</CardDescription></CardHeader><CardContent className="space-y-2">{data.auditEvents.slice(0, 6).map((event) => <div key={event.id} className="flex items-center justify-between rounded-lg border border-slate-800/80 px-3 py-2 text-sm"><span className="capitalize text-slate-200">{event.action.replaceAll('_', ' ')}</span><span className="text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</span></div>)}</CardContent></Card> : null}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3"><Label className="text-sm text-slate-200">{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>
}
