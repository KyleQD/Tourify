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
import { AdminPageHeader } from "../../../components/admin-page-header"
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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [dsRes, evRes] = await Promise.allSettled([
        fetch(`/api/admin/events/${eventId}/day-sheet`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}`, { credentials: 'include' }),
      ])
      if (dsRes.status === 'fulfilled' && dsRes.value.ok) {
        const d = await dsRes.value.json()
        setDs(d.day_sheet || {})
      }
      if (evRes.status === 'fulfilled' && evRes.value.ok) {
        const d = await evRes.value.json()
        const ev = d.event
        setEventTitle(ev?.name || ev?.title || '')
        setEventDate(ev?.event_date || ev?.start_at || '')
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to distribute')
    } finally {
      setDistributing(false)
    }
  }

  const dateLabel = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const inputCls = "bg-slate-800/50 border-slate-700/50 text-white text-sm h-8 w-28"

  return (
    <div className="space-y-6 max-w-4xl">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; color: black; } .print-card { border: 1px solid #e5e7eb !important; background: white !important; } }`}</style>

      <div className="no-print">
        <AdminPageHeader
          title="Day Sheet"
          subtitle={eventTitle || `Event ${eventId.slice(0, 8)}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={() => setShowDistributeDialog(true)}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Distribute
              </Button>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 h-8" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 h-8" asChild>
                <Link href={`/admin/dashboard/events/${eventId}`}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            </div>
          }
        />
      </div>

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
        </div>
      </div>

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
  )
}
