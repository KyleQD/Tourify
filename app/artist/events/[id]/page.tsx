"use client"

import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  ArrowLeft,
  Calendar, 
  MapPin, 
  Clock,
  Users,
  DollarSign,
  Edit,
  Share2,
  Download,
  Music,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ExternalLink
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Image from "next/image"

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const floatingAnimation = {
  y: [0, -10, 0]
}

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

interface Event {
  id: string
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
  ticket_url?: string
  ticket_price_min?: number
  ticket_price_max?: number
  capacity?: number
  expected_attendance?: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  is_public: boolean
  poster_url?: string
  setlist?: string[]
  notes?: string
  created_at: string
  updated_at: string
}

interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  due_date?: string
  assignee?: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
}

interface CrewMember {
  id: string
  user_id?: string
  email?: string
  name: string
  role: string
  status: 'invited' | 'accepted' | 'declined'
  permissions: string[]
  created_at: string
}

interface Venue {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  capacity: number
  venue_type: string
  amenities: string[]
  contact_email?: string
  booking_status?: 'available' | 'pending' | 'booked' | 'unavailable'
  price_range?: { min: number; max: number }
  images?: string[]
  user_id?: string
}

interface BookingRequest {
  id: string
  venue_id: string
  event_id: string
  message: string
  status: 'pending' | 'approved' | 'declined'
  created_at: string
}

