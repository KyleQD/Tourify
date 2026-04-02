"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin, RefreshCw, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { formatSafeNumber } from "@/lib/format/number-format"

interface UpcomingEventsProps {
  limit?: number
  showRefresh?: boolean
  className?: string
}

export function UpcomingEvents({ limit = 3, showRefresh = true, className = "" }: UpcomingEventsProps) {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    const isInitialLoad = loading
    if (!isInitialLoad) {
      setRefreshing(true)
    }

    try {
      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock data
      const mockEvents = [
        {
          id: "1",
          title: "Electronic Horizons Festival",
          startDate: "2023-08-15T10:00:00Z",
          endDate: "2023-08-17T23:00:00Z",
          location: "Los Angeles, CA",
          attendees: 5200,
        },
        {
          id: "2",
          title: "Production Workshop",
          startDate: "2023-05-20T09:00:00Z",
          endDate: "2023-05-20T17:00:00Z",
          location: "New York, NY",
          attendees: 1850,
        },
        {
          id: "3",
          title: "Acoustic Sessions Tour",
          startDate: "2023-06-01T19:00:00Z",
          endDate: "2023-07-15T23:00:00Z",
          location: "Multiple Cities",
          attendees: 3400,
        },
        {
          id: "4",
          title: "Sound Engineering Masterclass",
          startDate: "2023-06-10T10:00:00Z",
          endDate: "2023-06-11T16:00:00Z",
          location: "Nashville, TN",
          attendees: 750,
        },
        {
          id: "5",
          title: "Industry Networking Night",
          startDate: "2023-05-25T18:00:00Z",
          endDate: "2023-05-25T22:00:00Z",
          location: "Austin, TX",
          attendees: 1200,
        },
      ]

      setEvents(mockEvents.slice(0, limit))
    } catch (error) {
      console.error("Error fetching upcoming events:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start.toDateString() === end.toDateString()) {
      return format(start, "MMM d, yyyy")
    } else if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM d")}-${format(end, "d, yyyy")}`
    } else {
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
    }
  }

  return (
    <Card className={`bg-gray-900 text-white border-gray-800 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-purple-400" />
            Upcoming Events
          </CardTitle>
          {showRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={fetchEvents}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array(limit)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-5 w-full bg-gray-800" />
                  <Skeleton className="h-4 w-2/3 bg-gray-800" />
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="space-y-1 cursor-pointer hover:bg-gray-800 p-2 rounded-md transition-colors"
                onClick={() => handleEventClick(event.id)}
              >
                <p className="font-medium">{event.title}</p>
                <div className="flex items-center text-xs text-gray-400">
                  <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{formatDate(event.startDate, event.endDate)}</span>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{formatSafeNumber(event.attendees)} attending</span>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-700 text-gray-300"
              onClick={() => router.push("/events")}
            >
              View All Events
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
