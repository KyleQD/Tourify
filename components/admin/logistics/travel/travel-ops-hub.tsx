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
import { Plane, Hotel, Users, AlertTriangle, Search, Loader2 } from 'lucide-react'

interface TravelOpsHubProps {
  eventId?: string
  tourId?: string
}

interface WorkforcePersonOption {
  userId: string
  name: string
  email: string | null
  role: string | null
  staffMemberId: string | null
}

const emptyFlightForm = {
  flight_number: '',
  airline: '',
  departure_airport: '',
  arrival_airport: '',
  departure_time: '',
  arrival_time: '',
  booking_reference: '',
  passenger_name: '',
  passenger_user_id: '',
  lookup_date: '',
}

const emptyHotelForm = {
  confirmation_number: '',
  provider_id: '',
  room_type_id: '',
  check_in_date: '',
  check_out_date: '',
  primary_guest_name: '',
  rooms_booked: '1',
  assigned_user_id: '',
  guest_email: '',
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

  const [flightForm, setFlightForm] = useState(emptyFlightForm)
  const [hotelForm, setHotelForm] = useState(emptyHotelForm)
  const [error, setError] = useState<string | null>(null)
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const [hotelLookupMessage, setHotelLookupMessage] = useState<string | null>(null)
  const [isLookingUpFlight, setIsLookingUpFlight] = useState(false)
  const [isLookingUpHotel, setIsLookingUpHotel] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const [workforcePeople, setWorkforcePeople] = useState<WorkforcePersonOption[]>([])

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
    travel.fetchGroupMembers?.()
    loadTimeline()
  }, [eventId, tourId])

  useEffect(() => {
    let cancelled = false
    async function loadWorkforcePeople() {
      if (!eventId && !tourId) {
        setWorkforcePeople([])
        return
      }
      try {
        const params = new URLSearchParams()
        if (eventId) params.set('event_id', eventId)
        if (tourId) params.set('tour_id', tourId)
        const response = await fetch(`/api/admin/workforce/people?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))
        if (cancelled) return
        const rows = Array.isArray(payload.people)
          ? payload.people
          : Array.isArray(payload.members)
            ? payload.members
            : []
        setWorkforcePeople(
          rows
            .map((row: any) => ({
              userId: String(row.userId ?? row.user_id ?? row.id),
              name: String(row.name ?? row.full_name ?? 'Staff member'),
              email: row.email ?? null,
              role: row.role ?? null,
              staffMemberId: row.staffMemberId ?? row.staff_member_id ?? null,
            }))
            .filter((row: WorkforcePersonOption) => row.userId)
        )
      } catch {
        if (!cancelled) setWorkforcePeople([])
      }
    }
    void loadWorkforcePeople()
    return () => {
      cancelled = true
    }
  }, [eventId, tourId])

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

  async function lookupFlight() {
    setError(null)
    setLookupMessage(null)
    if (!flightForm.flight_number.trim()) {
      setError('Enter a flight number to search')
      return
    }
    setIsLookingUpFlight(true)
    try {
      const params = new URLSearchParams({
        flight_number: flightForm.flight_number.trim(),
      })
      if (flightForm.lookup_date) params.set('flight_date', flightForm.lookup_date)
      const res = await fetch(`/api/admin/travel/flight-lookup?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || data.success === false)
        throw new Error(data.error || 'Flight lookup failed')

      const flight = data.data
      setFlightForm((f) => ({
        ...f,
        flight_number: flight.flight_number || f.flight_number,
        airline: flight.airline || '',
        departure_airport: flight.departure_airport || '',
        arrival_airport: flight.arrival_airport || '',
        departure_time: flight.departure_time || '',
        arrival_time: flight.arrival_time || '',
      }))
      setLookupMessage(`Autofilled ${flight.airline} ${flight.flight_number} (${flight.status})`)
    } catch (err: any) {
      setError(err.message || 'Flight lookup failed')
    } finally {
      setIsLookingUpFlight(false)
    }
  }

  async function createFlight() {
    setError(null)
    if (!flightForm.passenger_name.trim()) {
      setError('Passenger name is required')
      return
    }
    try {
      const res = await fetch('/api/admin/travel-coordination', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_flight_with_passenger',
          flight_number: flightForm.flight_number,
          airline: flightForm.airline,
          departure_airport: flightForm.departure_airport,
          arrival_airport: flightForm.arrival_airport,
          departure_time: flightForm.departure_time,
          arrival_time: flightForm.arrival_time,
          booking_reference: flightForm.booking_reference || null,
          passenger_name: flightForm.passenger_name.trim(),
          passenger_user_id: flightForm.passenger_user_id || null,
          passenger_email:
            workforcePeople.find((p) => p.userId === flightForm.passenger_user_id)?.email || null,
          event_id: eventId || null,
          tour_id: tourId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to create flight')
      setFlightForm(emptyFlightForm)
      setLookupMessage(null)
      await travel.fetchFlights?.({ event_id: eventId, tour_id: tourId })
      await travel.fetchGroupMembers?.()
      await travel.fetchFlightPassengers?.()
    } catch (err: any) {
      setError(err.message || 'Failed to create flight')
    }
  }

  async function lookupHotelReservation() {
    setError(null)
    setHotelLookupMessage(null)
    if (!hotelForm.confirmation_number.trim()) {
      setError('Enter a reservation / confirmation number to search')
      return
    }
    setIsLookingUpHotel(true)
    try {
      const params = new URLSearchParams({
        type: 'lookup_by_confirmation',
        confirmation_number: hotelForm.confirmation_number.trim(),
      })
      if (eventId) params.set('event_id', eventId)
      if (tourId) params.set('tour_id', tourId)
      const res = await fetch(`/api/admin/lodging?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || data.success === false)
        throw new Error(data.error || 'Reservation lookup failed')

      const booking = data.data?.booking || data.data
      setHotelForm((f) => ({
        ...f,
        confirmation_number: booking.confirmation_number || f.confirmation_number,
        provider_id: booking.provider_id || '',
        room_type_id: booking.room_type_id || '',
        check_in_date: booking.check_in_date ? String(booking.check_in_date).slice(0, 10) : '',
        check_out_date: booking.check_out_date ? String(booking.check_out_date).slice(0, 10) : '',
        primary_guest_name: booking.primary_guest_name || '',
        rooms_booked: String(booking.rooms_booked || 1),
      }))
      setHotelLookupMessage(
        `Found reservation for ${booking.primary_guest_name || 'guest'} · ${booking.status || 'status unknown'}`
      )
    } catch (err: any) {
      setHotelLookupMessage(err.message || 'No matching reservation in Tourify')
    } finally {
      setIsLookingUpHotel(false)
    }
  }

  async function createHotel() {
    setError(null)
    if (!hotelForm.provider_id || !hotelForm.room_type_id) {
      setError('Select a provider and room type')
      return
    }
    try {
      const booking = await lodging.createBooking?.({
        provider_id: hotelForm.provider_id,
        room_type_id: hotelForm.room_type_id,
        check_in_date: hotelForm.check_in_date,
        check_out_date: hotelForm.check_out_date,
        primary_guest_name: hotelForm.primary_guest_name || 'TBD',
        rooms_booked: Number(hotelForm.rooms_booked) || 1,
        confirmation_number: hotelForm.confirmation_number || undefined,
        event_id: eventId,
        tour_id: tourId,
      } as any)

      const bookingId = (booking as any)?.id || (booking as any)?.data?.id
      if (bookingId && (hotelForm.primary_guest_name || hotelForm.assigned_user_id)) {
        await lodging.createGuestAssignment?.({
          booking_id: bookingId,
          guest_name: hotelForm.primary_guest_name || 'Guest',
          guest_email: hotelForm.guest_email || undefined,
          guest_type: 'crew',
          assigned_user_id: hotelForm.assigned_user_id || undefined,
        } as any)
      }

      setHotelForm(emptyHotelForm)
      setHotelLookupMessage(null)
    } catch (err: any) {
      setError(err.message || 'Failed to create booking')
    }
  }

  function selectFlightPassenger(userId: string) {
    const person = workforcePeople.find((p) => p.userId === userId)
    setFlightForm((f) => ({
      ...f,
      passenger_user_id: userId,
      passenger_name: person?.name || f.passenger_name,
    }))
  }

  function selectHotelGuest(userId: string) {
    const person = workforcePeople.find((p) => p.userId === userId)
    setHotelForm((f) => ({
      ...f,
      assigned_user_id: userId,
      primary_guest_name: person?.name || f.primary_guest_name,
      guest_email: person?.email || f.guest_email,
    }))
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
            <div className="md:col-span-2 space-y-2">
              <Label>Reservation / confirmation number</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="e.g. HTL-48291"
                  value={hotelForm.confirmation_number}
                  onChange={(e) => setHotelForm((f) => ({ ...f, confirmation_number: e.target.value }))}
                />
                <Button type="button" variant="secondary" onClick={lookupHotelReservation} disabled={isLookingUpHotel}>
                  {isLookingUpHotel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Lookup
                </Button>
              </div>
              {hotelLookupMessage && (
                <p className="text-xs text-slate-400">{hotelLookupMessage}</p>
              )}
            </div>
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
              <Label>Primary guest name</Label>
              <Input value={hotelForm.primary_guest_name} onChange={(e) => setHotelForm((f) => ({ ...f, primary_guest_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Assign to user</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                value={hotelForm.assigned_user_id}
                onChange={(e) => selectHotelGuest(e.target.value)}
              >
                <option value="">Unassigned</option>
                {workforcePeople.map((person) => (
                  <option key={person.userId} value={person.userId}>
                    {person.name}{person.role ? ` · ${person.role}` : ''}
                  </option>
                ))}
              </select>
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
                <span>
                  {booking.primary_guest_name} · {booking.check_in_date} → {booking.check_out_date}
                  {booking.confirmation_number ? ` · #${booking.confirmation_number}` : ''}
                </span>
                <Badge variant="outline">{booking.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flights" className="space-y-4 mt-4">
          <div className="grid gap-3 md:grid-cols-2 rounded-xl border border-slate-700/50 p-4">
            <div className="space-y-2">
              <Label>Flight number</Label>
              <Input
                placeholder="e.g. UA123"
                value={flightForm.flight_number}
                onChange={(e) => setFlightForm((f) => ({ ...f, flight_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Departure date (for lookup)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={flightForm.lookup_date}
                  onChange={(e) => setFlightForm((f) => ({ ...f, lookup_date: e.target.value }))}
                />
                <Button type="button" variant="secondary" onClick={lookupFlight} disabled={isLookingUpFlight}>
                  {isLookingUpFlight ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Lookup
                </Button>
              </div>
            </div>
            {lookupMessage && (
              <p className="md:col-span-2 text-xs text-emerald-300/90">{lookupMessage}</p>
            )}
            {([
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
            <div className="space-y-2">
              <Label>Passenger name</Label>
              <Input
                value={flightForm.passenger_name}
                onChange={(e) => setFlightForm((f) => ({ ...f, passenger_name: e.target.value }))}
                placeholder="Full name on ticket"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign passenger user</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                value={flightForm.passenger_user_id}
                onChange={(e) => selectFlightPassenger(e.target.value)}
              >
                <option value="">Unassigned account</option>
                {workforcePeople.map((person) => (
                  <option key={person.userId} value={person.userId}>
                    {person.name}{person.role ? ` · ${person.role}` : ''}
                  </option>
                ))}
              </select>
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
