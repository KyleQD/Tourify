"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Printer, Download, Send, Clock, MapPin, Utensils, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OpsWorkspaceChrome } from "@/components/admin/operations/ops-workspace-chrome"
import { toast } from "sonner"

interface DaySheet {
  event_id?: string
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_phone?: string
  parking_notes?: string
  load_in_time?: string
  production_advance_time?: string
  sound_check_time?: string
  doors_open_time?: string
  support_set_time?: string
  headliner_set_time?: string
  curfew_time?: string
  catering_location?: string
  catering_notes?: string
  general_notes?: string
  distributed_at?: string
  recipients?: string[]
  version?: number
  site_map_id?: string | null
}

interface DaySheetReceipt {
  id: string
  recipient_email?: string
  recipient_user_id?: string
  version: number
  status: string
  sent_at: string
  acknowledged_at?: string
}

interface SiteMapOption {
  id: string
  name: string
}

const SCHEDULE_ITEMS = [
  { key: 'load_in_time', label: 'Load In' },
  { key: 'production_advance_time', label: 'Production Advance' },
  { key: 'sound_check_time', label: 'Sound Check' },
  { key: 'doors_open_time', label: 'Doors Open' },
  { key: 'support_set_time', label: 'Support Act' },
  { key: 'headliner_set_time', label: 'Headliner Set' },
  { key: 'curfew_time', label: 'Curfew' },
] as const

