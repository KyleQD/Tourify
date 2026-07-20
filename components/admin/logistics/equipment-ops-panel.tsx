'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Box, Plus } from 'lucide-react'
import { LogisticsDynamicManager } from '@/components/admin/logistics-dynamic-manager'

interface EquipmentOpsPanelProps {
  eventId?: string
  tourId?: string
}

export function EquipmentOpsPanel({ eventId, tourId }: EquipmentOpsPanelProps) {
  const [catalog, setCatalog] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    equipment_asset_id: '',
    starts_at: '',
    ends_at: '',
    quantity: '1',
    notes: '',
  })

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (eventId) params.set('eventId', eventId)
      if (tourId) params.set('tourId', tourId)
      const [catalogRes, reservationRes] = await Promise.all([
        fetch('/api/admin/logistics/equipment/catalog', { credentials: 'include' }),
        fetch(`/api/admin/logistics/equipment/reservations?${params}`, { credentials: 'include' }),
      ])
      const catalogData = await catalogRes.json()
      const reservationData = await reservationRes.json()
      setCatalog(catalogData.equipment || catalogData.catalog || catalogData.data || [])
      setReservations(reservationData.reservations || [])
      if (reservationData.needsMigration) setError('Apply logistics foundation migration for reservations')
    } catch (err: any) {
      setError(err.message || 'Failed to load equipment')
    }
  }, [eventId, tourId])

  useEffect(() => {
    load()
  }, [load])

  async function createReservation() {
    setError(null)
    const res = await fetch('/api/admin/logistics/equipment/reservations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment_asset_id: form.equipment_asset_id || null,
        catalog_item_id: !form.equipment_asset_id && catalog[0]?.id ? catalog[0].id : null,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        quantity: Number(form.quantity) || 1,
        notes: form.notes,
        event_id: eventId || null,
        tour_id: tourId || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || data.conflicts?.[0]?.message || 'Failed to reserve')
      return
    }
    setForm({ equipment_asset_id: '', starts_at: '', ends_at: '', quantity: '1', notes: '' })
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Box className="h-5 w-5" /> Equipment
        </h3>
        <p className="text-sm text-slate-400">Catalog, reservations, and operational equipment tasks</p>
      </div>

      {error && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{error}</div>}

      <div className="rounded-xl border border-slate-700/50 p-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Asset / catalog id</Label>
          <Input
            placeholder="equipment_assets UUID (optional if catalog available)"
            value={form.equipment_asset_id}
            onChange={(e) => setForm((f) => ({ ...f, equipment_asset_id: e.target.value }))}
          />
          {catalog.length > 0 && (
            <p className="text-xs text-slate-400">{catalog.length} catalog items available as fallback</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Starts</Label>
          <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Ends</Label>
          <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={createReservation}><Plus className="h-4 w-4 mr-2" />Reserve</Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-200">Reservations</h4>
        {reservations.length === 0 && <p className="text-sm text-slate-400">No reservations in scope.</p>}
        {reservations.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 flex justify-between">
            <span>{row.starts_at} → {row.ends_at} · qty {row.quantity}</span>
            <Badge variant="outline">{row.status}</Badge>
          </div>
        ))}
      </div>

      <LogisticsDynamicManager
        eventId={eventId}
        tourId={tourId}
        type="equipment"
        enableEditing
        autoSave
        showFilters
      />
    </div>
  )
}