export default function EventDetailPage() {
  const { user } = useArtist()
  const params = useParams()
  const router = useRouter()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' })
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] })
  
  // Crew management state
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [showCrewModal, setShowCrewModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newCrewMember, setNewCrewMember] = useState({ name: '', email: '', role: '', permissions: [] as string[] })
  const [availableRoles] = useState([
    'Production Manager', 'Sound Engineer', 'Lighting Technician', 'Stage Manager', 
    'Security', 'Photographer', 'Videographer', 'Merchandise', 'Tour Manager', 'Roadie'
  ])
  
  // Venue management state
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [showVenueSearch, setShowVenueSearch] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [venueSearchQuery, setVenueSearchQuery] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')

  const eventId = params.id as string

  useEffect(() => {
    if (user && eventId) {
      loadEvent()
      loadTasks()
      loadExpenses()
      loadCrewMembers()
      loadVenues()
      loadBookingRequests()
    }
  }, [user, eventId])

  const loadEvent = async () => {
    if (!user || !eventId) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('artist_id', user.id)
        .single()

      if (error) throw error
      
      if (data) {
        setEvent({
          ...data,
          title: data.name || data.title,
          type: data.event_type || data.type,
          venue_address: data.address || data.venue_address,
          venue_city: data.city || data.venue_city,
          venue_state: data.state || data.venue_state,
          venue_country: data.country || data.venue_country,
          is_public: data.is_public ?? (data.status === 'published'),
        })
      } else {
        toast.error('Event not found')
        router.push('/artist/events')
      }
    } catch (error) {
      console.error('Error loading event:', error)
      toast.error('Failed to load event')
      router.push('/artist/events')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('logistics_tasks')
        .select('id, title, description, completed, due_date, assignee')
        .eq('event_id', eventId)
        .order('due_date', { ascending: true })

      if (error) throw error
      setTasks(data ?? [])
    } catch (err) {
      console.error('Error loading tasks:', err)
      setTasks([])
    }
  }

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('artist_financial_transactions')
        .select('id, description, amount, category, date')
        .eq('event_id', eventId)
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data ?? [])
    } catch (err) {
      console.error('Error loading expenses:', err)
      setExpenses([])
    }
  }

  const loadCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('event_crew_assignments')
        .select('id, user_id, email, name, role, status, permissions, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCrewMembers((data ?? []).map(m => ({
        ...m,
        permissions: m.permissions ?? [],
      })))
    } catch (err) {
      console.error('Error loading crew:', err)
      setCrewMembers([])
    }
  }

  const loadVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, address, city, state, country, capacity, venue_type, amenities, contact_email, booking_status, price_range, images, user_id')
        .limit(20)

      if (error) throw error
      setVenues((data ?? []).map(v => ({
        ...v,
        amenities: v.amenities ?? [],
        images: v.images ?? [],
      })))
    } catch (err) {
      console.error('Error loading venues:', err)
      setVenues([])
    }
  }

  const loadBookingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select('id, venue_id, event_id, message, status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookingRequests(data ?? [])
    } catch (err) {
      console.error('Error loading booking requests:', err)
      setBookingRequests([])
    }
  }

  const addTask = async () => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      completed: false,
      due_date: newTask.due_date || undefined
    }

    setTasks(prev => [...prev, task])
    setNewTask({ title: '', description: '', due_date: '' })
    setShowTaskModal(false)
    toast.success('Task added successfully')
  }

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  const addExpense = async () => {
    if (!newExpense.description.trim() || newExpense.amount <= 0) return

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: newExpense.amount,
      category: newExpense.category || 'Other',
      date: newExpense.date
    }

    setExpenses(prev => [...prev, expense])
    setNewExpense({ description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] })
    setShowExpenseModal(false)
    toast.success('Expense added successfully')
  }

  const updateEventStatus = async (newStatus: Event['status']) => {
    if (!event || !user) return

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', event.id)
        .eq('artist_id', user.id)

      if (error) throw error
      
      setEvent(prev => prev ? { ...prev, status: newStatus } : prev)
      toast.success(`Event marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating event status:', error)
      toast.error('Failed to update event status')
    }
  }

  const copyEventLink = () => {
    const link = `${window.location.origin}/events/${event?.id}`
    navigator.clipboard.writeText(link)
    toast.success('Event link copied to clipboard')
  }

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-600/20 text-blue-300 border-blue-500/30'
      case 'in_progress': return 'bg-green-600/20 text-green-300 border-green-500/30'
      case 'completed': return 'bg-gray-600/20 text-gray-300 border-gray-500/30'
      case 'cancelled': return 'bg-red-600/20 text-red-300 border-red-500/30'
      case 'postponed': return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30'
      default: return 'bg-gray-600/20 text-gray-300 border-gray-500/30'
    }
  }

  const getCompletionProgress = () => {
    if (tasks.length === 0) return 0
    const completedTasks = tasks.filter(task => task.completed).length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getProjectedRevenue = () => {
    if (!event?.ticket_price_min || !event?.expected_attendance) return 0
    return event.ticket_price_min * event.expected_attendance
  }

  // Crew management functions
  const addCrewMember = async () => {
    if (!newCrewMember.name.trim() || !newCrewMember.role) return

    const crewMember: CrewMember = {
      id: Date.now().toString(),
      email: newCrewMember.email,
      name: newCrewMember.name,
      role: newCrewMember.role,
      status: 'invited',
      permissions: newCrewMember.permissions,
      created_at: new Date().toISOString()
    }

    setCrewMembers(prev => [...prev, crewMember])
    setNewCrewMember({ name: '', email: '', role: '', permissions: [] })
    setShowInviteModal(false)
    toast.success('Crew member invited successfully')
  }

  const removeCrewMember = (crewId: string) => {
    setCrewMembers(prev => prev.filter(member => member.id !== crewId))
    toast.success('Crew member removed')
  }

  const updateCrewStatus = (crewId: string, status: CrewMember['status']) => {
    setCrewMembers(prev => prev.map(member => 
      member.id === crewId ? { ...member, status } : member
    ))
    toast.success(`Crew member status updated to ${status}`)
  }

  // Venue management functions
  const searchVenues = (query: string) => {
    setVenueSearchQuery(query)
    // In a real app, this would make an API call to search venues
    // For now, we'll filter the mock data
    if (!query.trim()) return venues
    return venues.filter(venue => 
      venue.name.toLowerCase().includes(query.toLowerCase()) ||
      venue.city.toLowerCase().includes(query.toLowerCase()) ||
      venue.venue_type.toLowerCase().includes(query.toLowerCase())
    )
  }

  const sendBookingRequest = async () => {
    if (!selectedVenue || !bookingMessage.trim()) return

    const request: BookingRequest = {
      id: Date.now().toString(),
      venue_id: selectedVenue.id,
      event_id: eventId,
      message: bookingMessage,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    setBookingRequests(prev => [...prev, request])
    setBookingMessage('')
    setShowBookingModal(false)
    setSelectedVenue(null)
    toast.success('Booking request sent successfully')
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-600/20 text-green-300 border-green-500/30'
      case 'invited': return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30'
      case 'declined': return 'bg-red-600/20 text-red-300 border-red-500/30'
      case 'pending': return 'bg-blue-600/20 text-blue-300 border-blue-500/30'
      default: return 'bg-gray-600/20 text-gray-300 border-gray-500/30'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Event not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-full blur-3xl"
          animate={floatingAnimation}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/8 to-cyan-500/8 rounded-full blur-3xl"
          animate={floatingAnimation}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl"
          animate={floatingAnimation}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Header */}
      <div className="border-b border-slate-800/50 bg-black/40 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
        <div className="px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <Button
                variant="ghost"
                onClick={() => router.push('/artist/events')}
                className="text-gray-400 hover:text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <Button 
                variant="outline" 
                onClick={copyEventLink}
                className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50 backdrop-blur-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                variant="outline"
                className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50 backdrop-blur-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                onClick={() => router.push(`/artist/events/${event.id}/edit`)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 relative">{/* Spacer for content */}

      {/* Event Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    {event.title}
                  </h1>
                  <Badge className={`${getStatusColor(event.status)} border border-current/30 backdrop-blur-sm`}>
                    {event.status.replace('_', ' ')}
                  </Badge>
                  {!event.is_public && (
                    <Badge variant="outline" className="border-gray-500/30 text-gray-400 bg-gray-500/5 backdrop-blur-sm">
                      Private
                    </Badge>
                  )}
                </div>
              
              {event.description && (
                <p className="text-gray-400 mb-4">{event.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="font-medium">{format(new Date(event.event_date), 'PPP')}</p>
                    {event.start_time && (
                      <p className="text-sm text-gray-400">{event.start_time}</p>
                    )}
                  </div>
                </div>

                {event.venue_name && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="font-medium">{event.venue_name}</p>
                      {event.venue_city && (
                        <p className="text-sm text-gray-400">{event.venue_city}, {event.venue_state}</p>
                      )}
                    </div>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="font-medium">{event.capacity.toLocaleString()} capacity</p>
                      {event.expected_attendance && (
                        <p className="text-sm text-gray-400">{event.expected_attendance.toLocaleString()} expected</p>
                      )}
                    </div>
                  </div>
                )}

                {event.ticket_price_min && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium">
                        ${event.ticket_price_min}
                        {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min && 
                          ` - $${event.ticket_price_max}`
                        }
                      </p>
                      <p className="text-sm text-gray-400">Ticket price</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {event.status === 'upcoming' && (
            <div className="flex gap-2 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('in_progress')}
              >
                Mark as In Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('completed')}
              >
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('cancelled')}
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                Cancel Event
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl hover:border-green-500/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Progress</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {getCompletionProgress()}%
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <Progress value={getCompletionProgress()} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Tasks</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {tasks.filter(t => t.completed).length}/{tasks.length}
                  </p>
                </div>
                <FileText className="h-10 w-10 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl hover:border-red-500/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Expenses</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                    ${getTotalExpenses().toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-red-400 group-hover:scale-110 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Projected Revenue</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    ${getProjectedRevenue().toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-7 gap-2 bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 backdrop-blur-xl border border-slate-700/30 p-2 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Details */}
            <Card className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Type</Label>
                    <p className="text-white">{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>
                  </div>
                  
                  {event.venue_address && (
                    <div>
                      <Label className="text-gray-400 text-sm">Full Address</Label>
                      <p className="text-white">
                        {event.venue_address}<br />
                        {event.venue_city}, {event.venue_state} {event.venue_country}
                      </p>
                    </div>
                  )}
                  
                  {event.doors_open && (
                    <div>
                      <Label className="text-gray-400 text-sm">Schedule</Label>
                      <div className="text-white space-y-1">
                        <p>Doors open: {event.doors_open}</p>
                        <p>Show starts: {event.start_time}</p>
                        {event.end_time && <p>Show ends: {event.end_time}</p>}
                      </div>
                    </div>
                  )}
                  
                  {event.ticket_url && (
                    <div>
                      <Label className="text-gray-400 text-sm">Tickets</Label>
                      <a 
                        href={event.ticket_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        Buy tickets <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {event.notes ? (
                  <p className="text-gray-300 whitespace-pre-wrap">{event.notes}</p>
                ) : (
                  <p className="text-gray-500 italic">No notes added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Setlist */}
          {event.setlist && event.setlist.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Setlist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.setlist.map((song, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
                      <span className="text-gray-400 w-8">{index + 1}.</span>
                      <span className="text-white">{song}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="crew" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Crew Management</h2>
            <Button onClick={() => setShowInviteModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Invite Crew Member
            </Button>
          </div>

          {/* Crew Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crewMembers.map((member) => (
              <Card key={member.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-sm text-gray-400">{member.email}</p>
                      <p className="text-sm font-medium text-purple-300 mt-1">{member.role}</p>
                    </div>
                    <Badge variant="outline" className={getStatusBadgeColor(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                  
                  {member.permissions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.map((permission, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {permission.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {member.status === 'invited' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateCrewStatus(member.id, 'accepted')}
                          className="text-green-400 border-green-400 hover:bg-green-400/10"
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCrewStatus(member.id, 'declined')}
                          className="text-red-400 border-red-400 hover:bg-red-400/10"
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeCrewMember(member.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {crewMembers.length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No crew members yet</h3>
                <p className="text-gray-400 mb-4">Start building your event team by inviting crew members.</p>
                <Button onClick={() => setShowInviteModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First Crew Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="venues" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Venue Management</h2>
            <Button onClick={() => setShowVenueSearch(true)} className="bg-purple-600 hover:bg-purple-700">
              <MapPin className="h-4 w-4 mr-2" />
              Find Venues
            </Button>
          </div>

          {/* Booking Requests */}
          {bookingRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Booking Requests</h3>
              <div className="space-y-3">
                {bookingRequests.map((request) => {
                  const venue = venues.find(v => v.id === request.venue_id)
                  return (
                    <Card key={request.id} className="bg-slate-900/50 border-slate-700/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{venue?.name || 'Unknown Venue'}</h4>
                            <p className="text-sm text-gray-400">{venue?.address}, {venue?.city}</p>
                            <p className="text-sm text-gray-300 mt-2">{request.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Sent: {format(new Date(request.created_at), 'PPP')}
                            </p>
                          </div>
                          <Badge variant="outline" className={getStatusBadgeColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Venues */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Available Venues</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.filter(venue => venue.booking_status === 'available').map((venue) => (
                <Card key={venue.id} className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold text-white">{venue.name}</h4>
                      <p className="text-sm text-gray-400">{venue.address}</p>
                      <p className="text-sm text-gray-400">{venue.city}, {venue.state}</p>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white">{venue.venue_type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Capacity:</span>
                        <span className="text-white">{venue.capacity.toLocaleString()}</span>
                      </div>
                      {venue.price_range && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price Range:</span>
                          <span className="text-white">${venue.price_range.min.toLocaleString()} - ${venue.price_range.max.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {venue.amenities.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Amenities:</p>
                        <div className="flex flex-wrap gap-1">
                          {venue.amenities.map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => {
                        setSelectedVenue(venue)
                        setShowBookingModal(true)
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Request Booking
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {venues.filter(venue => venue.booking_status === 'available').length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No venues available</h3>
                <p className="text-gray-400 mb-4">Search for venues that match your event requirements.</p>
                <Button onClick={() => setShowVenueSearch(true)} className="bg-purple-600 hover:bg-purple-700">
                  <MapPin className="h-4 w-4 mr-2" />
                  Search Venues
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Event Tasks</h2>
            <Button onClick={() => setShowTaskModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed 
                            ? 'bg-green-600 border-green-600' 
                            : 'border-gray-400 hover:border-green-400'
                        }`}
                      >
                        {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1">
                        <h3 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-gray-400">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {format(new Date(task.due_date), 'PPP')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tasks.length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No tasks yet</h3>
                <p className="text-gray-400 mb-4">Add tasks to keep track of event preparation.</p>
                <Button onClick={() => setShowTaskModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Task
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Budget Tracking</h2>
            <Button onClick={() => setShowExpenseModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-400">${getTotalExpenses().toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Projected Revenue</p>
                  <p className="text-2xl font-bold text-green-400">${getProjectedRevenue().toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Projected Profit</p>
                  <p className={`text-2xl font-bold ${getProjectedRevenue() - getTotalExpenses() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(getProjectedRevenue() - getTotalExpenses()).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses List */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{expense.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{expense.category}</span>
                          <span>{format(new Date(expense.date), 'PPP')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400">${expense.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No expenses tracked yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Marketing Materials</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <ImageIcon className="h-12 w-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-semibold text-white">Marketing Tools Coming Soon</h3>
                <p className="text-gray-400">
                  Create posters, social media posts, and promotional materials for your event.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Event Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
                <h3 className="text-lg font-semibold text-white">Advanced Settings</h3>
                <p className="text-gray-400">
                  Manage event permissions, integrations, and advanced configurations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
              </Tabs>
      </motion.div>

      {/* Add Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task_title" className="text-gray-300">Title *</Label>
              <Input
                id="task_title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_description" className="text-gray-300">Description</Label>
              <Textarea
                id="task_description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_due_date" className="text-gray-300">Due Date</Label>
              <Input
                id="task_due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                Cancel
              </Button>
              <Button onClick={addTask} className="bg-purple-600 hover:bg-purple-700">
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense_description" className="text-gray-300">Description *</Label>
              <Input
                id="expense_description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Expense description..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_amount" className="text-gray-300">Amount *</Label>
                <Input
                  id="expense_amount"
                  type="number"
                  step="0.01"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_category" className="text-gray-300">Category</Label>
                <Input
                  id="expense_category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Category..."
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date" className="text-gray-300">Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExpenseModal(false)}>
                Cancel
              </Button>
              <Button onClick={addExpense} className="bg-purple-600 hover:bg-purple-700">
                Add Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crew Invitation Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Crew Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Name</Label>
              <Input
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter crew member name"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={newCrewMember.email}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Role</Label>
              <Select onValueChange={(value: string) => setNewCrewMember(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role} className="text-white">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['backstage_access', 'equipment_access', 'admin_access', 'full_access'].map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      className="rounded border-slate-600 bg-slate-800"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCrewMember(prev => ({ 
                            ...prev, 
                            permissions: [...prev.permissions, permission] 
                          }))
                        } else {
                          setNewCrewMember(prev => ({ 
                            ...prev, 
                            permissions: prev.permissions.filter(p => p !== permission) 
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={permission} className="text-sm text-gray-300">
                      {permission.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={addCrewMember} className="bg-purple-600 hover:bg-purple-700">
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Venue Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Request Booking</DialogTitle>
          </DialogHeader>
          {selectedVenue && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-white">{selectedVenue.name}</h3>
                <p className="text-sm text-gray-400">{selectedVenue.address}</p>
                <p className="text-sm text-gray-400">{selectedVenue.city}, {selectedVenue.state}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-gray-400">Capacity:</span>
                  <span className="text-sm text-white">{selectedVenue.capacity.toLocaleString()}</span>
                </div>
                {selectedVenue.price_range && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Price Range:</span>
                    <span className="text-sm text-white">
                      ${selectedVenue.price_range.min.toLocaleString()} - ${selectedVenue.price_range.max.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-300">Booking Message</Label>
                <Textarea
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  placeholder="Tell the venue about your event and requirements..."
                  className="bg-slate-800 border-slate-600 text-white mt-2"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowBookingModal(false)}>
                  Cancel
                </Button>
                <Button onClick={sendBookingRequest} className="bg-purple-600 hover:bg-purple-700">
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
} 