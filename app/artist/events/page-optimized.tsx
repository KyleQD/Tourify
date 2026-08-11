"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Users, 
  DollarSign, 
  Bell, 
  BarChart, 
  Megaphone, 
  Wallet, 
  Settings as SettingsIcon,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Eye,
  Share2,
  Copy,
  ExternalLink,
  TrendingUp,
  Activity,
  Loader2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useArtistEvents } from "@/hooks/use-artist-events"
import { useArtist } from "@/contexts/artist-context"
import { EventData } from "@/lib/services/artist.service"
import { toast } from "sonner"
import Link from "next/link"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

function CreateEventModal({ isOpen, onClose, onEventCreated }: { 
  isOpen: boolean
  onClose: () => void
  onEventCreated: () => void
}) {
  const { createEvent, isCreating } = useArtistEvents()
  const [formData, setFormData] = useState<Partial<EventData>>({
    name: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    venue: "",
    status: "draft",
    type: "concert",
    capacity: 0,
    ticket_price: 0,
    currency: "USD",
  })

  const handleInputChange = (field: keyof EventData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.venue || !formData.date) {
      toast.error("Please fill in all required fields")
      return
    }

    const success = await createEvent(formData as EventData)
    if (success) {
      setFormData({
        name: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        venue: "",
        status: "draft",
        type: "concert",
        capacity: 0,
        ticket_price: 0,
        currency: "USD",
      })
      onEventCreated()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={detailSurfacePattern.label}>Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={detailSurfacePattern.input}
                placeholder="Enter event name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue" className={detailSurfacePattern.label}>Venue *</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                className={detailSurfacePattern.input}
                placeholder="Enter venue name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={detailSurfacePattern.textarea}
              placeholder="Describe your event..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className={detailSurfacePattern.label}>Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={detailSurfacePattern.input}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className={detailSurfacePattern.label}>Event Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="concert" className="text-white">Concert</SelectItem>
                  <SelectItem value="festival" className="text-white">Festival</SelectItem>
                  <SelectItem value="tour" className="text-white">Tour</SelectItem>
                  <SelectItem value="other" className="text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className={detailSurfacePattern.label}>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="draft" className="text-white">Draft</SelectItem>
                  <SelectItem value="published" className="text-white">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity" className={detailSurfacePattern.label}>Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                className={detailSurfacePattern.input}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket_price" className={detailSurfacePattern.label}>Ticket Price</Label>
              <div className="flex space-x-2">
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger className={cn("w-20", detailSurfacePattern.selectTrigger)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="USD" className="text-white">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="ticket_price"
                  type="number"
                  value={formData.ticket_price}
                  onChange={(e) => handleInputChange('ticket_price', parseFloat(e.target.value) || 0)}
                  className={detailSurfacePattern.input}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} className={detailSurfacePattern.btnOutline}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating}
              className={detailSurfacePattern.btnPrimary}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EventCard({ event, onEdit, onDelete }: { 
  event: EventData
  onEdit: (event: EventData) => void
  onDelete: (id: string) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsDeleting(true)
      onDelete(event.id!)
      setIsDeleting(false)
    }
  }

  const handleShare = () => {
    const eventUrl = `${window.location.origin}/events/${event.id}`
    navigator.clipboard.writeText(eventUrl)
    toast.success('Event link copied to clipboard!')
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-white group-hover:text-purple-300 transition-colors">
                {event.name}
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-slate-400">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {format(new Date(event.date), "MMM dd, yyyy")}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {event.venue}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={event.status === 'published' ? 'default' : 'secondary'}
                className={event.status === 'published' ? 'bg-green-600' : 'bg-yellow-600'}
              >
                {event.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {event.type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {event.description && (
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {event.capacity && (
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-purple-400" />
                <span className="text-slate-300">{event.capacity} capacity</span>
              </div>
            )}
            {event.ticket_price && (
              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-2 text-green-400" />
                <span className="text-slate-300">{event.currency} {event.ticket_price}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(event)}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-blue-400"
                asChild
              >
                <Link href={`/artist/events/${event.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-slate-400 hover:text-red-400"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function OptimizedEventsPage() {
  const { profile } = useArtist()
  const { 
    events, 
    isLoading, 
    getUpcomingEvents, 
    getDraftEvents, 
    getEventStats,
    loadEvents,
    deleteEvent
  } = useArtistEvents()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)

  const stats = getEventStats()
  const upcomingEvents = getUpcomingEvents()
  const draftEvents = getDraftEvents()

  const handleEventCreated = () => {
    loadEvents() // Refresh events list
  }

  const handleEditEvent = (event: EventData) => {
    setSelectedEvent(event)
    // Open edit modal (would be similar to create modal)
  }

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="text-xl">Loading your events...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Events & Shows
              </h1>
              <p className="text-sm text-slate-400">Plan, promote, and manage your shows and tours</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </motion.div>
        </div>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-6 md:grid-cols-4"
        >
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Total Events</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Upcoming</p>
                  <p className="text-2xl font-bold text-white">{stats.upcoming}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Drafts</p>
                  <p className="text-2xl font-bold text-white">{stats.drafts}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Projected Revenue</p>
                  <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Events List */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700/50">
            <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({draftEvents.length})</TabsTrigger>
            <TabsTrigger value="all">All Events ({events.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            {upcomingEvents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <EventCard 
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                <p className="text-slate-400 mb-4">No upcoming events scheduled</p>
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  Create Your First Event
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-6">
            {draftEvents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {draftEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <EventCard 
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Edit className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                <p className="text-slate-400">No draft events</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <EventCard 
                    event={event}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  )
} 