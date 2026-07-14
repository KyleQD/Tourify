"use client"

import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
import { ArtistEventOpsPanel } from "@/app/artist/events/components/artist-event-ops-panel"
import { 
  ArrowLeft,
  Calendar, 
  MapPin, 
  Clock,
  Users,
  DollarSign,
  Edit,
  Share2,
  Music,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  ExternalLink
} from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { getArtistEventVisibility } from "@/lib/artist/artist-event-visibility"
import { EventShareMenu } from "@/components/events/event-share-menu"
import { EventPageDesignPanel } from "@/components/events/event-page-design-panel"
import { artistEventStatusClass, artistEventTone, artistEventUI } from "@/components/events/artist-event-ui"
import { normalizeEventPageLayout, type EventPageLayout } from "@/lib/events/event-page-layout"
import type { EventPageSkinId } from "@/lib/events/event-skin-tokens"
import { cn } from "@/lib/utils"

function isValidNextImageSrc(value?: string | null): value is string {
  if (!value || typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")
}

interface Event {
  id: string
  title: string
  name?: string
  description?: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  event_type?: string
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
  status: 'draft' | 'published' | 'cancelled' | string
  is_public: boolean
  poster_url?: string
  slug?: string
  promoted_event_v2_id?: string | null
  producer_settings?: {
    visibility?: string
    share_blurb?: string
    marketing_notes?: string
    lineup_notes?: string
    page_template?: string
    page_layout?: EventPageLayout
    supporting_artists?: Array<{ id?: string; label?: string }>
  } | null
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
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishedBanner, setShowPublishedBanner] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
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
  const [isSavingPageDesign, setIsSavingPageDesign] = useState(false)

  const eventId = params.id as string

  useEffect(() => {
    if (searchParams.get("published") === "1") setShowPublishedBanner(true)
  }, [searchParams])

  useEffect(() => {
    if (!eventId) return
    void loadEvent()
    void loadTasks()
    void loadExpenses()
    void loadCrewMembers()
    void loadVenues()
    void loadBookingRequests()
  }, [eventId])

  const loadEvent = async () => {
    if (!eventId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/artist/events/${eventId}`, {
        credentials: "include",
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Failed to load event")

      const data = payload.event
      if (data) {
        const visibility = getArtistEventVisibility(data)
        setEvent({
          ...data,
          title: data.name || data.title,
          type: data.event_type || data.type,
          venue_address: data.address || data.venue_address,
          venue_city: data.city || data.venue_city,
          venue_state: data.state || data.venue_state,
          venue_country: data.country || data.venue_country,
          is_public: data.is_public ?? visibility !== "private",
          producer_settings: data.producer_settings || {},
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
    if (!event) return

    try {
      const response = await fetch(`/api/artist/events/${event.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Failed to update status")

      setEvent(prev => prev ? { ...prev, status: newStatus } : prev)
      toast.success(`Event marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating event status:', error)
      toast.error('Failed to update event status')
    }
  }

  const savePageDesign = async ({
    template,
    pageLayout,
  }: {
    template?: EventPageSkinId
    pageLayout?: EventPageLayout
  }) => {
    if (!event) return
    setIsSavingPageDesign(true)
    try {
      const nextSettings = {
        ...(event.producer_settings || {}),
        page_template: template || event.producer_settings?.page_template || "modern",
        page_layout: normalizeEventPageLayout(pageLayout || event.producer_settings?.page_layout),
      }
      const response = await fetch(`/api/artist/events/${event.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producer_settings: nextSettings }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Failed to save page style")

      setEvent((prev) =>
        prev
          ? {
              ...prev,
              producer_settings: {
                ...(prev.producer_settings || {}),
                page_template: nextSettings.page_template,
                page_layout: nextSettings.page_layout,
              },
            }
          : prev
      )
      toast.success("Page design saved")
    } catch (error) {
      console.error("Error saving page design:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save page design")
    } finally {
      setIsSavingPageDesign(false)
    }
  }

  const publishEvent = async () => {
    if (!event) return
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/artist/events/${event.id}/publish`, {
        method: "POST",
        credentials: "include",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Failed to publish")

      const published = payload.event
      setEvent(prev => prev ? {
        ...prev,
        ...published,
        title: published?.title || published?.name || prev.title,
        status: "published",
        slug: published?.slug || prev.slug,
      } : prev)
      setShowPublishedBanner(true)
      toast.success("Event published")
    } catch (error) {
      console.error("Error publishing event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to publish event")
    } finally {
      setIsPublishing(false)
    }
  }

  const publicEventPath = event ? `/events/${event.slug || event.id}` : ""

  const copyEventLink = () => {
    if (!event) return
    const link = `${window.location.origin}${publicEventPath}`
    navigator.clipboard.writeText(link)
    toast.success('Event link copied to clipboard')
  }

  const handleExternalShare = async (platform: "twitter" | "facebook" | "copy") => {
    if (!event) return
    const url = `${window.location.origin}${publicEventPath}`
    const text = `Check out ${event.title}!`

    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      )
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
    } else {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    }
    setShowShareMenu(false)
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

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenue.id,
          eventId: eventId,
          eventName: event?.title || event?.name || "Artist event",
          eventDate: event?.event_date,
          expectedAttendance: event?.capacity || event?.expected_attendance,
          bookingDetails: {
            performanceType: event?.event_type || event?.type || "concert",
            description: bookingMessage,
            performanceDate: event?.event_date || new Date().toISOString().slice(0, 10),
            venue: selectedVenue.name,
            location: [selectedVenue.city, selectedVenue.state].filter(Boolean).join(", ") || "TBD",
            compensation: "To be discussed",
            additionalNotes: bookingMessage,
          },
          requestType: "performance",
          status: "pending",
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to send booking request")

      const request: BookingRequest = {
        id: String(data?.data?.id || data?.venueBookingRequest?.id || Date.now()),
        venue_id: selectedVenue.id,
        event_id: eventId,
        message: bookingMessage,
        status: "pending",
        created_at: new Date().toISOString(),
      }

      setBookingRequests((prev) => [...prev, request])
      setBookingMessage("")
      setShowBookingModal(false)
      setSelectedVenue(null)
      toast.success("Booking request sent successfully")
    } catch (error) {
      console.error("Booking request failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send booking request")
    }
  }

  const getStatusBadgeColor = (status: string) => artistEventStatusClass(status)

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className={cn(artistEventUI.panelPadded, "flex items-center gap-3")}>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-slate-200">Loading event workspace...</span>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="py-8">
        <div className={artistEventUI.empty}>
          <Calendar className="mb-4 h-12 w-12 text-slate-500" />
          <p className="text-slate-400">Event not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={artistEventUI.page}>
      <div className={artistEventUI.pageGlow} />

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/88 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="ghost"
                onClick={() => router.push('/artist/events')}
                className={artistEventUI.buttonGhost}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-wrap items-center gap-2 lg:justify-end"
            >
              {event.status === "draft" ? (
                <Button
                  onClick={() => void publishEvent()}
                  disabled={isPublishing}
                  className={cn(artistEventUI.buttonAccent, "from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isPublishing ? "Publishing…" : "Publish"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => window.open(publicEventPath, "_blank", "noopener,noreferrer")}
                  className={artistEventUI.buttonOutline}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View public page
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={copyEventLink}
                className={artistEventUI.buttonOutline}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowShareMenu(true)}
                className={artistEventUI.buttonOutline}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                className={artistEventUI.buttonPrimary}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className={artistEventUI.shell}>{/* Spacer for content */}

      {showPublishedBanner && event.status === "published" ? (
        <div className={cn(artistEventUI.panelPadded, "flex flex-col gap-3 border-emerald-500/30 bg-emerald-500/10 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <p className="font-medium text-emerald-200">Your event is published</p>
            <p className="text-sm text-emerald-200/70">Share the public page so fans can find your show.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className={cn(artistEventUI.buttonOutline, artistEventTone("emerald"))}
              onClick={() => window.open(publicEventPath, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open public page
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(artistEventUI.buttonOutline, artistEventTone("emerald"))}
              onClick={() => setShowShareMenu(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(artistEventUI.buttonOutline, artistEventTone("emerald"))}
              onClick={copyEventLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-emerald-200/70 hover:bg-emerald-500/10 hover:text-emerald-100"
              onClick={() => setShowPublishedBanner(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {/* Event Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className={cn(artistEventUI.panel, "overflow-hidden")}>
          <CardContent className="p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {event.title}
                  </h1>
                  <Badge variant="outline" className={cn("capitalize", artistEventStatusClass(event.status))}>
                    {event.status.replace('_', ' ')}
                  </Badge>
                  {getArtistEventVisibility(event) === "private" && (
                    <Badge variant="outline" className={artistEventStatusClass("private")}>
                      Private
                    </Badge>
                  )}
                  {getArtistEventVisibility(event) === "unlisted" && (
                    <Badge variant="outline" className={artistEventStatusClass("draft")}>
                      Unlisted
                    </Badge>
                  )}
                </div>
              
              {event.description && (
                <p className="text-slate-400 mb-4">{event.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="font-medium">{format(new Date(event.event_date), 'PPP')}</p>
                    {event.start_time && (
                      <p className="text-sm text-slate-400">{event.start_time}</p>
                    )}
                  </div>
                </div>

                {event.venue_name && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="font-medium">{event.venue_name}</p>
                      {event.venue_city && (
                        <p className="text-sm text-slate-400">{event.venue_city}, {event.venue_state}</p>
                      )}
                    </div>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="font-medium">{event.capacity.toLocaleString()} capacity</p>
                      {event.expected_attendance && (
                        <p className="text-sm text-slate-400">{event.expected_attendance.toLocaleString()} expected</p>
                      )}
                    </div>
                  </div>
                )}

                {event.ticket_price_min && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium">
                        ${event.ticket_price_min}
                        {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min && 
                          ` - $${event.ticket_price_max}`
                        }
                      </p>
                      <p className="text-sm text-slate-400">Ticket price</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {event.status === 'draft' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
              <Button
                size="sm"
                onClick={() => void publishEvent()}
                disabled={isPublishing}
                className={cn(artistEventUI.buttonAccent, "from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500")}
              >
                {isPublishing ? "Publishing…" : "Publish event"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                className={artistEventUI.buttonOutline}
              >
                Continue editing
              </Button>
            </div>
          )}
          {event.status === 'published' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(publicEventPath, "_blank", "noopener,noreferrer")}
                className={artistEventUI.buttonOutline}
              >
                View public page
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('cancelled')}
                className={artistEventUI.buttonDanger}
              >
                Cancel Event
              </Button>
            </div>
          )}
          {event.status === 'upcoming' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('in_progress')}
                className={artistEventUI.buttonOutline}
              >
                Mark as In Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('completed')}
                className={artistEventUI.buttonOutline}
              >
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateEventStatus('cancelled')}
                className={artistEventUI.buttonDanger}
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
          <Card className={cn(artistEventUI.panel, artistEventUI.interactive, "group")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Progress</p>
                  <p className="text-3xl font-bold text-emerald-300">
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
          <Card className={cn(artistEventUI.panel, artistEventUI.interactive, "group")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tasks</p>
                  <p className="text-3xl font-bold text-cyan-300">
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
          <Card className={cn(artistEventUI.panel, artistEventUI.interactive, "group")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Expenses</p>
                  <p className="text-3xl font-bold text-red-300">
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
          <Card className={cn(artistEventUI.panel, artistEventUI.interactive, "group")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Projected Revenue</p>
                  <p className="text-3xl font-bold text-emerald-300">
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
          <TabsList className={artistEventUI.tabsList}>
          <TabsTrigger value="overview" className={artistEventUI.tabsTrigger}>Overview</TabsTrigger>
          <TabsTrigger value="public-page" className={artistEventUI.tabsTrigger}>Public Page</TabsTrigger>
          <TabsTrigger value="crew" className={artistEventUI.tabsTrigger}>Crew</TabsTrigger>
          <TabsTrigger value="venues" className={artistEventUI.tabsTrigger}>Venues</TabsTrigger>
          <TabsTrigger value="tasks" className={artistEventUI.tabsTrigger}>Tasks</TabsTrigger>
          <TabsTrigger value="budget" className={artistEventUI.tabsTrigger}>Budget</TabsTrigger>
          <TabsTrigger value="marketing" className={artistEventUI.tabsTrigger}>Marketing</TabsTrigger>
          <TabsTrigger value="site-map" className={artistEventUI.tabsTrigger}>Site Map</TabsTrigger>
          <TabsTrigger value="settings" className={artistEventUI.tabsTrigger}>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ArtistEventOpsPanel
            eventId={eventId}
            promotedEventV2Id={event?.promoted_event_v2_id}
            onPromoted={(id) => {
              setEvent((prev) => (prev ? { ...prev, promoted_event_v2_id: id } : prev))
            }}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Details */}
            <Card className={artistEventUI.panel}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <Calendar className="h-5 w-5 text-cyan-300" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-slate-400 text-sm">Type</Label>
                    <p className="text-white">{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>
                  </div>
                  
                  {event.venue_address && (
                    <div>
                      <Label className="text-slate-400 text-sm">Full Address</Label>
                      <p className="text-white">
                        {event.venue_address}<br />
                        {event.venue_city}, {event.venue_state} {event.venue_country}
                      </p>
                    </div>
                  )}
                  
                  {event.doors_open && (
                    <div>
                      <Label className="text-slate-400 text-sm">Schedule</Label>
                      <div className="text-white space-y-1">
                        <p>Doors open: {event.doors_open}</p>
                        <p>Show starts: {event.start_time}</p>
                        {event.end_time && <p>Show ends: {event.end_time}</p>}
                      </div>
                    </div>
                  )}
                  
                  {event.ticket_url && (
                    <div>
                      <Label className="text-slate-400 text-sm">Tickets</Label>
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

                  {event.producer_settings?.share_blurb ? (
                    <div>
                      <Label className="text-slate-400 text-sm">Share blurb</Label>
                      <p className="text-white whitespace-pre-wrap">{event.producer_settings.share_blurb}</p>
                    </div>
                  ) : null}

                  {event.producer_settings?.lineup_notes ? (
                    <div>
                      <Label className="text-slate-400 text-sm">Lineup notes</Label>
                      <p className="text-white whitespace-pre-wrap">{event.producer_settings.lineup_notes}</p>
                    </div>
                  ) : null}

                  {isValidNextImageSrc(event.poster_url) ? (
                    <div>
                      <Label className="text-slate-400 text-sm">Poster</Label>
                      <div className="relative mt-2 h-32 w-24 overflow-hidden rounded border border-slate-700">
                        <Image src={event.poster_url} alt="Event poster" fill className="object-cover" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className={artistEventUI.panel}>
              <CardHeader>
                <CardTitle className="text-white">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {event.notes ? (
                  <p className="text-slate-300 whitespace-pre-wrap">{event.notes}</p>
                ) : (
                  <p className="text-slate-500 italic">No notes added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Setlist */}
          {event.setlist && event.setlist.length > 0 && (
            <Card className={artistEventUI.panel}>
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
                      <span className="text-slate-400 w-8">{index + 1}.</span>
                      <span className="text-white">{song}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="public-page" className="space-y-6">
          <Card className={artistEventUI.panel}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">Public Page Design</CardTitle>
                <p className="mt-1 text-sm text-slate-400">
                  Customize the event page fans see when they open your public link.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                className={artistEventUI.buttonOutline}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit details
              </Button>
            </CardHeader>
            <CardContent>
              <EventPageDesignPanel
                selectedTemplate={event.producer_settings?.page_template || "modern"}
                layout={normalizeEventPageLayout(event.producer_settings?.page_layout)}
                previewData={{
                  title: event.title || event.name || "Untitled event",
                  type: event.event_type || event.type,
                  status: event.status,
                  description: event.description,
                  posterUrl: event.poster_url,
                  eventDate: event.event_date,
                  startTime: event.start_time,
                  venueName: event.venue_name,
                  city: event.venue_city,
                  state: event.venue_state,
                  ticketUrl: event.ticket_url,
                  capacity: event.capacity,
                }}
                onTemplateChange={(template) => void savePageDesign({ template })}
                onLayoutChange={(pageLayout) => void savePageDesign({ pageLayout })}
                onSave={() =>
                  void savePageDesign({
                    template: (event.producer_settings?.page_template || "modern") as EventPageSkinId,
                    pageLayout: normalizeEventPageLayout(event.producer_settings?.page_layout),
                  })
                }
                isSaving={isSavingPageDesign}
                publicPath={publicEventPath}
                onCopyPublicLink={copyEventLink}
                onOpenPublicPage={() => window.open(publicEventPath, "_blank", "noopener,noreferrer")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crew" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">Crew Management</h2>
            <Button onClick={() => setShowInviteModal(true)} className={artistEventUI.buttonPrimary}>
              <Plus className="h-4 w-4 mr-2" />
              Invite Crew Member
            </Button>
          </div>

          {/* Crew Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crewMembers.map((member) => (
              <Card key={member.id} className={artistEventUI.panel}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-sm text-slate-400">{member.email}</p>
                      <p className="text-sm font-medium text-purple-300 mt-1">{member.role}</p>
                    </div>
                    <Badge variant="outline" className={getStatusBadgeColor(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                  
                  {member.permissions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Permissions:</p>
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
                          className={cn(artistEventUI.buttonOutline, artistEventTone("emerald"))}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCrewStatus(member.id, 'declined')}
                          className={artistEventUI.buttonDanger}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeCrewMember(member.id)}
                      className={artistEventUI.buttonGhost}
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {crewMembers.length === 0 && (
            <Card className={artistEventUI.panel}>
              <CardContent className={artistEventUI.empty}>
                <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No crew members yet</h3>
                <p className="text-slate-400 mb-4">Start building your event team by inviting crew members.</p>
                <Button onClick={() => setShowInviteModal(true)} className={artistEventUI.buttonPrimary}>
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
            <Button onClick={() => setShowVenueSearch(true)} className={artistEventUI.buttonPrimary}>
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
                    <Card key={request.id} className={artistEventUI.panel}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{venue?.name || 'Unknown Venue'}</h4>
                            <p className="text-sm text-slate-400">{venue?.address}, {venue?.city}</p>
                            <p className="text-sm text-slate-300 mt-2">{request.message}</p>
                            <p className="text-xs text-slate-500 mt-2">
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
                <Card key={venue.id} className={artistEventUI.panel}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold text-white">{venue.name}</h4>
                      <p className="text-sm text-slate-400">{venue.address}</p>
                      <p className="text-sm text-slate-400">{venue.city}, {venue.state}</p>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Type:</span>
                        <span className="text-white">{venue.venue_type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Capacity:</span>
                        <span className="text-white">{venue.capacity.toLocaleString()}</span>
                      </div>
                      {venue.price_range && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Price Range:</span>
                          <span className="text-white">${venue.price_range.min.toLocaleString()} - ${venue.price_range.max.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {venue.amenities.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Amenities:</p>
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
                      className={cn("w-full", artistEventUI.buttonPrimary)}
                    >
                      Request Booking
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {venues.filter(venue => venue.booking_status === 'available').length === 0 && (
            <Card className={artistEventUI.panel}>
              <CardContent className={artistEventUI.empty}>
                <MapPin className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No venues available</h3>
                <p className="text-slate-400 mb-4">Search for venues that match your event requirements.</p>
                <Button onClick={() => setShowVenueSearch(true)} className={artistEventUI.buttonPrimary}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Search Venues
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">Event Tasks</h2>
            <Button onClick={() => setShowTaskModal(true)} className={artistEventUI.buttonPrimary}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className={artistEventUI.panel}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed 
                            ? 'bg-green-600 border-green-600' 
                            : 'border-slate-500 hover:border-green-400'
                        }`}
                      >
                        {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1">
                        <h3 className={`font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-slate-400">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            Due: {format(new Date(task.due_date), 'PPP')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className={artistEventUI.buttonGhost} aria-label={`Delete task ${task.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tasks.length === 0 && (
            <Card className={artistEventUI.panel}>
              <CardContent className={artistEventUI.empty}>
                <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No tasks yet</h3>
                <p className="text-slate-400 mb-4">Add tasks to keep track of event preparation.</p>
                <Button onClick={() => setShowTaskModal(true)} className={artistEventUI.buttonPrimary}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Task
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">Budget Tracking</h2>
            <Button onClick={() => setShowExpenseModal(true)} className={artistEventUI.buttonPrimary}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={artistEventUI.panel}>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-400">${getTotalExpenses().toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={artistEventUI.panel}>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Projected Revenue</p>
                  <p className="text-2xl font-bold text-green-400">${getProjectedRevenue().toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={artistEventUI.panel}>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Projected Profit</p>
                  <p className={`text-2xl font-bold ${getProjectedRevenue() - getTotalExpenses() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(getProjectedRevenue() - getTotalExpenses()).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses List */}
          <Card className={artistEventUI.panel}>
            <CardHeader>
              <CardTitle className="text-white">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className={cn(artistEventUI.inset, "flex items-center justify-between p-3")}>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{expense.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
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
                <div className={artistEventUI.empty}>
                  <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No expenses tracked yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing">
          <Card className={artistEventUI.panel}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-white">Marketing & share</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                className={artistEventUI.buttonOutline}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit in composer
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={cn(artistEventUI.inset, "p-4")}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Share blurb</p>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {event.producer_settings?.share_blurb || "No share blurb yet."}
                  </p>
                </div>
                <div className={cn(artistEventUI.inset, "p-4")}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Ticket link</p>
                  {event.ticket_url ? (
                    <a
                      href={event.ticket_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-cyan-300 hover:underline break-all"
                    >
                      {event.ticket_url}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">No ticket URL set.</p>
                  )}
                  {(event.ticket_price_min || event.ticket_price_max) && (
                    <p className="text-xs text-slate-500 mt-2">
                      ${event.ticket_price_min ?? "—"}
                      {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min
                        ? ` – $${event.ticket_price_max}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className={cn(artistEventUI.inset, "p-4 md:col-span-2")}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Lineup notes</p>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {event.producer_settings?.lineup_notes || "No lineup notes yet."}
                  </p>
                  {Array.isArray(event.producer_settings?.supporting_artists) &&
                  event.producer_settings.supporting_artists.length > 0 ? (
                    <p className="text-xs text-slate-500 mt-2">
                      Supporting:{" "}
                      {event.producer_settings.supporting_artists
                        .map((artist) => artist.label)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className={cn(artistEventUI.inset, "p-4 md:col-span-2")}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Marketing notes</p>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {event.producer_settings?.marketing_notes || "No marketing notes yet."}
                  </p>
                </div>
                {isValidNextImageSrc(event.poster_url) ? (
                  <div className={cn(artistEventUI.inset, "p-4 md:col-span-2")}>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Poster</p>
                    <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-lg border border-slate-700">
                      <Image src={event.poster_url} alt="Event poster" fill className="object-cover" />
                    </div>
                  </div>
                ) : null}
              </div>
              {event.status === "published" ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" className={artistEventUI.buttonOutline} onClick={() => setShowShareMenu(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" className={artistEventUI.buttonOutline} onClick={copyEventLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy public link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={artistEventUI.buttonOutline}
                    onClick={() => window.open(publicEventPath, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View public page
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site-map">
          <Card className={artistEventUI.panel}>
            <CardContent className={cn(artistEventUI.empty, "gap-4")}>
              <div className={cn(artistEventUI.iconWell, "h-16 w-16")}>
                <MapPin className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-semibold text-white">Event Site Map</h3>
              <p className="text-slate-400 text-sm text-center max-w-md">
                View the event layout including stages, backstage areas, load-in paths, and zone assignments.
              </p>
              <Button
                onClick={() => router.push(`/artist/events/${eventId}/site-map`)}
                className={artistEventUI.buttonAccent}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Open Site Map
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className={artistEventUI.panel}>
            <CardHeader>
              <CardTitle className="text-white">Event Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              <p className="text-sm text-slate-400">
                Page design now lives in the{" "}
                <button
                  type="button"
                  className="text-purple-300 underline-offset-2 hover:underline"
                  onClick={() => setSelectedTab("public-page")}
                >
                  Public Page
                </button>{" "}
                tab. More advanced permissions and integrations will land here later. Use{" "}
                <button
                  type="button"
                  className="text-purple-300 underline-offset-2 hover:underline"
                  onClick={() => router.push(`/artist/events/create?id=${event.id}`)}
                >
                  Event Producer
                </button>{" "}
                to edit full event details.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
              </Tabs>
      </motion.div>

      {/* Add Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className={artistEventUI.dialog}>
          <DialogHeader>
            <DialogTitle className="text-white">Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task_title" className="text-slate-300">Title *</Label>
              <Input
                id="task_title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title..."
                className={artistEventUI.input}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_description" className="text-slate-300">Description</Label>
              <Textarea
                id="task_description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description..."
                className={artistEventUI.textarea}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_due_date" className="text-slate-300">Due Date</Label>
              <Input
                id="task_due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                className={artistEventUI.input}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" className={artistEventUI.buttonOutline} onClick={() => setShowTaskModal(false)}>
                Cancel
              </Button>
              <Button onClick={addTask} className={artistEventUI.buttonPrimary}>
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className={artistEventUI.dialog}>
          <DialogHeader>
            <DialogTitle className="text-white">Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense_description" className="text-slate-300">Description *</Label>
              <Input
                id="expense_description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Expense description..."
                className={artistEventUI.input}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_amount" className="text-slate-300">Amount *</Label>
                <Input
                  id="expense_amount"
                  type="number"
                  step="0.01"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className={artistEventUI.input}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_category" className="text-slate-300">Category</Label>
                <Input
                  id="expense_category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Category..."
                  className={artistEventUI.input}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date" className="text-slate-300">Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                className={artistEventUI.input}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" className={artistEventUI.buttonOutline} onClick={() => setShowExpenseModal(false)}>
                Cancel
              </Button>
              <Button onClick={addExpense} className={artistEventUI.buttonPrimary}>
                Add Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crew Invitation Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className={artistEventUI.dialog}>
          <DialogHeader>
            <DialogTitle className="text-white">Invite Crew Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter crew member name"
                className={artistEventUI.input}
              />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={newCrewMember.email}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className={artistEventUI.input}
              />
            </div>
            <div>
              <Label className="text-slate-300">Role</Label>
              <Select onValueChange={(value: string) => setNewCrewMember(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className={artistEventUI.select}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-white">
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role} className="text-white">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Permissions</Label>
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
                    <Label htmlFor={permission} className="text-sm text-slate-300">
                      {permission.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" className={artistEventUI.buttonOutline} onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={addCrewMember} className={artistEventUI.buttonPrimary}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Venue Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className={artistEventUI.dialog}>
          <DialogHeader>
            <DialogTitle className="text-white">Request Booking</DialogTitle>
          </DialogHeader>
          {selectedVenue && (
            <div className="space-y-4">
              <div className={cn(artistEventUI.inset, "p-4")}>
                <h3 className="font-semibold text-white">{selectedVenue.name}</h3>
                <p className="text-sm text-slate-400">{selectedVenue.address}</p>
                <p className="text-sm text-slate-400">{selectedVenue.city}, {selectedVenue.state}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-slate-400">Capacity:</span>
                  <span className="text-sm text-white">{selectedVenue.capacity.toLocaleString()}</span>
                </div>
                {selectedVenue.price_range && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Price Range:</span>
                    <span className="text-sm text-white">
                      ${selectedVenue.price_range.min.toLocaleString()} - ${selectedVenue.price_range.max.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-300">Booking Message</Label>
                <Textarea
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  placeholder="Tell the venue about your event and requirements..."
                  className={cn(artistEventUI.textarea, "mt-2")}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" className={artistEventUI.buttonOutline} onClick={() => setShowBookingModal(false)}>
                  Cancel
                </Button>
                <Button onClick={sendBookingRequest} className={artistEventUI.buttonPrimary}>
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DialogContent className={cn(artistEventUI.dialog, "max-h-[85vh] max-w-md overflow-hidden p-0 gap-0 [&>button]:right-4 [&>button]:top-4 [&>button]:text-white/60 [&>button]:hover:text-white")}>
          <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-4px)]">
            {event ? (
              <EventShareMenu
                eventId={event.id}
                eventTitle={event.title}
                eventSlug={event.slug}
                onClose={() => setShowShareMenu(false)}
                onExternalShare={(platform) => void handleExternalShare(platform)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
