'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Utensils, Plus } from 'lucide-react'
import { LogisticsDynamicManager } from '@/components/admin/logistics-dynamic-manager'

interface CateringOpsPanelProps {
  eventId?: string
  tourId?: string
  siteMapId?: string | null
}

export function CateringOpsPanel({ eventId, tourId, siteMapId }: CateringOpsPanelProps) {
  const [services, setServices] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    service_type: 'lunch',
    window_start: '',
    window_end: '',
    location_label: '',
    headcount_manual: '0',
    menu: '',
    allergy_labels: '',
    freeze_headcount: true,
  })

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (eventId) params.set('eventId', eventId)
    if (tourId) params.set('tourId', tourId)
    const res = await fetch(`/api/admin/logistics/catering?${params}`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to load catering')
      return
    }
    setServices(data.services || [])
    if (data.needsMigration) setError('Apply logistics foundation migration for catering tables')
  }, [eventId, tourId])

  useEffect(() => {
    load()
  }, [load])

  async function createService() {
    setError(null)
    const allergies = form.allergy_labels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((allergy) => ({ allergy }))

    const res = await fetch('/api/admin/logistics/catering', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        service_type: form.service_type,
        window_start: form.window_start || null,
        window_end: form.window_end || null,
        location_label: form.location_label || null,
        headcount_manual: Number(form.headcount_manual) || 0,
        menu: form.menu || null,
        event_id: eventId || null,
        tour_id: tourId || null,
        site_map_id: siteMapId || null,
        freeze_headcount: form.freeze_headcount,
        dietary_records: allergies,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Failed to create service')
      return
    }
    setForm({
      title: '',
      service_type: 'lunch',
      window_start: '',
      window_end: '',
      location_label: '',
      headcount_manual: '0',
      menu: '',
      allergy_labels: '',
      freeze_headcount: true,
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Utensils className="h-5 w-5" /> Catering services
        </h3>
        <p className="text-sm text-slate-400">Service periods, frozen headcount, and kitchen-safe dietary counts</p>
      </div>

      {error && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{error}</div>}

      <div className="rounded-xl border border-slate-700/50 p-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Crew lunch" />
        </div>
        <div className="space-y-2">
          <Label>Service type</Label>
          <Input value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Window start</Label>
          <Input type="datetime-local" value={form.window_start} onChange={(e) => setForm((f) => ({ ...f, window_start: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Window end</Label>
          <Input type="datetime-local" value={form.window_end} onChange={(e) => setForm((f) => ({ ...f, window_end: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Location / zone</Label>
          <Input value={form.location_label} onChange={(e) => setForm((f) => ({ ...f, location_label: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Headcount</Label>
          <Input value={form.headcount_manual} onChange={(e) => setForm((f) => ({ ...f, headcount_manual: e.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Menu</Label>
          <Textarea value={form.menu} onChange={(e) => setForm((f) => ({ ...f, menu: e.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Allergy labels (comma-separated, aggregated only)</Label>
          <Input
            value={form.allergy_labels}
            onChange={(e) => setForm((f) => ({ ...f, allergy_labels: e.target.value }))}
            placeholder="peanuts, gluten"
          />
        </div>
        <div className="md:col-span-2">
          <Button onClick={createService}><Plus className="h-4 w-4 mr-2" />Create service</Button>
        </div>
      </div>

      <div className="space-y-2">
        {services.map((service) => {
          const summary = service.catering_dietary_summaries?.[0]
          const snapshot = service.catering_headcount_snapshots?.[0]
          return (
            <div key={service.id} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{service.title}</span>
                <Badge variant="outline">{service.status}</Badge>
              </div>
              <div className="text-slate-400">
                {service.service_type} · headcount {snapshot?.headcount ?? service.headcount_manual ?? 0}
                {snapshot?.is_frozen ? ' (frozen)' : ''}
              </div>
              {summary && (
                <div className="text-slate-400">
                  Kitchen allergies: {Object.keys(summary.allergy_counts || {}).join(', ') || 'none'} ·
                  preferences: {Object.keys(summary.preference_counts || {}).join(', ') || 'none'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <LogisticsDynamicManager
        eventId={eventId}
        tourId={tourId}
        type="catering"
        enableEditing
        autoSave
        showFilters
      />
    </div>
  )
}
