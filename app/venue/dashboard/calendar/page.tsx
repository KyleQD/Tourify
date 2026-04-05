"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { CreateEventModal } from "../../components/events/create-event-modal"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { useVenueCalendarData } from "@/app/venue/hooks/use-venue-calendar-data"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { getEventTypeBadgeColor, getEventTypeLabel, isSameCalendarDay } from "@/app/venue/lib/event-presentation"

export default function CalendarPage() {
  const router = useRouter()
  const { venue, isLoading: isVenueLoading } = useCurrentVenue()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const {
    venueEvents,
    isLoading: isEventsLoading,
    error: eventsError,
    refresh: refreshCalendarData,
  } = useVenueCalendarData({ venueId: venue?.id, month: currentMonth })
  const normalizedEvents = useMemo(() => {
    return venueEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: new Date(event.date || Date.now()),
      venue: venue?.venue_name || venue?.name || "Venue",
      location: `${venue?.city || ""}${venue?.city && venue?.state ? ", " : ""}${venue?.state || ""}` || "TBD",
      type: event.type || "performance",
    }))
  }, [venueEvents, venue?.city, venue?.name, venue?.state, venue?.venue_name])

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof normalizedEvents>()
    for (const event of normalizedEvents) {
      const key = event.date.toDateString()
      const existing = map.get(key)
      if (existing) existing.push(event)
      else map.set(key, [event])
    }
    return map
  }, [normalizedEvents])

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, isCurrentMonth: false })
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const eventsOnDay = eventsByDate.get(date.toDateString()) || []

      days.push({
        day,
        date,
        events: eventsOnDay,
        isCurrentMonth: true,
      })
    }

    // Add empty cells to complete the last week if needed
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7
    for (let i = days.length; i < totalCells; i++) {
      days.push({ day: null, isCurrentMonth: false })
    }

    return days
  }

  // Format month and year
  const formatMonthYear = (date: Date) => {
    return formatSafeDate(date.toISOString())
  }

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  // Get events for selected date
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return []

    return normalizedEvents.filter(
      (event) => isSameCalendarDay(event.date, selectedDate),
    )
  }

  const calendarDays = useMemo(() => generateCalendarDays(), [currentMonth, eventsByDate])
  const selectedDateEvents = useMemo(() => getEventsForSelectedDate(), [selectedDate, normalizedEvents])
  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return normalizedEvents
      .filter((event) => event.date.getTime() >= now)
      .sort((first, second) => first.date.getTime() - second.date.getTime())
      .slice(0, 3)
  }, [normalizedEvents])

  if (isVenueLoading)
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )

  if (!venue)
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-gray-400">Manage your schedule and events</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{formatMonthYear(currentMonth)}</CardTitle>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void refreshCalendarData()} className="border-gray-700">
                    Refresh
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="border-gray-700">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNextMonth} className="border-gray-700">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsError ? (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-300">{eventsError}</p>
                </div>
              ) : null}
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                  <div key={index} className="text-center text-sm font-medium text-gray-400 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border border-gray-800 ${
                      day.isCurrentMonth ? "bg-gray-800/30" : "bg-gray-800/10"
                    } ${
                      selectedDate &&
                      day.date &&
                      selectedDate.getDate() === day.date.getDate() &&
                      selectedDate.getMonth() === day.date.getMonth() &&
                      selectedDate.getFullYear() === day.date.getFullYear()
                        ? "ring-2 ring-purple-500"
                        : ""
                    }`}
                    onClick={() => day.date && handleDateSelect(day.date)}
                  >
                    {day.day && (
                      <div className="h-full">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{day.day}</span>
                          {day.events && day.events.length > 0 && (
                            <Badge className="bg-purple-600">{day.events.length}</Badge>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          {day.events &&
                            day.events.slice(0, 2).map((event, eventIndex) => (
                              <div
                                key={eventIndex}
                                className={`text-xs p-1 rounded truncate ${getEventTypeBadgeColor(event.type)} bg-opacity-70`}
                              >
                                {event.title}
                              </div>
                            ))}
                          {day.events && day.events.length > 2 && (
                            <div className="text-xs text-gray-400 pl-1">+{day.events.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? formatSafeDate(selectedDate.toISOString())
                  : "Select a Date"}
              </CardTitle>
              {selectedDate && (
                <CardDescription>
                  {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-6">
                  <CalendarIcon className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">Select a date to view events</p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">No events scheduled for this day</p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800"
                      onClick={() => router.push(`/venue/events/${event.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{event.title}</h3>
                        <Badge className={getEventTypeBadgeColor(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        <p>{event.venue}</p>
                        <p>{event.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isEventsLoading ? (
                  <p className="text-sm text-gray-400">Loading upcoming events...</p>
                ) : null}
                {upcomingEvents.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800"
                      onClick={() => router.push(`/venue/events/${event.id}`)}
                    >
                      <div className="bg-gray-800 p-2 rounded-md text-center min-w-[40px]">
                        <div className="text-xs text-gray-400">
                          {formatSafeDate(event.date.toISOString())}
                        </div>
                        <div className="text-lg font-bold">{event.date.getDate()}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-sm text-gray-400 truncate">{event.venue}</p>
                      </div>
                    </div>
                  ))}
                {!isEventsLoading && upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-400">No upcoming events in this period.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
