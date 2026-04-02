"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TourifyLogo } from "@/components/tourify-logo"
import { getEvents } from "@/lib/events/actions"
import Link from "next/link"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

type Event = {
  id: string
  title: string
  date: string
  status: string
  ticketsSold: number
  totalTickets: number
}

export function UpcomingEventsList() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true)
        const allEvents = await getEvents()

        // Filter for upcoming events only and sort by date
        const upcoming = allEvents
          .filter((event) => event.status === "upcoming")
          .sort((a, b) => {
            // Convert date strings to Date objects for comparison
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            return dateA.getTime() - dateB.getTime()
          })
          // Take only the first 3 events
          .slice(0, 3)

        setUpcomingEvents(upcoming)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  return (
    <Card className="bg-[#1a1d29] border-0 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
        <CardTitle className="text-xl font-bold">Upcoming Events</CardTitle>
        <TourifyLogo className="h-5 w-auto text-white/60" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-[#0f1117] p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded"></div>
                  <div className="h-3 w-24 bg-white/5 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-md bg-[#0f1117] p-4">
                <div>
                  <h3 className="font-medium">{event.title}</h3>
                  <div className="text-sm text-white/60">
                    {formatDate(event.date)} • {event.ticketsSold}/{event.totalTickets} tickets
                  </div>
                </div>
                <Badge className="bg-white/10 text-white hover:bg-white/20 border-0">On Sale</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-white/60">
            <p>No upcoming events</p>
            <p className="text-sm mt-1">Create your first event to get started</p>
          </div>
        )}

        <Link href="/events">
          <Button
            variant="ghost"
            className="mt-4 w-full justify-center text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            View Calendar
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
