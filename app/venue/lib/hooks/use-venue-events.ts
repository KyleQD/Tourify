"use client"

import { useState, useEffect } from "react"
import { venueService } from "@/lib/services/venue.service"
import {
  filterVenueEventsBySearch,
  filterVenueEventsByTab,
  filterVenueEventsByType,
  type VenueEventsTab,
} from "../events-filtering"

export interface VenueEvent {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  venue: string
  isPublic: boolean
  capacity: number
  image?: string
  type: "performance" | "meeting" | "recording" | "media"
  status?: string
  // New fields for enhanced event lifecycle
  slug: string
  organizerId: string
  organizerName?: string
  organizerAvatar?: string
  tags: string[]
  flyer?: string
  links?: {
    ticketUrl?: string
    socialMedia?: string[]
    website?: string
  }
  // Analytics fields
  analytics: {
    views: number
    shares: number
    rsvps: number
    likes: number
    comments: number
    lastViewed?: string
  }
  // Engagement tracking
  attendees: string[]
  interested: string[]
  likes: string[]
  createdAt: string
  updatedAt: string
}

interface UseVenueEventsOptions {
  venueId?: string
  rangeDays?: number
}

function toVenueEventType(value: string | null | undefined): VenueEvent["type"] {
  const normalized = (value || "").toLowerCase()
  if (normalized === "meeting") return "meeting"
  if (normalized === "recording") return "recording"
  if (normalized === "media") return "media"
  return "performance"
}

