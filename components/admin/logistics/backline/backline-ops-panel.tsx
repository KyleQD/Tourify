'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Zap, Plus } from 'lucide-react'
import { LogisticsDynamicManager } from '@/components/admin/logistics-dynamic-manager'
import { useRentalAgreements, useRentalAnalytics, useEquipmentUtilization } from '@/hooks/use-rentals'
import { formatSafeCurrency } from '@/lib/format/number-format'

interface BacklineOpsPanelProps {
  eventId?: string
  tourId?: string
}

export function BacklineOpsPanel({ eventId, tourId }: BacklineOpsPanelProps) {
  const [requirements, setRequirements] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    gear_type: '',
    requested_make_model: '',
    quantity: '1',
    requires_artist_approval: false,
    rider_version: 'v1',
  })

  const { agreements: rentalAgreements } = useRentalAgreements({
    event_id: eventId,
    tour_id: tourId,
    limit: 10,
  })
  const { analytics: rentalAnalytics } = useRentalAnalytics({
    event_id: eventId,
    tour_id: tourId,
  })
  const { utilization } = useEquipmentUtilization()

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (eventId) params.set('eventId', eventId)
    if (tourId) params.set('tourId', tourId)
    const res = await fetch(`/api/admin/logistics/backline?${params}`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to load backline')
      return
    }
    setRequirements(data.requirements || [])
    setConflicts(data.conflicts || [])
    if (data.needsMigration) setError('Apply logistics foundation migration for backline domain tables')
  }, [eventId, tourId])

  useEffect(() => {
    load()
  }, [load])

  async function createRequirement() {
    setError(null)
    const res = await fetch('/api/admin/logistics/backline', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity) || 1,
        event_id: eventId || null,
        tour_id: tourId || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Failed to create requirement')
      return
    }
    setForm({
      gear_type: '',
      requested_make_model: '',
      quantity: '1',
      requires_artist_approval: false,
      rider_version: 'v1',
    })
    await load()
  }

  async function fulfill(requirementId: string) {
    const sourceType = window.prompt('Fulfillment source (organization|venue|artist|vendor|rental)', 'organization')
    if (!sourceType) return
    const res = await fetch('/api/admin/logistics/backline', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fulfill',
        requirement_id: requirementId,
        source_type: sourceType,
        quantity: 1,
      }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Failed to fulfill')
    else await load()
  }

  async function proposeSubstitution(requirementId: string) {
    const proposed = window.prompt('Proposed substitute make/model')
    if (!proposed) return
    const res = await fetch('/api/admin/logistics/backline', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'substitute',
        requirement_id: requirementId,
        proposed_make_model: proposed,
        decision: 'pending',
      }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Failed to propose substitution')
    else await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="h-5 w-5" /> Backline requirements
        </h3>
        <p className="text-sm text-slate-400">Artist performance needs, fulfillment, and substitutions (separate from Equipment inventory)</p>
      </div>

      {error && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{error}</div>}
      {conflicts.length > 0 && (
        <div className="text-sm text-amber-100">{conflicts.length} unfulfilled requirement(s)</div>
      )}

      <div className="rounded-xl border border-slate-700/50 p-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Gear type</Label>
          <Input value={form.gear_type} onChange={(e) => setForm((f) => ({ ...f, gear_type: e.target.value }))} placeholder="Guitar amp" />
        </div>
        <div className="space-y-2">
          <Label>Requested make/model</Label>
          <Input value={form.requested_make_model} onChange={(e) => setForm((f) => ({ ...f, requested_make_model: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Rider version</Label>
          <Input value={form.rider_version} onChange={(e) => setForm((f) => ({ ...f, rider_version: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={createRequirement}><Plus className="h-4 w-4 mr-2" />Add requirement</Button>
        </div>
      </div>

      <div className="space-y-2">
        {requirements.map((req) => (
          <div key={req.id} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 space-y-2">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{req.gear_type} · {req.requested_make_model || 'any'}</span>
              <Badge variant="outline">{req.status}</Badge>
            </div>
            <div className="text-slate-400">qty {req.quantity} · rider {req.rider_version || 'n/a'} · fulfillments {req.backline_fulfillments?.length || 0}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fulfill(req.id)}>Fulfill</Button>
              <Button size="sm" variant="outline" onClick={() => proposeSubstitution(req.id)}>Propose substitute</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700/50 p-3">
          <div className="text-xs text-slate-400">Active rentals</div>
          <div className="text-xl text-white">{rentalAgreements?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-slate-700/50 p-3">
          <div className="text-xs text-slate-400">Rental revenue</div>
          <div className="text-xl text-white">{formatSafeCurrency(rentalAnalytics?.[0]?.total_revenue || 0)}</div>
        </div>
        <div className="rounded-lg border border-slate-700/50 p-3">
          <div className="text-xs text-slate-400">Utilization samples</div>
          <div className="text-xl text-white">{utilization?.length || 0}</div>
        </div>
      </div>

      <LogisticsDynamicManager
        eventId={eventId}
        tourId={tourId}
        type="backline"
        enableEditing
        autoSave
        showFilters
      />
    </div>
  )
}
