"use client"

import { useCallback, useEffect, useState } from "react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import createClient from "@/lib/supabase/client"
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
 *              VEN-084 ledger — RLS exposes timing only
 * - blocks   : manual availability blocks (is_available = false)
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
      const rangeStart = from.toISOString()
      const rangeEnd = to.toISOString()
      const fromDate = format(from, "yyyy-MM-dd")
      const toDate = format(to, "yyyy-MM-dd")

      const supabase = createClient()

      const [approved, events, claims, blockRows] = await Promise.all([
        venueService.getConfirmedBookingsByRange(venueId, rangeStart, rangeEnd),
        venueService.getVenueEventsByRange(venueId, rangeStart, rangeEnd),
        // Consuming reservation claims overlapping the visible month.
        supabase
          .from("venue_reservations")
          .select("id, resource_key, starts_at, ends_at, status")
          .eq("venue_id", venueId)
          .in("status", ["hold", "offer", "contract", "confirmed"])
          .overlaps("reserved_range", `[${rangeStart},${rangeEnd}]`),
        // Manual availability blocks inside the month.
        supabase
          .from("venue_availability")
          .select("date")
          .eq("venue_id", venueId)
          .eq("is_available", false)
          .gte("date", fromDate)
          .lte("date", toDate),
      ])

      setBookings((approved || []).map((booking: any) => ({
        id: String(booking.id),
        event_name: booking.event_name || "Booking",
        event_date: booking.event_date,
      })))
      setVenueEvents((events || []).map((event: any) => ({
        id: String(event.id),
        title: event.title || "Event",
        date: event.date,
        type:
          typeof event?.settings?.event_type === "string"
            ? event.settings.event_type
            : (event.type || "performance"),
      })))
      if (claims.error) throw claims.error
      setReservations((claims.data ?? []) as CalendarReservation[])
      if (blockRows.error) throw blockRows.error
      setBlocks((blockRows.data ?? []) as CalendarBlock[])
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