function mapEventRowToVenueEvent(row: any): VenueEvent {
  const settings = row?.settings && typeof row.settings === "object" ? row.settings : {}
  const description = typeof settings.description === "string"
    ? settings.description
    : typeof row?.description === "string"
      ? row.description
      : ""
  const tags = Array.isArray(settings.tags)
    ? settings.tags.filter((tag: unknown) => typeof tag === "string")
    : []
  const eventDate = row?.date || row?.start_at || row?.start_date || row?.event_date || row?.created_at || new Date().toISOString()
  const endDate = row?.end_at || row?.end_date || eventDate
  const title = row?.title || row?.name || "Event"

  return {
    id: String(row?.id || ""),
    title,
    description,
    startDate: String(eventDate),
    endDate: String(endDate),
    location: typeof settings.location === "string" ? settings.location : (row?.location || "Venue"),
    venue: typeof settings.venue_label === "string" ? settings.venue_label : "Venue",
    isPublic: Boolean(settings.is_public ?? row?.is_public ?? true),
    capacity: Number(row?.capacity || 0),
    image: typeof settings.cover_image === "string" ? settings.cover_image : undefined,
    type: toVenueEventType(typeof settings.event_type === "string" ? settings.event_type : row?.type),
    status: typeof row?.status === "string" ? row.status : undefined,
    slug: row?.slug || `${String(row?.id || "")}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    organizerId: String(row?.created_by || row?.user_id || ""),
    organizerName: typeof settings.organizer_name === "string" ? settings.organizer_name : undefined,
    organizerAvatar: undefined,
    tags,
    flyer: typeof settings.flyer === "string" ? settings.flyer : undefined,
    links: {
      ticketUrl: typeof settings.ticket_url === "string" ? settings.ticket_url : undefined,
      socialMedia: Array.isArray(settings.social_links) ? settings.social_links.filter((item: unknown) => typeof item === "string") : [],
      website: typeof settings.website === "string" ? settings.website : undefined,
    },
    analytics: {
      views: Number(settings.views || 0),
      shares: Number(settings.shares || 0),
      rsvps: Number(settings.rsvps || 0),
      likes: Number(settings.likes || 0),
      comments: Number(settings.comments || 0),
      lastViewed: typeof settings.last_viewed === "string" ? settings.last_viewed : undefined,
    },
    attendees: [],
    interested: [],
    likes: [],
    createdAt: String(row?.created_at || new Date().toISOString()),
    updatedAt: String(row?.updated_at || row?.created_at || new Date().toISOString()),
  }
}

export function useVenueEvents(options?: UseVenueEventsOptions) {
  const [events, setEvents] = useState<VenueEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const filterEvents = (query: string) => {
    return filterVenueEventsBySearch(events, query)
  }

  const filterEventsByType = (type: VenueEvent['type']) => {
    return filterVenueEventsByType(events, type)
  }

  const filterEventsByDate = (startDate: string, endDate: string) => {
    return events.filter(event => 
      event.startDate >= startDate && event.startDate <= endDate
    )
  }

  const filterEventsByLocation = (location: string) => {
    return events.filter(event => 
      event.location.toLowerCase().includes(location.toLowerCase())
    )
  }

  const filterEventsByGenre = (genre: string) => {
    return events.filter(event => 
      event.tags.some(tag => tag.toLowerCase().includes(genre.toLowerCase()))
    )
  }

  const filterEventsByTab = (tab: VenueEventsTab) => {
    return filterVenueEventsByTab(events, tab)
  }

  const getEventBySlug = (slug: string) => {
    return events.find(event => event.slug === slug)
  }

  const incrementEventViews = (eventId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                views: event.analytics.views + 1,
                lastViewed: new Date().toISOString()
              }
            }
          : event
      )
    )
  }

  const incrementEventShares = (eventId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                shares: event.analytics.shares + 1
              }
            }
          : event
      )
    )
  }

  const incrementEventLikes = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                likes: event.analytics.likes + 1
              },
              likes: [...event.likes, userId]
            }
          : event
      )
    )
  }

  const decrementEventLikes = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                likes: Math.max(0, event.analytics.likes - 1)
              },
              likes: event.likes.filter(id => id !== userId)
            }
          : event
      )
    )
  }

  const addEventRSVP = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                rsvps: event.analytics.rsvps + 1
              },
              attendees: [...event.attendees, userId]
            }
          : event
      )
    )
  }

  const removeEventRSVP = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              analytics: {
                ...event.analytics,
                rsvps: Math.max(0, event.analytics.rsvps - 1)
              },
              attendees: event.attendees.filter(id => id !== userId)
            }
          : event
      )
    )
  }

  const addEventInterest = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              interested: [...event.interested, userId]
            }
          : event
      )
    )
  }

  const removeEventInterest = (eventId: string, userId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              interested: event.interested.filter(id => id !== userId)
            }
          : event
      )
    )
  }

  const refetch = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let targetVenueId = options?.venueId || venueService.getActiveVenueId()
      if (!targetVenueId) {
        const currentVenue = await venueService.getCurrentUserVenue()
        targetVenueId = currentVenue?.id || undefined
      }

      if (!targetVenueId) {
        setEvents([])
        return
      }

      const rangeDays = Number(options?.rangeDays || 365)
      const today = new Date()
      const rangeStart = new Date(today)
      rangeStart.setDate(today.getDate() - rangeDays)
      const rangeEnd = new Date(today)
      rangeEnd.setDate(today.getDate() + rangeDays)

      const eventRows = await venueService.getVenueEventsByRange(
        targetVenueId,
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      )

      const mappedEvents = (eventRows || [])
        .map((row: any) => mapEventRowToVenueEvent(row))
        .filter((event: VenueEvent) => Boolean(event.id))

      setEvents(mappedEvents)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch events"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [options?.venueId, options?.rangeDays])

  return { 
    events, 
    setEvents, 
    isLoading, 
    error, 
    filterEvents,
    filterEventsByType,
    filterEventsByDate,
    filterEventsByLocation,
    filterEventsByGenre,
    filterEventsByTab,
    getEventBySlug,
    refetch,
    incrementEventViews,
    incrementEventShares,
    incrementEventLikes,
    decrementEventLikes,
    addEventRSVP,
    removeEventRSVP,
    addEventInterest,
    removeEventInterest
  }
} 