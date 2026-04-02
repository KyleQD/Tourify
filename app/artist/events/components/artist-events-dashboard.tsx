"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Pencil, Users, Calendar, DollarSign, Clock, MapPin, Music, TrendingUp, CheckCircle, AlertTriangle, Search, Filter } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { EventWizardDialog } from "../event-wizard"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createEvent } from "../actions/create-event"
import { updateEvent } from "../actions/update-event"
import { deleteEvent } from "../actions/delete-event"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface Event {
  id: string
  name: string
  date: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  location: string
  venue?: string
  capacity: number
  tickets_sold: number
  revenue: number
  cover_image_url?: string
  created_at: string
  updated_at: string
}

interface ArtistEventsDashboardProps {
  userId: string
}

async function fetchEvents(userId: string): Promise<Event[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', userId)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching events:', error)
    return []
  }
  return data || []
}

function EventCard({ event, onEdit, onDelete }: { event: Event; onEdit: (event: Event) => void; onDelete: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const progress = Math.round((event.tickets_sold / event.capacity) * 100)
  
  function handleDelete() {
    setIsDialogOpen(false)
    onDelete()
  }
  
  return (
    <div className="bg-[#13151c] border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
      {event.cover_image_url && (
        <img 
          src={event.cover_image_url} 
          alt={event.name} 
          className="w-full h-32 object-cover rounded-lg mb-2"
        />
      )}
      <div className="text-lg font-semibold text-white">{event.name}</div>
      <div className="text-gray-400 text-sm flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        {formatSafeDate(event.date)}
      </div>
      <div className="text-gray-400 text-sm flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {event.venue || event.location}
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Tickets Sold</span>
          <span className="text-white">{event.tickets_sold}/{event.capacity}</span>
        </div>
        <Progress value={progress} className="h-2 bg-gray-800" />
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </Badge>
        <Badge variant="outline" className="ml-auto">
          {formatSafeCurrency(event.revenue)}
        </Badge>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-gray-300">Are you sure you want to delete <span className="font-semibold">{event.name}</span>? This action cannot be undone.</div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ArtistEventsDashboard({ userId }: ArtistEventsDashboardProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [events, setEvents] = React.useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = React.useState<Event[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("date")
  const [isLoading, setIsLoading] = React.useState(true)
  const { toast } = useToast()

  React.useEffect(() => {
    async function loadEvents() {
      try {
        const fetchedEvents = await fetchEvents(userId)
        setEvents(fetchedEvents)
        setFilteredEvents(fetchedEvents)
      } catch (error) {
        console.error('Error loading events:', error)
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEvents()
  }, [userId])

  React.useEffect(() => {
    let filtered = [...events]
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(event => event.status === statusFilter)
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case "name":
          return a.name.localeCompare(b.name)
        case "revenue":
          return b.revenue - a.revenue
        case "tickets":
          return b.tickets_sold - a.tickets_sold
        default:
          return 0
      }
    })
    
    setFilteredEvents(filtered)
  }, [events, searchQuery, statusFilter, sortBy])

  async function handleCreateEvent(data: any) {
    try {
      await createEvent(userId, data)
      toast({
        title: "Success",
        description: "Event created successfully"
      })
      setIsCreateOpen(false)
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      })
    }
  }

  async function handleUpdateEvent(eventId: string, data: any) {
    try {
      await updateEvent(userId, eventId, data)
      toast({
        title: "Success",
        description: "Event updated successfully"
      })
    } catch (error) {
      console.error('Error updating event:', error)
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive"
      })
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      await deleteEvent(userId, eventId)
      toast({
        title: "Success",
        description: "Event deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="tickets">Tickets Sold</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Event
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchQuery || statusFilter !== "all" ? "No events match your filters" : "No events found. Click 'Create Event' to get started."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={(event) => handleUpdateEvent(event.id, event)}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      <EventWizardDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateEvent}
      />
    </div>
  )
} 