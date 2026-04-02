"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { normalizeAdminEvent } from "@/lib/events/admin-event-normalization"

interface Event {
  id: string
  title: string
  event_date: string
  status: string
  venue_name?: string
}

interface EventSelectorProps {
  selectedEvent?: string
  onEventChange?: (eventId: string) => void
  showNewEventButton?: boolean
}

export function EventSelector({ selectedEvent, onEventChange, showNewEventButton = true }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSelectedEvent, setCurrentSelectedEvent] = useState(selectedEvent || "all")

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      setCurrentSelectedEvent(selectedEvent)
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      
      // Fetch events from the API
      const response = await fetch('/api/events', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const normalizedEvents = (data.events || []).map((event: any) => {
          const normalized = normalizeAdminEvent(event)
          return {
            id: normalized.id,
            title: normalized.name,
            event_date: normalized.event_date,
            status: normalized.status,
            venue_name: normalized.venue_name,
          } as Event
        })
        setEvents(normalizedEvents)
      } else {
        console.error('Failed to fetch events')
        setEvents([])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleEventChange = (eventId: string) => {
    setCurrentSelectedEvent(eventId)
    if (onEventChange) {
      onEventChange(eventId)
    }
  }

  const getSelectedEvent = () => {
    if (currentSelectedEvent === "all") {
      return { title: "All Events", event_date: null }
    }
    return events.find(event => event.id === currentSelectedEvent) || { title: "Select Event", event_date: null }
  }

  const calculateDaysUntilEvent = (eventDate: string) => {
    const eventDateObj = new Date(eventDate)
    if (Number.isNaN(eventDateObj.getTime())) return 0
    const today = new Date()
    const diffTime = eventDateObj.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const selectedEventData = getSelectedEvent()

  return (
    <div className="flex items-center space-x-4">
      <Select value={currentSelectedEvent} onValueChange={handleEventChange}>
        <SelectTrigger className="w-[240px] bg-slate-800/70 border-slate-700">
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading events...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select Event" />
          )}
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all">All Events</SelectItem>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedEventData.event_date && (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
          {calculateDaysUntilEvent(selectedEventData.event_date)} days until event
        </Badge>
      )}
      
      {showNewEventButton && (
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> New Event
        </Button>
      )}
    </div>
  )
}
