'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Calendar, 
  MapPin, 
  Users,
  Share2,
  Edit,
  ExternalLink,
  Plus,
  Download,
  Bell,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import { formatSafeNumber } from "@/lib/format/number-format"
import { useRouter } from 'next/navigation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { artistEventStatusClass, artistEventTone, artistEventUI } from '@/components/events/artist-event-ui'
import { cn } from '@/lib/utils'

function formatEventDate(value?: string) {
  if (!value) return 'Date TBD'
  const parsed = value.includes('T') ? parseISO(value) : new Date(`${value}T00:00:00`)
  if (!isValid(parsed)) return 'Date TBD'
  return format(parsed, 'MMM d, yyyy')
}

interface Event {
  id?: string
  name: string
  description?: string
  event_type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  address?: string
  city?: string
  state?: string
  country?: string
  event_date: string
  start_time?: string
  end_time?: string
  doors_open?: string
  capacity?: number
  status: 'draft' | 'published' | 'cancelled'
  setlist?: string[]
  tags?: string[]
  slug?: string
  artist_id?: string
  created_at?: string
}

export default function EventsPage() {
  const router = useRouter()
  
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => e.status === 'published' && e.event_date >= today).length,
    completedEvents: events.filter(e => e.status === 'published' && e.event_date < today).length,
    cancelledEvents: events.filter(e => e.status === 'cancelled').length,
    totalCapacity: events.reduce((sum, e) => sum + (e.capacity || 0), 0),
    withTicketLink: events.filter(e => Boolean((e as any).ticket_url)).length,
  }

  const loadEvents = React.useCallback(async () => {
    try {
      setIsLoading(true)
      // Cookie-auth API — do not block on client supabase user hydration (can hang while cookies work).
      const response = await fetch('/api/artist/events', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to load events')

      const rows = (payload.events || []).map((event: any) => ({
        ...event,
        name: event.name || event.title || 'Untitled event',
        event_type: event.event_type || event.type || 'other',
        event_date: event.event_date || '',
      }))
      setEvents(rows)
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load events')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/artist/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Failed to delete event')
      
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setDeleteEventId(null)
      toast.success('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }

  const handlePublishEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/artist/events/${eventId}/publish`, {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to publish event")
      await loadEvents()
      toast.success("Event published")
    } catch (error) {
      console.error("Error publishing event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to publish event")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className={cn(artistEventUI.panelPadded, "flex items-center gap-3")}>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-slate-200">Loading events...</span>
        </div>
      </div>
    )
  }

    return (
    <>
      <div className={artistEventUI.page}>
        <div className={artistEventUI.pageGlow} />
      <div className={artistEventUI.shell}>
      {/* Header */}
      <div className={cn(artistEventUI.headerPanel, "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between")}>
        <div className="flex items-center gap-4">
          <div className={cn(artistEventUI.iconWell, "h-12 w-12")}>
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={artistEventUI.eyebrow}>Artist events</span>
            </div>
            <h1 className={artistEventUI.title}>Events</h1>
            <p className={artistEventUI.subtitle}>Manage your shows, tours, public pages, and producer workflows.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                // Simple CSV export functionality
                const csvData = events.map(event => ({
                  title: event.name,
                  date: event.event_date,
                  venue: event.venue_name || '',
                  city: event.city || '',
                  status: event.status,
                  type: event.event_type
                }))
                
                const headers = Object.keys(csvData[0])
                const csvContent = [
                  headers.join(','),
                  ...csvData.map(row => 
                    headers.map(header => row[header as keyof typeof row]).join(',')
                  )
                ].join('\n')
                
                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'events.csv'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                toast.success('Events exported to CSV')
              }}
              className={artistEventUI.buttonOutline}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button 
            onClick={() => router.push("/artist/events/create")}
            className={artistEventUI.buttonAccent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card className={artistEventUI.panel}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={artistEventUI.muted}>Total Events</p>
                <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-cyan-300" />
            </div>
          </CardContent>
        </Card>
        <Card className={artistEventUI.panel}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={artistEventUI.muted}>Upcoming</p>
                <p className="text-2xl font-bold text-white">{stats.upcomingEvents}</p>
              </div>
              <Bell className="h-8 w-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className={artistEventUI.panel}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className={artistEventUI.muted}>Completed</p>
                  <p className="text-2xl font-bold text-white">{stats.completedEvents}</p>
              </div>
                <CheckCircle className="h-8 w-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className={artistEventUI.panel}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className={artistEventUI.muted}>Cancelled</p>
                  <p className="text-2xl font-bold text-white">{stats.cancelledEvents}</p>
              </div>
                <XCircle className="h-8 w-8 text-red-300" />
            </div>
          </CardContent>
        </Card>
        <Card className={artistEventUI.panel}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className={artistEventUI.muted}>Total Capacity</p>
                  <p className="text-2xl font-bold text-white">{formatSafeNumber(stats.totalCapacity)}</p>
              </div>
                <Users className="h-8 w-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Events List */}
        <Card className={artistEventUI.panel}>
          <CardHeader>
            <CardTitle className="text-white">Your Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className={artistEventUI.empty}>
                <Calendar className="mx-auto mb-4 h-16 w-16 text-slate-500" />
                <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
                <p className="mb-6 text-slate-400">Create your first event to get started</p>
                <Button
                  onClick={() => router.push("/artist/events/create")}
                  className={artistEventUI.buttonAccent}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                  <div key={event.id} className={cn(artistEventUI.panelPadded, artistEventUI.interactive, "flex flex-col gap-4 lg:flex-row lg:items-center")}>
                    <div className="flex-shrink-0">
                      <div className={cn(artistEventUI.iconWell, "h-20 w-20")}>
                        <Calendar className="h-8 w-8" />
                      </div>
                    </div>
                        
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">{event.name}</h3>
                        <Badge 
                          variant="outline"
                          className={cn("text-xs capitalize", artistEventStatusClass(event.status))}
                        >
                          {event.status.replace('_', ' ')}
                        </Badge>
                          </div>
                      <p className="text-slate-400 text-sm mb-2">{event.description || "No description"}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatEventDate(event.event_date)}
                        </span>
                          {event.venue_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.venue_name || "TBD"}
                          </span>
                        )}
                            {event.capacity && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.capacity}
                              </span>
                            )}
                          </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Button
                          onClick={() => router.push(`/artist/events/${event.id}`)}
                          className={artistEventUI.buttonPrimary}
                          size="sm"
                        >
                          Manage Event
                        </Button>
                        <Button
                          onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                          variant="outline"
                          className={artistEventUI.buttonOutline}
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => router.push(`/events/${event.slug || event.id}`)}
                          variant="outline"
                          className={artistEventUI.buttonOutline}
                          size="sm"
                        >
                          View Public Page
                        </Button>
                        {event.status === "draft" && (
                          <Button
                            onClick={() => event.id && handlePublishEvent(event.id)}
                            variant="outline"
                            className={cn(artistEventUI.buttonOutline, artistEventTone("emerald"))}
                            size="sm"
                          >
                            Publish Event
                          </Button>
                        )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={artistEventUI.buttonGhost} aria-label={`More actions for ${event.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="border-slate-700 bg-slate-950 text-slate-100">
                          <DropdownMenuItem 
                            onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                            className="focus:bg-slate-800"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit in Producer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/events/${event.slug || event.id}`)}
                            className="focus:bg-slate-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Public Event Page
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const url = `${window.location.origin}/events/${event.slug || event.id}`
                              navigator.clipboard.writeText(url)
                              toast.success('Event link copied to clipboard')
                            }}
                            className="focus:bg-slate-800"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Copy Event Link
                          </DropdownMenuItem>
                              <DropdownMenuItem 
                            onClick={() => setDeleteEventId(event.id || '')}
                            className="text-red-300 focus:bg-red-500/10 focus:text-red-200"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </div>
              ))}
            </div>
          )}
            </CardContent>
          </Card>
                  </div>
                  
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent className={artistEventUI.dialog}>
            <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this event? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={artistEventUI.buttonOutline}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteEventId && handleDeleteEvent(deleteEventId)}
              className="rounded-xl bg-red-600 text-white hover:bg-red-500"
                >
              Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  )
}
