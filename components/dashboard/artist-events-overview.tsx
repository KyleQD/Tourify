"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  DollarSign, 
  Plus,
  ArrowRight,
  ExternalLink,
  Mic2,
  Tent,
  Bus,
  Headphones,
  Radio
} from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"
import Link from "next/link"
import { cn } from "@/utils"
import type { DashboardEventBucket } from "@/lib/artist/dashboard-upcoming-events"
import {
  ARTIST_CARD,
  ARTIST_ICON_WELL,
  ARTIST_INSET,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
} from "@/components/dashboard/artist-tokens"

interface Event {
  id: string
  title: string
  date: Date
  venue: string
  city: string
  status: 'confirmed' | 'pending' | 'draft' | 'cancelled'
  ticketSales: number
  capacity: number
  revenue: number
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  ticketPrice?: number
  expectedAttendance?: number
  ticketUrl?: string
  slug?: string
  startTime?: string
  bucket?: DashboardEventBucket
}

interface ArtistEventsOverviewProps {
  events: Event[]
  isLoading?: boolean
  onCreateEvent?: () => void
  onViewAll?: () => void
}

function formatStartTime(value?: string) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed)
  if (!match) return trimmed
  const hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${suffix}`
}

export function ArtistEventsOverview({ 
  events, 
  isLoading = false, 
  onCreateEvent,
  onViewAll 
}: ArtistEventsOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Trust parent selector buckets — do not re-filter away past/undated events.
  const displayEvents = events
  const upcomingEvents = displayEvents.filter((event) => (event.bucket || 'upcoming') === 'upcoming')
  const needsDateEvents = displayEvents.filter((event) => event.bucket === 'needs_date')
  const recentEvents = displayEvents.filter((event) => event.bucket === 'recent')
  const listEvents = displayEvents.slice(0, 5)

  const nextEvent = upcomingEvents[0]
  const confirmedEvents = displayEvents.filter((e) => e.status === 'confirmed')
  const draftEvents = displayEvents.filter((e) => e.status === 'draft' || e.status === 'pending')
  const totalRevenue = displayEvents.reduce((sum, e) => sum + e.revenue, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === 'confirmed') return 'published'
    return status
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return <Mic2 className="h-4 w-4 text-purple-300" />
      case 'festival': return <Tent className="h-4 w-4 text-purple-300" />
      case 'tour': return <Bus className="h-4 w-4 text-purple-300" />
      case 'recording': return <Headphones className="h-4 w-4 text-purple-300" />
      case 'interview': return <Radio className="h-4 w-4 text-purple-300" />
      default: return <CalendarIcon className="h-4 w-4 text-purple-300" />
    }
  }

  const getCountdownText = (date: Date) => {
    const days = differenceInCalendarDays(date, currentTime)
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 7) return `in ${days} days`
    if (days < 30) return `in ${Math.floor(days / 7)} weeks`
    return `in ${Math.floor(days / 30)} months`
  }

  const locationLabel = (event: Event) => {
    if (event.venue && event.city) return `${event.venue}, ${event.city}`
    return event.venue || event.city || 'Location TBA'
  }

  const scheduleLabel = (event: Event) => {
    if (event.bucket === 'needs_date' || !event.date || event.date.getTime() === 0)
      return 'Date TBD'
    const datePart = format(event.date, 'MMM d, yyyy')
    const timePart = formatStartTime(event.startTime)
    return timePart ? `${datePart} · ${timePart}` : datePart
  }

  const sectionLabel = () => {
    if (upcomingEvents.length > 0) return null
    if (needsDateEvents.length > 0 && recentEvents.length === 0) return 'Needs a date'
    if (recentEvents.length > 0 && needsDateEvents.length === 0) return 'Recent'
    if (needsDateEvents.length > 0 || recentEvents.length > 0) return 'Your events'
    return null
  }

  if (isLoading) {
    return (
      <Card className={ARTIST_CARD}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 tracking-tight text-white">
            <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
              <CalendarIcon className="h-4 w-4" />
            </div>
            Scheduled Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const heading = sectionLabel()

  return (
    <Card className={ARTIST_CARD}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 tracking-tight text-white">
              <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
                <CalendarIcon className="h-4 w-4" />
              </div>
              Scheduled Events
            </CardTitle>
            <CardDescription className="text-slate-400">
              {upcomingEvents.length > 0
                ? 'Your upcoming performances and events'
                : heading
                  ? `${heading} — add dates or create your next show`
                  : 'Your upcoming performances and events'}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={ARTIST_OUTLINE_BTN}
            onClick={onViewAll}
            asChild
          >
            <Link href="/artist/events">
              <ArrowRight className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayEvents.length > 0 ? (
          <div className="space-y-4">
            {nextEvent && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(ARTIST_INSET, 'border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4')}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-9 w-9 items-center justify-center')}>
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-tight text-white">Next Event</h3>
                      <p className="text-sm text-slate-400">
                        {getCountdownText(nextEvent.date)}
                        {formatStartTime(nextEvent.startTime) ? ` · ${formatStartTime(nextEvent.startTime)}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(nextEvent.status)}>
                    {getStatusLabel(nextEvent.status)}
                  </Badge>
                </div>
                
                <div className="mb-3 flex items-center gap-2">
                  {getEventTypeIcon(nextEvent.type)}
                  <h4 className="text-lg font-semibold tracking-tight text-white">
                    {nextEvent.title}
                  </h4>
                </div>
                
                <div className="mb-3 grid grid-cols-1 gap-3 text-sm text-slate-400 md:grid-cols-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{locationLabel(nextEvent)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 shrink-0" />
                    {nextEvent.capacity > 0
                      ? `${nextEvent.ticketSales}/${nextEvent.capacity} tickets`
                      : nextEvent.ticketSales > 0
                        ? `${nextEvent.ticketSales} tickets sold`
                        : 'Tickets TBD'}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    {nextEvent.revenue > 0
                      ? `$${nextEvent.revenue.toLocaleString()}`
                      : 'Revenue TBD'}
                  </div>
                </div>

                {(nextEvent.capacity > 0 || nextEvent.ticketSales > 0) && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Ticket Sales</span>
                      <span className="text-white">
                        {nextEvent.capacity > 0
                          ? Math.round((nextEvent.ticketSales / nextEvent.capacity) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={nextEvent.capacity > 0 ? (nextEvent.ticketSales / nextEvent.capacity) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className={ARTIST_PRIMARY_BTN} asChild>
                    <Link href={`/artist/events/${nextEvent.id}`}>
                      Manage Event
                    </Link>
                  </Button>
                  {nextEvent.ticketUrl && (
                    <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
                      <a href={nextEvent.ticketUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Tickets
                      </a>
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {heading && !nextEvent && (
              <p className="text-sm font-medium text-slate-300">{heading}</p>
            )}

            {listEvents.length > 0 && (
              <div className="space-y-2">
                {listEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/artist/events/${event.id}`}
                    className={cn(
                      ARTIST_INSET,
                      'flex items-start justify-between gap-3 p-3 transition hover:border-purple-400/30 hover:bg-white/5'
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getEventTypeIcon(event.type)}
                        <p className="truncate font-medium tracking-tight text-white">{event.title}</p>
                        <Badge className={cn(getStatusColor(event.status), 'shrink-0')}>
                          {getStatusLabel(event.status)}
                        </Badge>
                        {event.bucket === 'recent' && (
                          <Badge className="shrink-0 border-slate-500/30 bg-slate-500/20 text-slate-300">
                            past
                          </Badge>
                        )}
                        {event.bucket === 'needs_date' && (
                          <Badge className="shrink-0 border-amber-500/30 bg-amber-500/20 text-amber-300">
                            needs date
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{scheduleLabel(event)}</p>
                      <p className="truncate text-sm text-slate-500">{locationLabel(event)}</p>
                      {(event.capacity > 0 || event.ticketSales > 0 || event.revenue > 0 || event.ticketUrl) && (
                        <p className="text-xs text-slate-500">
                          {event.capacity > 0
                            ? `${event.ticketSales}/${event.capacity} tickets`
                            : event.ticketSales > 0
                              ? `${event.ticketSales} tickets`
                              : null}
                          {event.revenue > 0
                            ? `${event.capacity > 0 || event.ticketSales > 0 ? ' · ' : ''}$${event.revenue.toLocaleString()}`
                            : null}
                          {event.ticketUrl ? `${event.capacity > 0 || event.ticketSales > 0 || event.revenue > 0 ? ' · ' : ''}Ticket link` : null}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
                <div className="text-2xl font-bold tracking-tight text-white">{displayEvents.length}</div>
                <div className="text-sm text-slate-400">Total Events</div>
              </div>
              <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
                <div className="text-2xl font-bold tracking-tight text-emerald-400">{confirmedEvents.length}</div>
                <div className="text-sm text-slate-400">Published</div>
              </div>
              <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
                <div className="text-2xl font-bold tracking-tight text-amber-400">{draftEvents.length}</div>
                <div className="text-sm text-slate-400">Drafts</div>
              </div>
              <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
                <div className="text-2xl font-bold tracking-tight text-purple-300">
                  {totalRevenue >= 1000
                    ? `$${(totalRevenue / 1000).toFixed(1)}K`
                    : `$${totalRevenue.toLocaleString()}`}
                </div>
                <div className="text-sm text-slate-400">Projected Revenue</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                size="sm" 
                className={cn(ARTIST_PRIMARY_BTN, 'flex-1')}
                onClick={onCreateEvent}
                asChild
              >
                <Link href="/artist/events/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Link>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className={ARTIST_OUTLINE_BTN}
                asChild
              >
                <Link href="/artist/events">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  View Events
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-slate-500" />
            <p className="mb-4 text-slate-400">No upcoming events scheduled</p>
            <Button 
              className={ARTIST_PRIMARY_BTN}
              onClick={onCreateEvent}
              asChild
            >
              <Link href="/artist/events/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Event
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