export default function DaySheetPage() {
  const params = useParams()
  const eventId = params.id as string

  const [ds, setDs] = useState<DaySheet>({})
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDistributeDialog, setShowDistributeDialog] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [distributing, setDistributing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [receipts, setReceipts] = useState<DaySheetReceipt[]>([])
  const [siteMaps, setSiteMaps] = useState<SiteMapOption[]>([])
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [dsRes, evRes] = await Promise.allSettled([
        fetch(`/api/admin/events/${eventId}/day-sheet`, { credentials: 'include' }),
        fetch(`/api/admin/events/${eventId}`, { credentials: 'include' }),
      ])
      const siteMapsRes = await fetch(`/api/admin/logistics/site-maps?eventId=${eventId}`, { credentials: 'include' }).catch(() => null)
      if (dsRes.status === 'fulfilled' && dsRes.value.ok) {
        const d = await dsRes.value.json()
        setDs(d.day_sheet || {})
        setReceipts(d.receipts || [])
      }
      if (evRes.status === 'fulfilled' && evRes.value.ok) {
        const d = await evRes.value.json()
        const ev = d.event
        setEventTitle(ev?.name || ev?.title || '')
        setEventDate(ev?.event_date || ev?.start_at || '')
      }
      if (siteMapsRes?.ok) {
        const d = await siteMapsRes.json()
        setSiteMaps(d.data || d.siteMaps || [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchData() }, [fetchData])

  function update(field: keyof DaySheet, value: string) {
    setDs((prev) => ({ ...prev, [field]: value }))
    // Auto-save debounce
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => void autoSave({ ...ds, [field]: value }), 600)
  }

  async function autoSave(data: DaySheet) {
    await fetch(`/api/admin/events/${eventId}/day-sheet`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/day-sheet`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ds),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Day sheet saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function distribute() {
    const emails = recipientInput.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (emails.length === 0) { toast.error('Enter at least one valid email'); return }
    setDistributing(true)
    try {
      await save()
      const res = await fetch(`/api/admin/events/${eventId}/day-sheet/distribute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: emails }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`Day sheet distributed to ${emails.length} recipient(s)`)
      setShowDistributeDialog(false)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to distribute')
    } finally {
      setDistributing(false)
    }
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
          publication_type: 'day_sheet',
          title: eventTitle ? `Day Sheet: ${eventTitle}` : 'Day Sheet',
          payload: { version: ds.version || 1, day_sheet: ds },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Day sheet published to Work Mode')
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const dateLabel = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const inputCls = "bg-slate-800/50 border-slate-700/50 text-white text-sm h-8 w-28"

  return (
    <OpsWorkspaceChrome
      eventId={eventId}
      title="Day sheet"
      description={eventTitle ? `Run-of-show sheet for ${eventTitle}` : "Generate, distribute, and track acknowledgements"}
      badge={dateLabel || undefined}
      actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={() => setShowDistributeDialog(true)}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Distribute
              </Button>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={publishToWorkMode} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish to Work Mode'}
              </Button>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
      }
    >
    <div className="space-y-6 max-w-4xl">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; color: black; } .print-card { border: 1px solid #e5e7eb !important; background: white !important; } }`}</style>

      {/* Day Sheet — print-friendly two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-card">
        {/* Left: Schedule */}
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm print-card">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <div>
                <h2 className="text-white font-bold">{eventTitle}</h2>
                <p className="text-slate-400 text-xs">{dateLabel}</p>
              </div>
            </div>
          </div>
          <CardContent className="pt-4 space-y-2">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider mb-3">Schedule</p>
            {SCHEDULE_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label className="text-slate-300 text-sm w-36 shrink-0">{label}</Label>
                <Input
                  type="time"
                  value={(ds as any)[key] || ''}
                  onChange={e => update(key, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: Venue + Catering + Notes */}
        <div className="space-y-4">
          <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm print-card">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-purple-400" />
                <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Venue</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Venue Name</Label>
                <Input value={ds.venue_name || ''} onChange={e => update('venue_name', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Address</Label>
                <Input value={ds.venue_address || ''} onChange={e => update('venue_address', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Phone</Label>
                <Input value={ds.venue_phone || ''} onChange={e => update('venue_phone', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Parking Notes</Label>
                <Input value={ds.parking_notes || ''} onChange={e => update('parking_notes', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm print-card">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-4 w-4 text-purple-400" />
                <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Catering</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Location</Label>
                <Input value={ds.catering_location || ''} onChange={e => update('catering_location', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Notes</Label>
                <Textarea value={ds.catering_notes || ''} onChange={e => update('catering_notes', e.target.value)} className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[60px]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm print-card">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-xs uppercase font-medium tracking-wider mb-2">General Notes</p>
              <Textarea value={ds.general_notes || ''} onChange={e => update('general_notes', e.target.value)} placeholder="Show-day notes for the crew..." className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[80px]" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm print-card">
            <CardContent className="pt-4 space-y-2">
              <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Attached Site Map</p>
              <Select value={ds.site_map_id || 'none'} onValueChange={value => update('site_map_id', value === 'none' ? '' : value)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm">
                  <SelectValue placeholder="Choose site map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site map</SelectItem>
                  {siteMaps.map(siteMap => (
                    <SelectItem key={siteMap.id} value={siteMap.id}>{siteMap.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ds.site_map_id ? (
                <Link href={`/admin/dashboard/logistics?tab=site-maps&siteMapId=${ds.site_map_id}`} className="text-xs text-purple-300 hover:text-purple-200">
                  Open attached site map
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm no-print">
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-slate-300 text-sm font-medium">Distribution Log</p>
            <p className="text-xs text-slate-500">Version {ds.version || 1}</p>
          </div>
          {receipts.length === 0 ? (
            <p className="text-sm text-slate-500">No distribution receipts yet.</p>
          ) : (
            <div className="space-y-2">
              {receipts.slice(0, 8).map(receipt => (
                <div key={receipt.id} className="flex items-center justify-between rounded border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm">
                  <span className="text-slate-300">{receipt.recipient_email || receipt.recipient_user_id}</span>
                  <span className="text-slate-400">
                    v{receipt.version} · {receipt.status}
                    {receipt.acknowledged_at ? ` · ${new Date(receipt.acknowledged_at).toLocaleString()}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribute Dialog */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Distribute Day Sheet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Enter email addresses separated by commas or line breaks.</p>
            <Textarea
              value={recipientInput}
              onChange={e => setRecipientInput(e.target.value)}
              placeholder="crew@band.com, tour.manager@agency.com..."
              className="bg-slate-800/50 border-slate-700/50 text-white min-h-[100px] text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={distribute} disabled={distributing} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Send className="h-4 w-4 mr-2" />
              {distributing ? 'Sending...' : 'Distribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </OpsWorkspaceChrome>
  )
}
