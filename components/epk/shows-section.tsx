"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, X, ExternalLink, Calendar, MapPin, Ticket, Clock, 
  Music, Users, TrendingUp, CheckCircle, AlertCircle, Upload, Share2
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface Show {
  id: string
  date: string
  venue: string
  location: string
  ticketUrl: string
  status: 'upcoming' | 'completed' | 'cancelled'
  capacity?: number
  attendance?: number
  setLength?: number
  notes?: string
  poster?: string
  featured?: boolean
}

interface ShowsSectionProps {
  shows: Show[]
  onShowsChange: (shows: Show[]) => void
}

const SHOW_STATUSES = [
  { id: 'upcoming', name: 'Upcoming', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { id: 'completed', name: 'Completed', color: 'bg-green-500', textColor: 'text-green-500' },
  { id: 'cancelled', name: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-500' }
]

function ShowCard({ show, onEdit, onRemove, onToggleFeatured, onShare }: {
  show: Show
  onEdit: (show: Show) => void
  onRemove: (id: string) => void
  onToggleFeatured: (id: string) => void
  onShare: (show: Show) => void
}) {
  const { toast } = useToast()
  const status = SHOW_STATUSES.find(s => s.id === show.status)
  const showDate = new Date(show.date)
  const isUpcoming = showDate > new Date()

  const handleCopyLink = () => {
    if (show.ticketUrl) {
      navigator.clipboard.writeText(show.ticketUrl)
      toast({
        title: "Ticket link copied!",
        description: "Ticket URL copied to clipboard.",
      })
    }
  }

  return (
    <Card className="group relative rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a] hover:shadow-2xl transition-all">
      {show.featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-purple-600 text-white">Featured</Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white">{show.venue}</h3>
              <Badge className={`${status?.color} text-white`}>
                {status?.name}
              </Badge>
            </div>
            
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatSafeDate(showDate.toISOString())}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{show.location}</span>
              </div>
              
              {show.capacity && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {show.attendance ? `${show.attendance}/${show.capacity}` : show.capacity} capacity
                  </span>
                </div>
              )}
              
              {show.setLength && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{show.setLength} minute set</span>
                </div>
              )}
            </div>
            
            {show.notes && (
              <p className="text-gray-300 mt-3 text-sm">{show.notes}</p>
            )}
          </div>
          
          {show.poster && (
            <div className="w-24 h-32 ml-4 rounded-lg overflow-hidden bg-gray-700">
              <img src={show.poster} alt="Show poster" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {show.ticketUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="border-gray-700 text-white hover:bg-purple-600/20"
              >
                <Ticket className="h-3 w-3 mr-2" />
                Tickets
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShare(show)}
              className="text-gray-400 hover:text-white"
            >
              <Share2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleFeatured(show.id)}
              className={show.featured ? "text-purple-400" : "text-gray-400"}
            >
              Featured
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(show)}
              className="text-gray-400 hover:text-white"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(show.id)}
              className="text-gray-400 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AddShowModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean
  onClose: () => void
  onAdd: (show: Omit<Show, 'id'>) => void
}) {
  const [formData, setFormData] = useState({
    date: '',
    venue: '',
    location: '',
    ticketUrl: '',
    status: 'upcoming' as const,
    capacity: '',
    attendance: '',
    setLength: '',
    notes: '',
    poster: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    onAdd({
      ...formData,
      capacity: formData.capacity ? Number(formData.capacity) : undefined,
      attendance: formData.attendance ? Number(formData.attendance) : undefined,
      setLength: formData.setLength ? Number(formData.setLength) : undefined,
    })

    // Reset form
    setFormData({
      date: '',
      venue: '',
      location: '',
      ticketUrl: '',
      status: 'upcoming',
      capacity: '',
      attendance: '',
      setLength: '',
      notes: '',
      poster: ''
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardHeader>
          <CardTitle className="text-white">Add Show/Gig</CardTitle>
          <CardDescription className="text-gray-400">
            Add details about your upcoming or past performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Venue Name</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="The Fillmore"
                  className="bg-[#23263a] border-0 text-white"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white">Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="San Francisco, CA"
                  className="bg-[#23263a] border-0 text-white"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-[#23263a] border-0 text-white"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-[#23263a] border-0 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#23263a] border-gray-700">
                    {SHOW_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id} className="text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-white">Ticket URL (Optional)</Label>
              <Input
                value={formData.ticketUrl}
                onChange={(e) => setFormData({ ...formData, ticketUrl: e.target.value })}
                placeholder="https://tickets.example.com"
                className="bg-[#23263a] border-0 text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Capacity (Optional)</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="500"
                  className="bg-[#23263a] border-0 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Attendance (Optional)</Label>
                <Input
                  type="number"
                  value={formData.attendance}
                  onChange={(e) => setFormData({ ...formData, attendance: e.target.value })}
                  placeholder="450"
                  className="bg-[#23263a] border-0 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Set Length (minutes)</Label>
                <Input
                  type="number"
                  value={formData.setLength}
                  onChange={(e) => setFormData({ ...formData, setLength: e.target.value })}
                  placeholder="60"
                  className="bg-[#23263a] border-0 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white">Show Poster URL (Optional)</Label>
              <Input
                value={formData.poster}
                onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
                placeholder="https://..."
                className="bg-[#23263a] border-0 text-white"
              />
            </div>
            
            <div>
              <Label className="text-white">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details about the show..."
                className="bg-[#23263a] border-0 text-white resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-700 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
              >
                Add Show
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ShowsSection({ shows, onShowsChange }: ShowsSectionProps) {
  const { toast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  const filteredShows = shows.filter(show => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return show.status === 'upcoming'
    if (filter === 'completed') return show.status === 'completed'
    return true
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleAddShow = (showData: Omit<Show, 'id'>) => {
    const newShow: Show = {
      ...showData,
      id: Date.now().toString(),
    }
    onShowsChange([...shows, newShow])
    toast({
      title: "Show added",
      description: "Your show has been added to your EPK.",
    })
  }

  const handleRemoveShow = (id: string) => {
    onShowsChange(shows.filter(show => show.id !== id))
    toast({
      title: "Show removed",
      description: "The show has been removed from your EPK.",
    })
  }

  const handleEditShow = (show: Show) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit functionality",
      description: "Show editing will be available soon.",
    })
  }

  const handleToggleFeatured = (id: string) => {
    onShowsChange(shows.map(show => 
      show.id === id ? { ...show, featured: !show.featured } : show
    ))
  }

  const handleShareShow = (show: Show) => {
    const shareData = {
      title: `${show.venue} - ${show.location}`,
      text: `Check out this show: ${show.venue} in ${show.location} on ${formatSafeDate(show.date)}`,
      url: show.ticketUrl || window.location.href
    }

    if (navigator.share) {
      navigator.share(shareData)
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      toast({
        title: "Show details copied!",
        description: "Show information copied to clipboard.",
      })
    }
  }

  const handleImportFromCalendar = () => {
    // TODO: Implement calendar import
    toast({
      title: "Calendar Import",
      description: "Calendar import will be available soon.",
    })
  }

  const upcomingShows = shows.filter(show => show.status === 'upcoming').length
  const completedShows = shows.filter(show => show.status === 'completed').length
  const totalAttendance = shows.reduce((total, show) => total + (show.attendance || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Shows & Gigs</h2>
          <p className="text-gray-400">Manage your performance history and upcoming events</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleImportFromCalendar}
            variant="outline"
            className="border-gray-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import from Calendar
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Show
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{shows.length}</div>
              <div className="text-xs text-gray-400">Total Shows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{upcomingShows}</div>
              <div className="text-xs text-gray-400">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{completedShows}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalAttendance.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Total Attendance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setFilter('all')}
          variant={filter === 'all' ? 'default' : 'outline'}
          className={filter === 'all' ? 'bg-purple-600 text-white' : 'border-gray-700 text-white'}
        >
          All Shows ({shows.length})
        </Button>
        <Button
          onClick={() => setFilter('upcoming')}
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          className={filter === 'upcoming' ? 'bg-purple-600 text-white' : 'border-gray-700 text-white'}
        >
          Upcoming ({upcomingShows})
        </Button>
        <Button
          onClick={() => setFilter('completed')}
          variant={filter === 'completed' ? 'default' : 'outline'}
          className={filter === 'completed' ? 'bg-purple-600 text-white' : 'border-gray-700 text-white'}
        >
          Past Shows ({completedShows})
        </Button>
      </div>

      {/* Shows List */}
      <div className="space-y-4">
        {filteredShows.length === 0 ? (
          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
            <CardContent className="py-20 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {filter === 'all' ? 'No shows added yet' : `No ${filter} shows`}
              </h3>
              <p className="text-gray-400 mb-6">
                {filter === 'all' 
                  ? 'Start building your performance history'
                  : `Add some ${filter} shows to your EPK`
                }
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Show
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredShows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              onEdit={handleEditShow}
              onRemove={handleRemoveShow}
              onToggleFeatured={handleToggleFeatured}
              onShare={handleShareShow}
            />
          ))
        )}
      </div>

      <AddShowModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddShow}
      />
    </div>
  )
} 