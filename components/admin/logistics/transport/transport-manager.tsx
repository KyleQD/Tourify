'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Truck, AlertTriangle, Plus, RefreshCw } from 'lucide-react'
import { formatInTimeZone } from '@/lib/logistics/time'
import { formatLogisticsMoney } from '@/lib/logistics/money'
import { mapToOperationalStatus } from '@/lib/logistics/status'

interface TransportManagerProps {
  eventId?: string
  tourId?: string
}

interface TransportSegment {
  id: string
  transport_type: string
  pickup_location: string
  dropoff_location: string
  pickup_time: string
  estimated_dropoff_time: string
  driver_name?: string | null
  vehicle_capacity?: number | null
  assigned_passengers?: number | null
  status?: string
  total_cost?: number | null
  timezone?: string | null
}

interface LogisticsConflict {
  id: string
  severity: string
  message: string
}

export function TransportManager({ eventId, tourId }: TransportManagerProps) {
  const [segments, setSegments] = useState<TransportSegment[]>([])
  const [conflicts, setConflicts] = useState<LogisticsConflict[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    transport_type: 'van',
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    estimated_dropoff_time: '',
    driver_name: '',
    vehicle_capacity: '8',
    total_cost: '',
    cargo_notes: '',
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (eventId) params.set('eventId', eventId)
      if (tourId) params.set('tourId', tourId)
      const res = await fetch(`/api/admin/logistics/transport?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load transport')
      setSegments(data.segments || [])
      setConflicts(data.conflicts || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load transport')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, tourId])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    if (!form.pickup_location || !form.dropoff_location || !form.pickup_time || !form.estimated_dropoff_time) {
      setError('Pickup, dropoff, and times are required')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/logistics/transport', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          event_id: eventId || null,
          tour_id: tourId || null,
          vehicle_capacity: form.vehicle_capacity ? Number(form.vehicle_capacity) : null,
          total_cost: form.total_cost ? Number(form.total_cost) : null,
          create_task: true,
          notify: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to create segment')
      setForm({
        transport_type: 'van',
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        estimated_dropoff_time: '',
        driver_name: '',
        vehicle_capacity: '8',
        total_cost: '',
        cargo_notes: '',
      })
      await load()
    } catch (err: any) {
      setError(err.message || 'Failed to create segment')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck className="h-5 w-5" /> Transport segments
          </h3>
          <p className="text-sm text-slate-400">Ground movements with capacity checks and linked tasks</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
          {conflicts.slice(0, 6).map((conflict) => (
            <div key={conflict.id} className="flex items-start gap-2 text-sm text-amber-100">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{conflict.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={form.transport_type} onValueChange={(v) => setForm((f) => ({ ...f, transport_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['van', 'car', 'shuttle_bus', 'limo', 'truck', 'train', 'rideshare'].map((mode) => (
                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Driver</Label>
          <Input value={form.driver_name} onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Pickup</Label>
          <Input value={form.pickup_location} onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Dropoff</Label>
          <Input value={form.dropoff_location} onChange={(e) => setForm((f) => ({ ...f, dropoff_location: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Pickup time</Label>
          <Input type="datetime-local" value={form.pickup_time} onChange={(e) => setForm((f) => ({ ...f, pickup_time: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Dropoff target</Label>
          <Input type="datetime-local" value={form.estimated_dropoff_time} onChange={(e) => setForm((f) => ({ ...f, estimated_dropoff_time: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input value={form.vehicle_capacity} onChange={(e) => setForm((f) => ({ ...f, vehicle_capacity: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Projected cost (USD)</Label>
          <Input value={form.total_cost} onChange={(e) => setForm((f) => ({ ...f, total_cost: e.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Cargo / ops notes</Label>
          <Textarea value={form.cargo_notes} onChange={(e) => setForm((f) => ({ ...f, cargo_notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={handleCreate} disabled={isSaving}>
            <Plus className="h-4 w-4 mr-2" />
            {isSaving ? 'Creating…' : 'Create segment'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading segments…</p>}
        {!isLoading && segments.length === 0 && (
          <p className="text-sm text-slate-400">No transport segments in this scope yet.</p>
        )}
        {segments.map((segment) => {
          const status = mapToOperationalStatus(segment.status)
          return (
            <div key={segment.id} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-white">
                  {segment.pickup_location} → {segment.dropoff_location}
                </div>
                <Badge variant="outline">{status}</Badge>
              </div>
              <div className="mt-2 text-sm text-slate-300 space-y-1">
                <div>{formatInTimeZone(segment.pickup_time, segment.timezone || 'UTC')} · {segment.transport_type}</div>
                <div>
                  Driver: {segment.driver_name || 'Unassigned'} · Pax {segment.assigned_passengers || 0}
                  {segment.vehicle_capacity != null ? ` / ${segment.vehicle_capacity}` : ''}
                </div>
                {segment.total_cost != null && <div>Cost: {formatLogisticsMoney(segment.total_cost)}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
