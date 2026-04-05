"use client"

import { useCallback, useEffect, useState } from "react"
import { endOfMonth, startOfMonth } from "date-fns"
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

interface UseVenueCalendarDataOptions {
  venueId?: string
  month: Date
  enabled?: boolean
}

export function useVenueCalendarData({ venueId, month, enabled = true }: UseVenueCalendarDataOptions) {
  const [bookings, setBookings] = useState<VenueCalendarBookingEvent[]>([])
  const [venueEvents, setVenueEvents] = useState<VenueCalendarVenueEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    if (!venueId) {
      setBookings([])
      setVenueEvents([])
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const rangeStart = startOfMonth(month).toISOString()
      const rangeEnd = endOfMonth(month).toISOString()
      const [approved, events] = await Promise.all([
        venueService.getConfirmedBookingsByRange(venueId, rangeStart, rangeEnd),
        venueService.getVenueEventsByRange(venueId, rangeStart, rangeEnd),
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
    isLoading,
    error,
    refresh,
  }
}
