"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Send, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { OpsWorkspaceChrome } from "@/components/admin/operations/ops-workspace-chrome"
import { featureUnavailableMessage, isFeatureUnavailableResponse } from "@/lib/api/feature-unavailable"
import { toast } from "sonner"

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  sent: { label: 'Sent to Venue', color: 'bg-blue-500/20 text-blue-400', icon: Send },
  confirmed: { label: 'Confirmed', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>}
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-xs uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  )
}

export default function AdvancingPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [adv, setAdv] = useState<any>({})
  const [eventTitle, setEventTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [advRes, eventDetail] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/advancing`, { credentials: 'include' }),
        fetch(`/api/admin/events/${eventId}`, { credentials: 'include' }),
      ])
      if (advRes.ok) {
        const d = await advRes.json()
        setAdv(d.advancing || {})
      }
      if (eventDetail.ok) {
        const d = await eventDetail.json()
        setEventTitle(d.event?.name || d.event?.title || '')
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchData() }, [fetchData])

  function update(field: string, value: any) {
    setAdv((prev: any) => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/advancing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adv),
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setAdv(d.advancing || adv)
      toast.success('Advancing document saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function markAsSent() {
    update('status', 'sent')
    await fetch(`/api/admin/events/${eventId}/advancing`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adv, status: 'sent' }),
    })
    toast.success('Marked as sent to venue')
  }

  async function generateShareLink() {
    const shareToken = adv.share_token || crypto.randomUUID()
    const nextAdv = { ...adv, share_token: shareToken }
    setAdv(nextAdv)
    await fetch(`/api/admin/events/${eventId}/advancing`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextAdv),
    })
    toast.success('Share link ready')
  }

  async function publishToWorkMode() {
    setPublishing(true)
    try {
      await save()
      const res = await fetch(`/api/admin/events/${eventId}/work-mode`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publication_type: 'advance',
          title: eventTitle ? `Advance: ${eventTitle}` : 'Event advance',
          payload: {
            status: adv.status || 'pending',
            share_token: adv.share_token || null,
            venue_contact_name: adv.venue_contact_name || null,
            venue_contact_email: adv.venue_contact_email || null,
          },
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        if (isFeatureUnavailableResponse(res.status, payload)) {
          toast.error(featureUnavailableMessage(payload, 'Work Mode is temporarily unavailable.'))
          return
        }
        throw new Error(payload?.error || 'Failed to publish')
      }
      toast.success('Advance published to Work Mode')
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const statusConf = STATUS_CONFIG[adv.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const StatusIcon = statusConf.icon

  const inputCls = "bg-slate-800/50 border-slate-700/50 text-white text-sm h-9"
  const textareaCls = "bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[80px]"

  return (
    <OpsWorkspaceChrome
      eventId={eventId}
      title="Advancing workspace"
      description={eventTitle ? `Venue advance for ${eventTitle}` : "Collect riders, contacts, and tech specs for this show"}
      badge={statusConf.label}
      actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusConf.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConf.label}
            </Badge>
            <Select value={adv.status || 'pending'} onValueChange={(v) => update('status', v)}>
              <SelectTrigger className="h-8 w-36 bg-slate-800/50 border-slate-700/50 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent to Venue</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={markAsSent}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Mark Sent
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={generateShareLink}>
              Share Link
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={publishToWorkMode} disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish to Work Mode'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 h-8"
              onClick={() => window.location.href = `/api/admin/events/${eventId}/advancing/export`}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">

      {/* Share link */}
      {adv.share_token && (
        <Card className="bg-slate-800/30 border-slate-700/30 rounded-sm">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-xs font-medium">Read-only share link (for venue)</p>
              <p className="text-slate-500 text-xs truncate max-w-sm">{typeof window !== 'undefined' ? `${window.location.origin}/advance/${adv.share_token}` : ''}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 h-7 text-xs"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}/advance/${adv.share_token}`)
                  toast.success('Link copied')
                }
              }}
            >
              Copy Link
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tech Rider */}
      <Section title="Tech Rider">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage Width (ft)">
            <Input type="number" value={adv.stage_width_ft || ''} onChange={e => update('stage_width_ft', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Stage Depth (ft)">
            <Input type="number" value={adv.stage_depth_ft || ''} onChange={e => update('stage_depth_ft', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Stage Height (ft)">
            <Input type="number" value={adv.stage_height_ft || ''} onChange={e => update('stage_height_ft', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Monitor Mixes">
            <Input type="number" value={adv.monitor_mixes_count || ''} onChange={e => update('monitor_mixes_count', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Sound System">
            <Input value={adv.sound_system_type || ''} onChange={e => update('sound_system_type', e.target.value)} placeholder="e.g. L-Acoustics K2" className={inputCls} />
          </Field>
          <Field label="Monitor Type">
            <Input value={adv.monitor_type || ''} onChange={e => update('monitor_type', e.target.value)} placeholder="e.g. In-ear" className={inputCls} />
          </Field>
          <Field label="FOH Console">
            <Input value={adv.foh_console || ''} onChange={e => update('foh_console', e.target.value)} placeholder="e.g. Avid SC48" className={inputCls} />
          </Field>
          <Field label="Monitor Console">
            <Input value={adv.mon_console || ''} onChange={e => update('mon_console', e.target.value)} placeholder="e.g. Yamaha PM5D" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-3">
            <Switch checked={adv.backline_provided || false} onCheckedChange={v => update('backline_provided', v)} />
            <Label className="text-slate-300 text-sm">Backline provided by venue</Label>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Backline Notes">
            <Textarea value={adv.backline_notes || ''} onChange={e => update('backline_notes', e.target.value)} className={textareaCls} placeholder="List specific backline requirements..." />
          </Field>
          <Field label="Power Requirements">
            <Textarea value={adv.power_requirements || ''} onChange={e => update('power_requirements', e.target.value)} className={textareaCls} placeholder="e.g. 100A 3-phase..." />
          </Field>
        </div>
      </Section>

      {/* Hospitality Rider */}
      <Section title="Hospitality Rider">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Dressing Rooms">
            <Input type="number" value={adv.dressing_rooms_count || ''} onChange={e => update('dressing_rooms_count', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Meals">
            <Input type="number" value={adv.meal_count || ''} onChange={e => update('meal_count', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Comps">
            <Input type="number" value={adv.comps_count || ''} onChange={e => update('comps_count', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Parking Passes">
            <Input type="number" value={adv.parking_passes_count || ''} onChange={e => update('parking_passes_count', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Towels">
            <Input type="number" value={adv.towels_count || ''} onChange={e => update('towels_count', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Dietary Restrictions (comma-separated)">
            <Input
              value={(adv.dietary_restrictions || []).join(', ')}
              onChange={e => update('dietary_restrictions', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder="Vegan, Gluten-free..."
              className={inputCls}
            />
          </Field>
          <Field label="Catering Notes">
            <Textarea value={adv.catering_notes || ''} onChange={e => update('catering_notes', e.target.value)} className={textareaCls} placeholder="Meal details, timing, allergies..." />
          </Field>
        </div>
      </Section>

      {/* Contacts */}
      <Section title="Contacts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Venue Contact</p>
            <Field label="Name"><Input value={adv.venue_contact_name || ''} onChange={e => update('venue_contact_name', e.target.value)} className={inputCls} /></Field>
            <Field label="Phone"><Input value={adv.venue_contact_phone || ''} onChange={e => update('venue_contact_phone', e.target.value)} className={inputCls} /></Field>
            <Field label="Email"><Input type="email" value={adv.venue_contact_email || ''} onChange={e => update('venue_contact_email', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="space-y-3">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Production Manager</p>
            <Field label="Name"><Input value={adv.production_manager_name || ''} onChange={e => update('production_manager_name', e.target.value)} className={inputCls} /></Field>
            <Field label="Phone"><Input value={adv.production_manager_phone || ''} onChange={e => update('production_manager_phone', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="space-y-3">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Local Promoter</p>
            <Field label="Name"><Input value={adv.local_promoter_name || ''} onChange={e => update('local_promoter_name', e.target.value)} className={inputCls} /></Field>
            <Field label="Phone"><Input value={adv.local_promoter_phone || ''} onChange={e => update('local_promoter_phone', e.target.value)} className={inputCls} /></Field>
          </div>
        </div>
      </Section>

      {/* Settlement */}
      <Section title="Settlement">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Deal Type">
            <Select value={adv.deal_type || ''} onValueChange={v => update('deal_type', v)}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="guarantee">Guarantee</SelectItem>
                <SelectItem value="vs_door">VS Door</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Guarantee Amount ($)">
            <Input type="number" value={adv.guarantee_amount || ''} onChange={e => update('guarantee_amount', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Door Percentage (%)">
            <Input type="number" value={adv.door_percentage || ''} onChange={e => update('door_percentage', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Estimated Expenses ($)">
            <Input type="number" value={adv.estimated_expenses || ''} onChange={e => update('estimated_expenses', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Settlement Contact">
            <Input value={adv.settlement_contact || ''} onChange={e => update('settlement_contact', e.target.value)} className={inputCls} />
          </Field>
          <div className="flex items-center gap-3 mt-5">
            <Switch checked={adv.vs_expenses || false} onCheckedChange={v => update('vs_expenses', v)} />
            <Label className="text-slate-300 text-sm">VS Expenses</Label>
          </div>
        </div>
      </Section>

      {/* Notes */}
      <Section title="General Notes" defaultOpen={false}>
        <Textarea value={adv.notes || ''} onChange={e => update('notes', e.target.value)} className={textareaCls} placeholder="Any additional notes for the venue or production..." />
      </Section>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" className="border-slate-700 text-slate-300" asChild>
          <Link href={`/admin/dashboard/events/${eventId}`}>Cancel</Link>
        </Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
          {saving ? 'Saving...' : 'Save Advancing Document'}
        </Button>
      </div>
      </div>
    </OpsWorkspaceChrome>
  )
}
