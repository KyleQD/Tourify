"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface Guest {
  id: string
  user_id?: string
  full_name?: string
  contact_email?: string
  contact_phone?: string
  guests_count: number
  status: "invited" | "confirmed" | "declined" | "checked_in"
  invite_code?: string
  notes?: string
  checked_in_at?: string | null
}

interface Props {
  eventIdOrSlug: string
}

export function GuestlistManager({ eventIdOrSlug }: Props) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState<Partial<Guest>>({ guests_count: 1, status: "invited" })
  const [counts, setCounts] = useState({ attending: 0, interested: 0, not_going: 0 })

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...(input?.headers || {}),
      },
    }
  }

  async function loadGuests() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/events/${eventIdOrSlug}/guestlist`, buildNoStoreInit())
      const json = await res.json()
      setGuests(json.guests || [])
    } catch (e) {
      console.error('Failed to load guests', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadGuests() }, [eventIdOrSlug])
  useEffect(() => { (async () => {
    try {
      const res = await fetch(`/api/events/${eventIdOrSlug}/attendance`, buildNoStoreInit())
      const json = await res.json()
      setCounts(json.counts || { attending: 0, interested: 0, not_going: 0 })
    } catch {}
  })() }, [eventIdOrSlug])

  async function addGuest() {
    try {
      const res = await fetch(`/api/events/${eventIdOrSlug}/guestlist`, buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify(form)
      }))
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add guest')
      toast.success('Guest added')
      setForm({ guests_count: 1, status: 'invited' })
      loadGuests()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add guest')
    }
  }

  async function updateGuest(guest: Guest, updates: Partial<Guest>) {
    try {
      const res = await fetch(`/api/events/${eventIdOrSlug}/guestlist`, buildNoStoreInit({
        method: 'PATCH',
        body: JSON.stringify({ id: guest.id, ...updates })
      }))
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update guest')
      toast.success('Guest updated')
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, ...updates } as Guest : g))
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update guest')
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-white">Guestlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="text-gray-400 text-sm">Attending</div>
            <div className="text-white text-2xl font-semibold">{counts.attending}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="text-gray-400 text-sm">Interested</div>
            <div className="text-white text-2xl font-semibold">{counts.interested}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="text-gray-400 text-sm">Not Going</div>
            <div className="text-white text-2xl font-semibold">{counts.not_going}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Full Name</Label>
            <Input value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Email</Label>
            <Input value={form.contact_email || ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Phone</Label>
            <Input value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Guests</Label>
            <Input type="number" min={1} value={form.guests_count || 1} onChange={e => setForm(f => ({ ...f, guests_count: parseInt(e.target.value || '1', 10) }))} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Guest['status'] }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Notes</Label>
            <Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button onClick={addGuest} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              Add Guest
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {guests.length === 0 && (
            <div className="text-gray-400">No guests yet.</div>
          )}
          {guests.map(g => (
            <div key={g.id} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-white font-medium">{g.full_name || 'Guest'}</div>
                <div className="text-gray-400 text-sm">{g.contact_email || ''} {g.contact_phone ? `• ${g.contact_phone}` : ''}</div>
                <div className="text-gray-500 text-sm">Guests: {g.guests_count} • Status: {g.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-slate-700 text-gray-300 hover:text-white" onClick={() => updateGuest(g, { status: 'confirmed' })}>Confirm</Button>
                <Button size="sm" variant="outline" className="border-slate-700 text-gray-300 hover:text-white" onClick={() => updateGuest(g, { status: 'checked_in', checked_in_at: new Date().toISOString() })}>Check In</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


