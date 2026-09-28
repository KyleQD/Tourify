"use client"

import { useCallback, useEffect, useState } from "react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { venueService } from "@/lib/services/venue.service"

interface VenueCalendarBookingEvent {
  id: string
  event_name: string
  event_date: string
}

interface VenueCalendarVenueEvent {
  id: string
  title: string
  date: string
  type: string
}

/**
 * VEN-093/052 — unified calendar layers.
 * - events   : canonical events (events_v2 via bridged service readers)
 * - bookings : approved booking requests
 * - holds    : active consuming reservations (status hold|offer) from the
 *              VEN-084 ledger — read via the venue-scoped API
 * - blocks   : manual availability blocks (is_available = false)
 *
 * VENUE-005: the raw `venue_reservations` / `venue_availability` tables are
 * no longer read with the client-role Supabase client. Both layers now go
 * through venue-scoped API routes that enforce canManageVenue("manage_bookings")
 * server-side and read with a service-role client.
 */
export interface CalendarReservation {
  id: string
  resource_key: string
  starts_at: string
  ends_at: string
  status: "hold" | "offer" | "contract" | "confirmed"
}

export interface CalendarBlock {
  date: string // yyyy-MM-dd
}

interface UseVenueCalendarDataOptions {
  venueId?: string
  month: Date
  enabled?: boolean
}

const CONSUMING = "('hold','offer','contract','confirmed')"

/** Fetches a venue-scoped API route and fails closed on any non-2xx. */
async function venueApiRequest<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Venue calendar request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export interface LoadVenueCalendarLayersInput {
  venueId: string
  /** Inclusive ISO 8601 bounds passed to the reservation API. */
  fromIso: string
  toIso: string
  /** Inclusive `yyyy-MM-dd` bounds passed to the availability API. */
  fromDate: string
  toDate: string
}

export interface VenueCalendarLayers {
  bookings: VenueCalendarBookingEvent[]
  venueEvents: VenueCalendarVenueEvent[]
  reservations: CalendarReservation[]
  blocks: CalendarBlock[]
}

/**
 * Loads the four calendar layers for one venue/month.
 *
 * Pure data loader (no React state) so the venue-scoped API wiring is unit
 * testable. Throws when either venue-scoped API fails — the calendar then
 * fails closed instead of showing partial raw rows.
 */
export async function loadVenueCalendarLayers(
  input: LoadVenueCalendarLayersInput,
): Promise<VenueCalendarLayers> {
  const { venueId, fromIso, toIso, fromDate, toDate } = input
  const availabilityParams = new URLSearchParams({
    venue_id: venueId,
    from: fromDate,
    to: toDate,
  })
  const reservationsParams = new URLSearchParams({
    venue_id: venueId,
    from: fromIso,
    to: toIso,
  })

  const [approved, events, reservationsPayload, blocksPayload] = await Promise.all([
    venueService.getConfirmedBookingsByRange(venueId, fromIso, toIso),
    venueService.getVenueEventsByRange(venueId, fromIso, toIso),
    venueApiRequest<{ success: boolean; data?: CalendarReservation[] }>(
      `/api/venue/reservations?${reservationsParams.toString()}`,
    ),
    venueApiRequest<{ success: boolean; data?: Array<{ date: string; is_available: boolean | null }> }>(
      `/api/venue/availability?${availabilityParams.toString()}`,
    ),
  ])

  const bookings = (approved || []).map((booking: any) => ({
    id: String(booking.id),
    event_name: booking.event_name || "Booking",
    event_date: booking.event_date,
  }))
  const venueEvents = (events || []).map((event: any) => ({
    id: String(event.id),
    title: event.title || "Event",
    date: event.date,
    type:
      typeof event?.settings?.event_type === "string"
        ? event.settings.event_type
        : (event.type || "performance"),
  }))
  const reservations = reservationsPayload?.data ?? []
  // The availability API returns sanitized rows; is_available=false is the
  // manual block signal for the calendar.
  const blocks = (blocksPayload?.data ?? [])
    .filter((row) => row.is_available === false)
    .map((row) => ({ date: row.date }))

  return { bookings, venueEvents, reservations, blocks }
}

export function useVenueCalendarData({ venueId, month, enabled = true }: UseVenueCalendarDataOptions) {
  const [bookings, setBookings] = useState<VenueCalendarBookingEvent[]>([])
  const [venueEvents, setVenueEvents] = useState<VenueCalendarVenueEvent[]>([])
  const [reservations, setReservations] = useState<CalendarReservation[]>([])
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    if (!venueId) {
      setBookings([])
      setVenueEvents([])
      setReservations([])
      setBlocks([])
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const from = startOfMonth(month)
      const to = endOfMonth(month)
      const fromIso = from.toISOString()
      const toIso = to.toISOString()
      const fromDate = format(from, "yyyy-MM-dd")
      const toDate = format(to, "yyyy-MM-dd")

      const layers = await loadVenueCalendarLayers({
        venueId,
        fromIso,
        toIso,
        fromDate,
        toDate,
      })

      setBookings(layers.bookings)
      setVenueEvents(layers.venueEvents)
      setReservations(layers.reservations)
      setBlocks(layers.blocks)
    } catch (err) {
      console.error("Failed to load venue calendar data:", err)
      setError("Failed to load venue calendar data")
    } finally {
      setIsLoading(false)
    }
  }, [venueId, month, enabled])

  useEffect(() => {
    if (enabled) void refresh()
  }, [refresh])

  return {
    bookings,
    venueEvents,
    reservations,
    blocks,
    isLoading,
    error,
    refresh,
  }
}

// Re-exported so the page composes layer semantics in one place.
export const CALENDAR_CONSUMING_STATUSES = CONSUMING