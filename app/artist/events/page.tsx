'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock,
  MapPin, 
  Users,
  Heart, 
  MessageCircle, 
  Share2,
  Settings,
  Edit,
  Pin,
  Send,
  Loader2,
  ExternalLink,
  UserPlus,
  Star,
  ChevronDown,
  ChevronUp,
  Ticket,
  Music,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  Activity,
  Zap,
  Radio,
  Headphones,
  Plus,
  Download,
  Bell,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { formatSafeNumber } from "@/lib/format/number-format"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EnhancedEventCreator } from '@/components/events/enhanced-event-creator'
import { dashboardCreatePattern } from '@/components/dashboard/dashboard-create-pattern'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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
  const { user, loading: isUserLoading } = useAuth()
  
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("overview")
  
  const supabase = createClientComponentClient()

  // Stats calculation
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => e.status === 'published').length,
    completedEvents: 0,
    cancelledEvents: events.filter(e => e.status === 'cancelled').length,
    totalCapacity: events.reduce((sum, e) => sum + (e.capacity || 0), 0)
  }

  // Load events
  useEffect(() => {
    if (user) loadEvents()
  }, [user])

  const loadEvents = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('artist_id', user.id)
        .order('event_date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setDeleteEventId(null)
      toast.success('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  const handlePublishEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId)
        .eq("artist_id", user?.id)

      if (error) throw error
      await loadEvents()
      toast.success("Event published")
    } catch (error) {
      console.error("Error publishing event:", error)
      toast.error("Failed to publish event")
    }
  }

  const handleEventCreated = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev])
    setShowCreateModal(false)
    toast.success('Event created successfully!')
  }



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white">Loading events...</span>
            </div>
      </div>
    )
  }

    return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-blue-500/25 to-purple-500/25 p-3">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Events</h1>
            <p className="text-gray-400">Manage your shows, tours, and appearances</p>
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
              className="border-slate-700 text-gray-300 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button 
            onClick={() => {
              setEditingEvent(null)
              setShowCreateModal(true)
            }}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Upcoming</p>
                <p className="text-2xl font-bold text-white">{stats.upcomingEvents}</p>
              </div>
              <Bell className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-white">{stats.completedEvents}</p>
              </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-400">Cancelled</p>
                  <p className="text-2xl font-bold text-white">{stats.cancelledEvents}</p>
              </div>
                <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-400">Total Capacity</p>
                  <p className="text-2xl font-bold text-white">{formatSafeNumber(stats.totalCapacity)}</p>
              </div>
                <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Events List */}
        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Your Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
                <p className="text-gray-400 mb-6">Create your first event to get started</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                  <div key={event.id} className={dashboardCreatePattern.panel}>
                    <div className="flex-shrink-0">
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/30 to-blue-500/30">
                        <Calendar className="h-8 w-8 text-white" />
                      </div>
                    </div>
                        
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">{event.name}</h3>
                        <Badge 
                          variant={
                            event.status === 'published' ? 'default' :
                            event.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {event.status.replace('_', ' ')}
                        </Badge>
                          </div>
                      <p className="text-gray-400 text-sm mb-2">{event.description || "No description"}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
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
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => router.push(`/artist/events/${event.id}/manage`)}
                          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
                          size="sm"
                        >
                          Manage Event
                        </Button>
                        <Button
                          onClick={() => router.push(`/events/${event.slug || event.id}`)}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                          size="sm"
                        >
                          View Public Page
                        </Button>
                        {event.status === "draft" && (
                          <Button
                            onClick={() => event.id && handlePublishEvent(event.id)}
                            variant="outline"
                            className="border-green-600 text-green-300 hover:bg-green-900/20"
                            size="sm"
                          >
                            Publish Event
                          </Button>
                        )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingEvent(event)
                              setShowCreateModal(true)
                            }}
                            className="text-white hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/events/${event.slug || event.id}`)}
                            className="text-white hover:bg-slate-700"
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
                            className="text-white hover:bg-slate-700"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Copy Event Link
                          </DropdownMenuItem>
                              <DropdownMenuItem 
                            onClick={() => setDeleteEventId(event.id || '')}
                            className="text-red-400 hover:bg-red-500/10"
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
                  
      {/* Enhanced Event Creator Modal */}
      <EnhancedEventCreator
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingEvent(null)
        }}
        onEventCreated={handleEventCreated}
        editingEvent={editingEvent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this event? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteEventId && handleDeleteEvent(deleteEventId)}
              className="bg-red-600 hover:bg-red-700"
                >
              Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 