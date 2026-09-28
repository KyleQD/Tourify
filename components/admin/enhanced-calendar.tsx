"use client"

/** Admin Dashboard Builder: Superseded by admin-calendar-view.tsx (cmp-enhanced-calendar wont-fix). */

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarFilters } from "./calendar-filters"
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  Search,
  Grid3X3,
  CalendarDays,
  Clock3,
  Star,
  Target,
  Zap,
  Building,
  Music,
  Ticket,
  Truck,
  DollarSign,
  FileText,
  Phone,
  Mail,
  ExternalLink,
  Bell,
  UserPlus,
  Check,
  Sparkles,
  Palette,
  Layers,
  Globe,
  Shield,
  Zap as ZapIcon
} from "lucide-react"
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  type: 'tour' | 'event' | 'task' | 'meeting' | 'deadline' | 'booking' | 'payment' | 'logistics'
  start: Date
  end: Date
  color: string
  description?: string
  location?: string
  attendees?: string[]
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  originalData?: any
}

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  status: 'active' | 'inactive'
}

interface DayExpandedViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: Date) => void
  onClose: () => void
}

interface AddEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  onSubmit: (eventData: any) => Promise<void>
}



function DayExpandedView({ date, events, onEventClick, onAddEvent, onClose }: DayExpandedViewProps) {
  const dayEvents = events.filter(event => isSameDay(new Date(event.start), date))
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tour': return <Music className="h-4 w-4" />
      case 'event': return <CalendarIcon className="h-4 w-4" />
      case 'task': return <Target className="h-4 w-4" />
      case 'meeting': return <Users className="h-4 w-4" />
      case 'deadline': return <AlertCircle className="h-4 w-4" />
      case 'booking': return <Ticket className="h-4 w-4" />
      case 'payment': return <DollarSign className="h-4 w-4" />
      case 'logistics': return <Truck className="h-4 w-4" />
      default: return <CalendarIcon className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'ongoing': return <Play className="h-4 w-4 text-blue-500" />
      case 'cancelled': return <X className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-500/10 text-red-100'
      case 'high': return 'border-orange-500 bg-orange-500/10 text-orange-100'
      case 'medium': return 'border-blue-500 bg-blue-500/10 text-blue-100'
      case 'low': return 'border-gray-500 bg-gray-500/10 text-gray-100'
      default: return 'border-slate-500 bg-slate-500/10 text-slate-100'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-slate-400">
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onAddEvent(date)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {dayEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No events scheduled</h3>
              <p className="text-slate-500 mb-4">This day is free for new events and tasks</p>
              <Button
                onClick={() => onAddEvent(date)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Something
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {dayEvents
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${getPriorityColor(event.priority)}`}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          {getEventIcon(event.type)}
                          {getStatusIcon(event.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-white">{event.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                            <Badge 
                              variant={event.priority === 'urgent' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {event.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">
                            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                          </p>
                          {event.description && (
                            <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          {event.location && (
                            <div className="flex items-center text-sm text-slate-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center text-sm text-slate-500 mt-1">
                              <Users className="h-3 w-3 mr-1" />
                              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function AddEventModal({ open, onOpenChange, selectedDate, onSubmit }: AddEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'event',
    description: '',
    location: '',
    date: selectedDate,
    startTime: '09:00',
    endTime: '10:00',
    priority: 'medium',
    attendees: [] as string[],
    reminders: [] as string[],
    enableReminders: false,
    sendNotifications: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTeamSelector, setShowTeamSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false)

  const reminderOptions = [
    { value: '5min', label: '5 minutes before' },
    { value: '15min', label: '15 minutes before' },
    { value: '30min', label: '30 minutes before' },
    { value: '1hour', label: '1 hour before' },
    { value: '1day', label: '1 day before' }
  ]

  // Fetch team members when modal opens
  useEffect(() => {
    if (open && teamMembers.length === 0) {
      fetchTeamMembers()
    }
  }, [open])

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeamMembers(true)
      const response = await fetch('/api/admin/team-members')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.teamMembers || [])
      } else {
        console.error('Failed to fetch team members')
        setTeamMembers([])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
    } finally {
      setIsLoadingTeamMembers(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAttendeeToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(memberId)
        ? prev.attendees.filter(id => id !== memberId)
        : [...prev.attendees, memberId]
    }))
  }

  const handleReminderToggle = (reminder: string) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.includes(reminder)
        ? prev.reminders.filter(r => r !== reminder)
        : [...prev.reminders, reminder]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      // Combine date with times
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`)

      const eventData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        location: formData.location,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        priority: formData.priority,
        attendees: formData.attendees,
        reminders: formData.reminders,
        enableReminders: formData.enableReminders,
        sendNotifications: formData.sendNotifications
      }

      await onSubmit(eventData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTeamMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedMembers = teamMembers.filter(member => 
    formData.attendees.includes(member.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 max-w-2xl backdrop-blur-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-t-lg" />
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Schedule New Event
              </DialogTitle>
            </div>
            <p className="text-slate-400">Create a futuristic event with smart notifications</p>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {/* Event Details Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Event Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Event Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter event title"
                  className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Event Type</label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="tour">Tour</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event description"
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Event location"
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Date & Time</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 hover:border-purple-500/50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && handleInputChange('date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Start Time</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">End Time</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>
            </div>
          </div>

          {/* Team & Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Team & Notifications</h3>
            </div>
            
            <div className="space-y-4">
              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300">Team Members</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTeamSelector(!showTeamSelector)}
                    className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-purple-500/50"
                    disabled={isLoadingTeamMembers}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {showTeamSelector ? 'Hide' : 'Add'} Members
                    {isLoadingTeamMembers && (
                      <div className="ml-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                  </Button>
                </div>
                
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{member.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAttendeeToggle(member.id)}
                          className="h-4 w-4 p-0 text-slate-400 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {showTeamSelector && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Input
                        placeholder="Search team members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {isLoadingTeamMembers ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            <span className="ml-2 text-sm text-slate-400">Loading team members...</span>
                          </div>
                        ) : filteredTeamMembers.length === 0 ? (
                          <div className="text-center py-4 text-slate-400">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No team members found</p>
                          </div>
                        ) : (
                          filteredTeamMembers.map(member => (
                            <div
                              key={member.id}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer"
                              onClick={() => handleAttendeeToggle(member.id)}
                            >
                              <Checkbox
                                checked={formData.attendees.includes(member.id)}
                                className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage 
                                  src={member.avatar && member.avatar.startsWith('http') ? member.avatar : undefined} 
                                  alt={member.name}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{member.name}</p>
                                <p className="text-xs text-slate-400">{member.role}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Send Notifications</p>
                    <p className="text-xs text-slate-400">Notify team members about this event</p>
                  </div>
                </div>
                <Switch
                  checked={formData.sendNotifications}
                  onCheckedChange={(checked) => handleInputChange('sendNotifications', checked)}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Reminders Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Smart Reminders</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <ZapIcon className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Enable Reminders</p>
                    <p className="text-xs text-slate-400">Set up automated reminders for this event</p>
                  </div>
                </div>
                <Switch
                  checked={formData.enableReminders}
                  onCheckedChange={(checked) => handleInputChange('enableReminders', checked)}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <AnimatePresence>
                {formData.enableReminders && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-slate-300">Select reminder times:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {reminderOptions.map(option => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer"
                          onClick={() => handleReminderToggle(option.value)}
                        >
                          <Checkbox
                            checked={formData.reminders.includes(option.value)}
                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                          />
                          <span className="text-sm text-white">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Priority Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-pink-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Priority & Settings</h3>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Priority Level</label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Bottom padding to ensure content doesn't get cut off */}
          <div className="h-4" />
        </form>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/50 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-purple-500/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Create Event</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EnhancedCalendarProps {
  events: CalendarEvent[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (eventData: any) => Promise<void>
  view: 'month' | 'week' | 'day'
}

export function EnhancedCalendar({ 
  events, 
  currentDate, 
  onDateChange, 
  onEventClick, 
  onAddEvent,
  view 
}: EnhancedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [expandedDay, setExpandedDay] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addEventDate, setAddEventDate] = useState<Date>(new Date())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    eventType: 'all',
    status: 'all',
    priority: 'all',
    dateRange: { from: null as Date | null, to: null as Date | null }
  })

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), date))
  }

  const getEventColor = (event: CalendarEvent) => {
    // Use the color from the API if available, otherwise fall back to type-based colors
    if (event.color) {
      const colorMap: { [key: string]: string } = {
        'red': 'bg-gradient-to-r from-red-500 to-red-600',
        'orange': 'bg-gradient-to-r from-orange-500 to-orange-600',
        'yellow': 'bg-gradient-to-r from-yellow-500 to-yellow-600',
        'green': 'bg-gradient-to-r from-green-500 to-green-600',
        'blue': 'bg-gradient-to-r from-blue-500 to-blue-600',
        'purple': 'bg-gradient-to-r from-purple-500 to-purple-600',
        'indigo': 'bg-gradient-to-r from-indigo-500 to-indigo-600',
        'emerald': 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        'gray': 'bg-gradient-to-r from-gray-500 to-gray-600'
      }
      return colorMap[event.color] || colorMap['blue']
    }
    
    // Fallback to type-based colors
    switch (event.type) {
      case 'tour': return 'bg-gradient-to-r from-purple-500 to-blue-500'
      case 'event': return 'bg-gradient-to-r from-green-500 to-emerald-500'
      case 'task': return 'bg-gradient-to-r from-orange-500 to-red-500'
      case 'meeting': return 'bg-gradient-to-r from-cyan-500 to-blue-500'
      case 'deadline': return 'bg-gradient-to-r from-red-500 to-pink-500'
      case 'booking': return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'payment': return 'bg-gradient-to-r from-emerald-500 to-green-500'
      case 'logistics': return 'bg-gradient-to-r from-indigo-500 to-purple-500'
      default: return 'bg-gradient-to-r from-slate-500 to-gray-500'
    }
  }

  const handleDayClick = (date: Date) => {
    setExpandedDay(date)
  }

  const handleAddEvent = (date: Date) => {
    setAddEventDate(date)
    setShowAddModal(true)
    setExpandedDay(null)
  }

  const handleCreateEvent = async (eventData: any) => {
    await onAddEvent(eventData)
    setShowAddModal(false)
  }

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      eventType: 'all',
      status: 'all',
      priority: 'all',
      dateRange: { from: null, to: null }
    })
  }

  // Filter events based on current filters
  const filteredEvents = events.filter(event => {
    if (filters.eventType !== 'all' && event.type !== filters.eventType) return false
    if (filters.status !== 'all' && event.status !== filters.status) return false
    if (filters.priority !== 'all' && event.priority !== filters.priority) return false
    if (filters.dateRange.from && new Date(event.start) < filters.dateRange.from) return false
    if (filters.dateRange.to && new Date(event.start) > filters.dateRange.to) return false
    return true
  })

  // Calculate event summary
  const eventSummary = {
    events: events.filter(e => e.type === 'event').length,
    tours: events.filter(e => e.type === 'tour').length,
    tasks: events.filter(e => e.type === 'task').length,
    meetings: events.filter(e => e.type === 'meeting').length,
    deadlines: events.filter(e => e.type === 'deadline').length,
    bookings: events.filter(e => e.type === 'booking').length,
    payments: events.filter(e => e.type === 'payment').length,
    logistics: events.filter(e => e.type === 'logistics').length
  }

  if (view === 'day') {
    const dayEvents = getEventsForDate(currentDate).filter(event => 
      filteredEvents.some(fe => fe.id === event.id)
    )
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(subMonths(currentDate, 1))}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(new Date())}
                className="text-slate-400 hover:text-white"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(addMonths(currentDate, 1))}
                className="text-slate-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dayEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events scheduled for this day</p>
                <Button
                  onClick={() => handleAddEvent(currentDate)}
                  variant="outline"
                  className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            ) : (
              dayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-lg border border-slate-600/30 cursor-pointer ${getEventColor(event)}`}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-white/20"></div>
                      <div>
                        <h4 className="font-medium text-white">{event.title}</h4>
                        <p className="text-sm text-white/80">
                          {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                        </p>
                        {event.location && (
                          <p className="text-xs text-white/60 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const days = getDaysInMonth(currentDate)

  return (
    <>
      {/* Calendar Filters */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <CalendarFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                eventSummary={eventSummary}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(subMonths(currentDate, 1))}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(new Date())}
                className="text-slate-400 hover:text-white"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(addMonths(currentDate, 1))}
                className="text-slate-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="h-32"></div>
              }
              const dayEvents = getEventsForDate(date).filter(event => 
              filteredEvents.some(fe => fe.id === event.id)
            )
              const isToday = isSameDay(date, new Date())
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "h-32 p-1 rounded-lg border cursor-pointer transition-all duration-200",
                    isToday && "border-purple-500/50 bg-purple-500/10",
                    isSelected && "border-blue-500/50 bg-blue-500/10",
                    !isToday && !isSelected && "border-slate-600/30 bg-slate-800/20 hover:border-slate-500/50"
                  )}
                  onClick={() => handleDayClick(date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn(
                      "text-sm font-medium",
                      isToday && "text-purple-400",
                      isSelected && "text-blue-400",
                      !isToday && !isSelected && "text-white"
                    )}>
                      {date.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1">
                        {dayEvents.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded cursor-pointer ${getEventColor(event)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      >
                        <div className="text-white font-medium truncate">{event.title}</div>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-slate-400 text-center">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {expandedDay && (
                <DayExpandedView
        date={expandedDay}
        events={filteredEvents}
        onEventClick={onEventClick}
        onAddEvent={handleAddEvent}
        onClose={() => setExpandedDay(null)}
      />
        )}
      </AnimatePresence>

      <AddEventModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        selectedDate={addEventDate}
        onSubmit={handleCreateEvent}
      />
    </>
  )
} 