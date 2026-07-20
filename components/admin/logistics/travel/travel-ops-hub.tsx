'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTravelCoordination } from '@/hooks/use-travel-coordination'
import { useLodging } from '@/hooks/use-lodging'
import { buildTravelerMatrix } from '@/lib/logistics/traveler-matrix'
import { Plane, Hotel, Users, AlertTriangle } from 'lucide-react'

interface TravelOpsHubProps {
  eventId?: string
  tourId?: string
}

export function TravelOpsHub({ eventId, tourId }: TravelOpsHubProps) {
  const travel = useTravelCoordination({
    event_id: eventId,
    tour_id: tourId,
  })
  const lodging = useLodging({
    event_id: eventId,
    tour_id: tourId,
    fetchOnMount: ['bookings', 'providers', 'room_types'],
  })

  const [flightForm, setFlightForm] = useState({
    flight_number: '',
    airline: '',
    departure_airport: '',
    arrival_airport: '',
    departure_time: '',
    arrival_time: '',
    booking_reference: '',
  })
  const [hotelForm, setHotelForm] = useState({
    provider_id: '',
    room_type_id: '',
    check_in_date: '',
    check_out_date: '',
    primary_guest_name: '',
    rooms_booked: '1',
  })
  const [error, setError] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])

  const loadTimeline = useCallback(async () => {
    const params = new URLSearchParams({ type: 'timeline', limit: '50' })
    if (eventId) params.set('event_id', eventId)
    if (tourId) params.set('tour_id', tourId)
    const res = await fetch(`/api/admin/travel-coordination?${params}`, { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setTimeline(data.data || [])
  }, [eventId, tourId])

  useEffect(() => {
    travel.fetchFlights?.({ event_id: eventId, tour_id: tourId })
    travel.fetchTransportation?.({ event_id: eventId, tour_id: tourId })
    loadTimeline()
  }, [eventId, tourId]) // eslint-disable-line react-hooks/exhaustive-deps

  const members = useMemo(() => {
    const fromGroups = (travel.groupMembers || []).map((m) => ({
      id: m.id,
      name: m.member_name,
      email: m.member_email,
    }))
    if (fromGroups.length) return fromGroups
    return (travel.groups || []).flatMap((g) => [{
      id: g.id,
      name: g.name,
      email: null as string | null,
    }])
  }, [travel.groupMembers, travel.groups])

  const matrix = useMemo(() => {
    const flightMemberIds = (travel.flightPassengers || []).map((p) => p.group_member_id)
    const lodgingMemberIds = (travel.hotelAssignments || []).map((a) => a.group_member_id)
    const transferMemberIds = (travel.transportationPassengers || []).map((p) => p.group_member_id)
    return buildTravelerMatrix({
      members,
      flightMemberIds,
      lodgingMemberIds,
      transferMemberIds,
    })
  }, [members, travel.flightPassengers, travel.hotelAssignments, travel.transportationPassengers])

  async function createFlight() {
    setError(null)
    try {
      const res = await fetch('/api/admin/travel-coordination', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_flight',
          ...flightForm,
          event_id: eventId || null,
          tour_id: tourId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to create flight')
      setFlightForm({
        flight_number: '',
        airline: '',
        departure_airport: '',
        arrival_airport: '',
        departure_time: '',
        arrival_time: '',
        booking_reference: '',
      })
      await travel.fetchFlights?.({ event_id: eventId, tour_id: tourId })
    } catch (err: any) {
      setError(err.message || 'Failed to create flight')
    }
  }

  async function createHotel() {
    setError(null)
    if (!hotelForm.provider_id || !hotelForm.room_type_id) {
      setError('Select a provider and room type')
      return
    }
    try {
      await lodging.createBooking?.({
        provider_id: hotelForm.provider_id,
        room_type_id: hotelForm.room_type_id,
        check_in_date: hotelForm.check_in_date,
        check_out_date: hotelForm.check_out_date,
        primary_guest_name: hotelForm.primary_guest_name || 'TBD',
        rooms_booked: Number(hotelForm.rooms_booked) || 1,
        event_id: eventId,
        tour_id: tourId,
      } as any)
      setHotelForm({
        provider_id: '',
        room_type_id: '',
        check_in_date: '',
        check_out_date: '',
        primary_guest_name: '',
        rooms_booked: '1',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create booking')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Hotels & Flights</h3>
        <p className="text-sm text-slate-400">Travel party coverage, bookings, and real timeline activity</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="travelers">Travelers</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Groups" value={travel.groups?.length || 0} />
            <MetricCard label="Flights" value={travel.flights?.length || 0} />
            <MetricCard label="Hotel bookings" value={lodging.bookings?.length || 0} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-2">Recent activity</h4>
            {timeline.length === 0 && <p className="text-sm text-slate-400">No timeline entries yet.</p>}
            <div className="space-y-2">
              {timeline.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-700/50 px-3 py-2 text-sm text-slate-200">
                  <div className="font-medium">{entry.title}</div>
                  <div className="text-slate-400">{entry.entry_type} · {entry.status}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hotels" className="space-y-4 mt-4">
          <div className="grid gap-3 md:grid-cols-2 rounded-xl border border-slate-700/50 p-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                value={hotelForm.provider_id}
                onChange={(e) => setHotelForm((f) => ({ ...f, provider_id: e.target.value }))}
              >
                <option value="">Select provider</option>
                {(lodging.providers || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Room type</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                value={hotelForm.room_type_id}
                onChange={(e) => setHotelForm((f) => ({ ...f, room_type_id: e.target.value }))}
              >
                <option value="">Select room type</option>
                {(lodging.roomTypes || [])
                  .filter((rt: any) => !hotelForm.provider_id || rt.provider_id === hotelForm.provider_id)
                  .map((rt: any) => (
                    <option key={rt.id} value={rt.id}>{rt.name || rt.room_type}</option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input type="date" value={hotelForm.check_in_date} onChange={(e) => setHotelForm((f) => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input type="date" value={hotelForm.check_out_date} onChange={(e) => setHotelForm((f) => ({ ...f, check_out_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Primary guest</Label>
              <Input value={hotelForm.primary_guest_name} onChange={(e) => setHotelForm((f) => ({ ...f, primary_guest_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rooms</Label>
              <Input value={hotelForm.rooms_booked} onChange={(e) => setHotelForm((f) => ({ ...f, rooms_booked: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={createHotel}><Hotel className="h-4 w-4 mr-2" />Create booking</Button>
            </div>
          </div>
          <div className="space-y-2">
            {(lodging.bookings || []).map((booking: any) => (
              <div key={booking.id} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 flex justify-between gap-2">
                <span>{booking.primary_guest_name} · {booking.check_in_date} → {booking.check_out_date}</span>
                <Badge variant="outline">{booking.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flights" className="space-y-4 mt-4">
          <div className="grid gap-3 md:grid-cols-2 rounded-xl border border-slate-700/50 p-4">
            {([
              ['flight_number', 'Flight number'],
              ['airline', 'Airline'],
              ['departure_airport', 'Departure airport'],
              ['arrival_airport', 'Arrival airport'],
              ['booking_reference', 'PNR / confirmation'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input value={(flightForm as any)[key]} onChange={(e) => setFlightForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Departure</Label>
              <Input type="datetime-local" value={flightForm.departure_time} onChange={(e) => setFlightForm((f) => ({ ...f, departure_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Arrival</Label>
              <Input type="datetime-local" value={flightForm.arrival_time} onChange={(e) => setFlightForm((f) => ({ ...f, arrival_time: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={createFlight}><Plane className="h-4 w-4 mr-2" />Create flight</Button>
            </div>
          </div>
          <div className="space-y-2">
            {(travel.flights || []).map((flight: any) => (
              <div key={flight.id} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 flex justify-between gap-2">
                <span>{flight.airline} {flight.flight_number} · {flight.departure_airport} → {flight.arrival_airport}</span>
                <Badge variant="outline">{flight.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="travelers" className="space-y-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users className="h-4 w-4" />
            Gaps — flights: {matrix.missingFlight}, lodging: {matrix.missingLodging}, transfers: {matrix.missingTransfer}
          </div>
          {matrix.rows.length === 0 && <p className="text-sm text-slate-400">Add travel group members to build the matrix.</p>}
          {matrix.rows.map((row) => (
            <div key={row.memberId} className="rounded-lg border border-slate-700/50 p-3 text-sm text-slate-200 flex flex-wrap justify-between gap-2">
              <span>{row.name}</span>
              <div className="flex gap-2">
                <Badge variant={row.hasFlight ? 'default' : 'destructive'}>Flight</Badge>
                <Badge variant={row.hasLodging ? 'default' : 'destructive'}>Hotel</Badge>
                <Badge variant={row.hasTransfer ? 'default' : 'destructive'}>Transfer</Badge>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="issues" className="space-y-3 mt-4">
          {matrix.missingFlight + matrix.missingLodging + matrix.missingTransfer === 0 ? (
            <p className="text-sm text-slate-400">No traveler coverage gaps detected.</p>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>
                {matrix.missingFlight} missing flights, {matrix.missingLodging} missing lodging,
                {' '}{matrix.missingTransfer} missing transfers. Ground transfers are managed in the Transport tab.
              </span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}
