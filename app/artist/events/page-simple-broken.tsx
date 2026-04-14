"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useArtist } from '@/contexts/artist-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, MapPin, Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Event {
  id?: string
  user_id?: string
  title: string
  description?: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_country?: string
  event_date: string
  start_time?: string
  end_time?: string
  doors_open?: string
  ticket_price_min?: number
  ticket_price_max?: number
  capacity?: number
  expected_attendance?: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'draft'
  is_public: boolean
  setlist?: string[]
  notes?: string
  ticket_url?: string
  created_at?: string
  updated_at?: string
}

export default function EventsPage() {
  const router = useRouter()
  const { user, profile, isLoading: isUserLoading } = useArtist()
  
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<Event>({
    title: '',
    description: '',
    type: 'concert',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    venue_country: 'USA',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '19:00',
    end_time: '22:00',
    doors_open: '18:30',
    ticket_price_min: 0,
    ticket_price_max: 0,
    capacity: 0,
    expected_attendance: 0,
    status: 'upcoming',
    is_public: true,
    setlist: [],
    notes: ''
  })

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user])

  useEffect(() => {
    if (editingEvent) {
      setFormData(editingEvent)
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'concert',
        venue_name: '',
        venue_address: '',
        venue_city: '',
        venue_state: '',
        venue_country: 'USA',
        event_date: new Date().toISOString().split('T')[0],
        start_time: '19:00',
        end_time: '22:00',
        doors_open: '18:30',
        ticket_price_min: 0,
        ticket_price_max: 0,
        capacity: 0,
        expected_attendance: 0,
        status: 'upcoming',
        is_public: true,
        setlist: [],
        notes: ''
      })
    }
  }, [editingEvent])

  const loadEvents = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('artist_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load events'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEvent = async () => {
    if (!user || !formData.title || !formData.event_date) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)

      const eventData = {
        ...formData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingEvent?.id) {
        // Update existing event
        const { error } = await supabase
          .from('artist_events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error
        toast.success('Event updated successfully!')
      } else {
        // Create new event
        const { error } = await supabase
          .from('artist_events')
          .insert([{ ...eventData, created_at: new Date().toISOString() }])

        if (error) throw error
        toast.success('Event created successfully!')
      }

      setShowCreateModal(false)
      setEditingEvent(null)
      loadEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save event'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state if user/profile aren't ready
  if (isUserLoading || !user || !profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Events</h1>
              <p className="text-gray-400">
                {isUserLoading ? 'Loading your profile...' : 'Manage your shows, tours, and appearances'}
              </p>
            </div>
          </div>
          <Button 
            disabled
            className="bg-purple-600 hover:bg-purple-700 text-white opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {isUserLoading ? 'Loading your artist profile...' : 'Setting up your account...'}
            </h3>
            <p className="text-gray-400">
              {isUserLoading ? 'Please wait while we fetch your data.' : 'Please wait while we set up your artist account.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
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
              onClick={() => {
                setEditingEvent(null)
                setShowCreateModal(true)
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse rounded-2xl">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3 mb-4"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No events yet</h3>
            <p className="text-gray-400 mb-6">
              Start planning your performances by creating your first event.
            </p>
            <Button 
              onClick={() => {
                setEditingEvent(null)
                setShowCreateModal(true)
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-gray-400 mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span>{event.event_date}</span>
                      </div>
                      {event.start_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-400" />
                          <span>{event.start_time}</span>
                        </div>
                      )}
                      {event.venue_name && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-400" />
                          <span>{event.venue_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEditingEvent(event)
                        setShowCreateModal(true)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Event Details */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-300">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event title..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your event..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Event['type'] }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concert">Concert</SelectItem>
                        <SelectItem value="festival">Festival</SelectItem>
                        <SelectItem value="tour">Tour</SelectItem>
                        <SelectItem value="recording">Recording</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-gray-300">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Event['status'] }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public" className="text-gray-300">Public Event</Label>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="text-gray-300">Event Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time" className="text-gray-300">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doors_open" className="text-gray-300">Doors Open</Label>
                    <Input
                      id="doors_open"
                      type="time"
                      value={formData.doors_open || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, doors_open: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Venue Information */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venue_name" className="text-gray-300">Venue Name</Label>
                  <Input
                    id="venue_name"
                    value={formData.venue_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                    placeholder="Venue name..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue_address" className="text-gray-300">Address</Label>
                  <Input
                    id="venue_address"
                    value={formData.venue_address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue_address: e.target.value }))}
                    placeholder="Street address..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue_city" className="text-gray-300">City</Label>
                    <Input
                      id="venue_city"
                      value={formData.venue_city || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, venue_city: e.target.value }))}
                      placeholder="City..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue_country" className="text-gray-300">Country</Label>
                    <Input
                      id="venue_country"
                      value={formData.venue_country || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, venue_country: e.target.value }))}
                      placeholder="Country..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets & Capacity */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tickets & Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-gray-300">Venue Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_attendance" className="text-gray-300">Expected Attendance</Label>
                    <Input
                      id="expected_attendance"
                      type="number"
                      value={formData.expected_attendance || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_attendance: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket_price_min" className="text-gray-300">Min Ticket Price</Label>
                    <Input
                      id="ticket_price_min"
                      type="number"
                      step="0.01"
                      value={formData.ticket_price_min || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticket_price_min: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket_price_max" className="text-gray-300">Max Ticket Price</Label>
                    <Input
                      id="ticket_price_max"
                      type="number"
                      step="0.01"
                      value={formData.ticket_price_max || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticket_price_max: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_url" className="text-gray-300">Ticket URL</Label>
                  <Input
                    id="ticket_url"
                    type="url"
                    value={formData.ticket_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ticket_url: e.target.value }))}
                    placeholder="https://..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
            <Button 
              onClick={() => setShowCreateModal(false)}
              variant="outline"
              className="border-slate-700 text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEvent}
              disabled={isSubmitting || !formData.title || !formData.event_date}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUserLoading ? 'Loading Profile...' : isSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
