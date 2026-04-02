"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "./components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { VenueOwnerSidebar } from "./components/venue-owner-sidebar"
import { VenueStats } from "./components/venue-stats"
import { VenueBookingRequests } from "./components/venue-booking-requests"
import { VenueUpcomingEvents } from "./components/venue-upcoming-events"
import { VenueDocuments } from "./components/venue-documents"

import { VenueAnalyticsSummary } from "./components/venue-analytics-summary"
import PromotionShell from "./components/promotion-shell"
import { VenueCalendar } from "./components/venue-calendar"
import { CommandSearch } from "./components/command-search"
import { NotificationCenter } from "./components/notification-center"
import { ThemeSwitcher } from "./components/theme-switcher"
import { ErrorBoundary } from "./components/error-boundary"
import { Bell, Calendar, Clock, Edit, Eye, FileText, Menu, MessageSquare, Plus, Upload, DollarSign, Users, Megaphone, UserCheck, Settings } from "lucide-react"
import Link from "next/link"
import { EventFormModal, EventFormData } from "./components/create-event-modal"
import { VenueEvents } from "./components/venue-events"
import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EditProfileModal } from './components/edit-profile-modal'
import { BookingDetailsModal } from "./components/booking-details-modal"
import { EventDetailsModal } from "./components/event-details-modal"
import { EditEventModal } from "./components/edit-event-modal"
import { useCurrentVenue } from "./hooks/useCurrentVenue"
import { getVenuePublicProfilePath } from "@/lib/utils/public-profile-routes"
import { VenueAccountSettings } from "@/components/settings/venue-account-settings"
import { formatSafeDate, formatSafeDateTime } from "@/lib/events/admin-event-normalization"

// Mock venue data - in a real app, this would come from an API
const mockVenue = {
  id: "venue-1",
  name: "The Echo Lounge",
  username: "echolounge",
  description:
    "A premier music venue with state-of-the-art sound and lighting systems, hosting both local and touring artists. The Echo Lounge features multiple performance spaces, a full-service bar, and a dedicated team to ensure your event runs smoothly.",
  location: "Los Angeles, CA",
  address: "1234 Sunset Blvd, Los Angeles, CA 90026",
  website: "https://echolounge.com",
  avatar: "/vibrant-urban-gathering.png",
  coverImage: "/vibrant-music-venue.png",
  capacity: 850,
  type: "Music Venue",
  amenities: [
    { name: "Wi-Fi", icon: "Wifi" },
    { name: "Parking", icon: "ParkingMeter" },
    { name: "ADA Access", icon: "Accessibility" },
    { name: "Green Room", icon: "Coffee" },
    { name: "Sound System", icon: "Music" },
  ],
  specs: {
    soundSystem: "Meyer Sound with 32-channel Midas console",
    lighting: "Full DMX system with moving heads and LED pars",
    stage: "24' x 16' with 3' height",
    greenRoom: true,
    parking: "25 spots on-site, street parking available",
    accessibility: "ADA compliant with wheelchair ramp and accessible restrooms",
    bar: "Full-service bar with craft cocktails and local beers",
    foodService: "Small plates menu available until 10pm",
  },
  bookingContact: {
    name: "Alex Johnson",
    email: "booking@echolounge.com",
    phone: "(323) 555-1234",
  },
  stats: {
    events: 125,
    capacity: 850,
    rating: 4.8,
    bookingRequests: 8,
    pendingReviews: 3,

    monthlyViews: 2450,
    monthlyBookings: 18,
  },
  upcomingEvents: [
    {
      id: "event-1",
      title: "Summer Jam Festival",
      artist: "Various Artists",
      date: "2025-06-15T14:00:00",
      ticketsSold: 450,
      capacity: 850,
      status: "On Sale",
    },
    {
      id: "event-2",
      title: "Midnight Echo",
      artist: "Sarah Williams",
      date: "2025-06-22T19:00:00",
      ticketsSold: 325,
      capacity: 850,
      status: "On Sale",
    },
    {
      id: "event-3",
      title: "Jazz Night",
      artist: "The Blue Notes",
      date: "2025-06-28T20:00:00",
      ticketsSold: 275,
      capacity: 850,
      status: "On Sale",
    },
  ],
  bookingRequests: [
    {
      id: "req-1",
      eventName: "Electronic Music Showcase",
      organizer: "Pulse Productions",
      date: "2025-07-10T19:00:00",
      attendees: 500,
      status: "pending",
      received: "2025-05-28T14:32:00",
    },
    {
      id: "req-2",
      eventName: "Album Release Party",
      organizer: "Skyline Records",
      date: "2025-07-15T20:00:00",
      attendees: 350,
      status: "pending",
      received: "2025-05-27T09:15:00",
    },
    {
      id: "req-3",
      eventName: "Corporate Event",
      organizer: "TechGiant Inc.",
      date: "2025-07-22T18:00:00",
      attendees: 200,
      status: "pending",
      received: "2025-05-26T16:45:00",
    },
    {
      id: "req-4",
      eventName: "Indie Rock Night",
      organizer: "Underground Sounds",
      date: "2025-07-25T21:00:00",
      attendees: 400,
      status: "pending",
      received: "2025-05-25T11:20:00",
    },
  ],

  documents: [
    {
      id: "doc-1",
      name: "Stage Plot & Technical Rider",
      type: "pdf",
      size: "2.4 MB",
      uploadDate: "2023-05-15",
      url: "#",
    },
    { id: "doc-2", name: "Floor Plan", type: "pdf", size: "1.8 MB", uploadDate: "2023-05-15", url: "#" },
    { id: "doc-3", name: "Booking Policy", type: "pdf", size: "0.5 MB", uploadDate: "2023-05-15", url: "#" },
    { id: "doc-4", name: "Hospitality Information", type: "pdf", size: "0.7 MB", uploadDate: "2023-05-15", url: "#" },
  ],
  isOwner: true,
}

// Add BookingRequest type
interface BookingRequest {
  id: string
  eventName: string
  organizer: string
  date: string
  attendees: number
  status: "pending" | "accepted" | "declined"
  received: string
}

export default function VenueDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { venue, stats, isLoading, error, refreshVenue, updateVenue } = useCurrentVenue()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [events, setEvents] = useState<EventFormData[]>([])

  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([
    {
      id: "req-1",
      eventName: "Electronic Music Showcase",
      organizer: "Pulse Productions",
      date: "2025-07-10T19:00:00",
      attendees: 500,
      status: "pending",
      received: "2025-05-28T14:32:00",
    },
    {
      id: "req-2",
      eventName: "Album Release Party",
      organizer: "Skyline Records",
      date: "2025-07-15T20:00:00",
      attendees: 350,
      status: "pending",
      received: "2025-05-27T09:15:00",
    },
    {
      id: "req-3",
      eventName: "Corporate Event",
      organizer: "TechGiant Inc.",
      date: "2025-07-22T18:00:00",
      attendees: 200,
      status: "pending",
      received: "2025-05-26T16:45:00",
    },
    {
      id: "req-4",
      eventName: "Indie Rock Night",
      organizer: "Underground Sounds",
      date: "2025-07-25T21:00:00",
      attendees: 400,
      status: "pending",
      received: "2025-05-25T11:20:00",
    },
  ])
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"all" | "pending" | "accepted" | "declined">("all")
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventFormData | null>(null)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [editEventData, setEditEventData] = useState<EventFormData | null>(null)
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<EventFormData | null>(null)
  const [bookingNotes, setBookingNotes] = useState<Record<string, string>>({})
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile")

  const filteredBookings = bookingStatusFilter === "all"
    ? bookingRequests
    : bookingRequests.filter(b => b.status === bookingStatusFilter)

  // Show error if venue loading failed
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
    }
  }, [error, toast])

  const handleEditProfile = () => setIsEditProfileOpen(true)

  const handleViewPublicProfile = () => {
    if (!venue?.id) {
      console.warn("[Venue Dashboard] View Public Profile: venue id missing")
      return
    }
    const path = getVenuePublicProfilePath({
      id: venue.id,
      url_slug: (venue as { url_slug?: string | null }).url_slug
    })
    if (!path) return
    console.log("[Venue Dashboard] Opening public venue profile:", path)
    window.open(path, "_blank")
  }

  const handleSaveProfile = async (profileData: any) => {
    try {
      await updateVenue(profileData)
      toast({
        title: "Profile Updated",
        description: "Your venue profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update venue profile.",
        variant: "destructive",
      })
      throw error // Re-throw so the modal can handle the error state
    }
  }

  const handleStatsClick = (statType: 'events' | 'rating' | 'capacity') => {
    switch (statType) {
      case 'events':
        setActiveTab('events')
        toast({
          title: "Event Analytics",
          description: "Viewing detailed event statistics and insights.",
        })
        break
      case 'rating':
        setActiveTab('analytics')
        toast({
          title: "Rating Analytics", 
          description: "Viewing customer reviews and rating breakdown.",
        })
        break
      case 'capacity':
        setActiveTab('analytics')
        toast({
          title: "Capacity Analytics",
          description: "Viewing capacity utilization and booking patterns.",
        })
        break
    }
  }

  function handleCreateEvent(newEvent: EventFormData) {
    // Ensure the event has a unique ID for navigation
    const eventWithId = {
      ...newEvent,
      id: newEvent.id || Math.floor(Math.random() * 1000000)
    }
    setEvents((prev) => [...prev, eventWithId])
    toast({ 
      title: "Event Created", 
      description: `Event '${newEvent.title}' created successfully! Click "Manage Event" or "Dashboard" to access the full management interface.`
    })
  }



  function handleAcceptBooking(requestId: string) {
    setBookingRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: "accepted" } : req
      )
    )
    const req = bookingRequests.find(r => r.id === requestId)
    if (req) {
      setEvents(prev => [
        ...prev,
        {
          id: Math.floor(Math.random() * 1000000),
          title: req.eventName,
          description: req.organizer,
          date: new Date(req.date),
          startTime: "19:00",
          endTime: "22:00",
          type: "booking",
          status: "confirmed",
          capacity: req.attendees,
          ticketPrice: 0,
          isPublic: false,
          attendance: req.attendees,
        }
      ])
      toast({ title: "Booking Accepted", description: `Added "${req.eventName}" to your events. Organizer notified.` })
    }
  }

  function handleDeclineBooking(requestId: string) {
    setBookingRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: "declined" } : req
      )
    )
    const req = bookingRequests.find(r => r.id === requestId)
    if (req) toast({ title: "Booking Declined", description: `Declined "${req.eventName}". Organizer notified.` })
  }

  function handleEditEvent(event: EventFormData) {
    setEditEventData(event)
    setIsEditEventOpen(true)
  }

  function handleSaveEditEvent(updated: EventFormData) {
    setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
    setIsEditEventOpen(false)
    setEditEventData(null)
    toast({ title: "Event Updated", description: `Event "${updated.title}" updated successfully.` })
  }

  function handleDeleteEvent(event: EventFormData) {
    setEventToDelete(event)
    setIsDeleteEventOpen(true)
  }

  function confirmDeleteEvent() {
    if (eventToDelete) {
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      setIsDeleteEventOpen(false)
      setEventToDelete(null)
      toast({ title: "Event Deleted", description: "Event removed from your schedule." })
    }
  }

  function handleBookingNoteChange(id: string, note: string) {
    setBookingNotes(prev => ({ ...prev, [id]: note }))
  }

  // Analytics deep dive
  const totalBookings = bookingRequests.length
  const acceptedBookings = bookingRequests.filter(b => b.status === "accepted").length
  const acceptanceRate = totalBookings ? Math.round((acceptedBookings / totalBookings) * 100) : 0
  const avgAttendees = acceptedBookings ? Math.round(bookingRequests.filter(b => b.status === "accepted").reduce((sum, b) => sum + b.attendees, 0) / acceptedBookings) : 0
  const eventTypeCounts = events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-950">
        <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-12 mb-8" />
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-400 animate-pulse">Loading venue dashboard...</p>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
        <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-12 mb-8" />
        <Card className="max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Venue Not Found</h2>
            <p className="text-gray-400 mb-4">We couldn't find your venue information.</p>
            <Button onClick={() => router.push("/venues/create")}>Create a Venue</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-950 dark:bg-gray-950">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <VenueOwnerSidebar
        venue={venue}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        onEditProfile={handleEditProfile}
        onViewPublicProfile={handleViewPublicProfile}
        onStatsClick={handleStatsClick}
      />

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with venue info and actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-8 hidden md:block" />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {venue.venue_name}
                  <Badge variant="outline" className="ml-2 bg-purple-900/20 text-purple-400 border-purple-800">
                    {venue.venue_types?.[0] || 'Venue'}
                  </Badge>
                </h1>
                <p className="text-gray-400">Venue Management Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-64 mr-2 hidden md:block">
                <CommandSearch />
              </div>
              <NotificationCenter />
              <ThemeSwitcher />
              <Button variant="outline" size="sm" onClick={handleViewPublicProfile}>
                <Eye className="h-4 w-4 mr-2" /> View Public Profile
              </Button>
              <Button size="sm" onClick={handleEditProfile}>
                <Edit className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
              <Button size="sm" className="bg-white text-purple-900 hover:bg-gray-100" onClick={() => setIsCreateEventOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Event
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="mb-4 md:hidden">
            <CommandSearch />
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gray-800 w-full justify-start overflow-x-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="finances">Finances</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="promotion">Promotion</TabsTrigger>
              <TabsTrigger value="crm">CRM</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <ErrorBoundary>
                <div className="space-y-6">
                  {/* Welcome card */}
                  <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 border-none">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-white">Welcome back to your venue dashboard!</h2>
                          <p className="text-purple-200 mt-1">
                            You have {stats?.pendingRequests || 0} new booking requests and {stats?.totalReviews || 0}{" "}
                            pending reviews.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm">
                            <Bell className="h-4 w-4 mr-2" /> Notifications
                          </Button>
                          <Button variant="default" size="sm" className="bg-white text-purple-900 hover:bg-gray-100">
                            <Plus className="h-4 w-4 mr-2" /> Create Event
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats overview */}
                  <VenueStats venue={venue} stats={stats} />

                  {/* Main dashboard grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Booking requests */}
                    <VenueBookingRequests venue={venue} />

                    {/* Upcoming events */}
                    <VenueUpcomingEvents venue={venue} />

                    {/* Documents */}
                    <VenueDocuments venue={venue} />

                    {/* Staff Summary */}
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          Staff Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-6">
                          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm mb-3">Comprehensive staff management available</p>
                          <Button 
                            onClick={() => window.location.href = '/venue/staff'}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Manage Staff
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Analytics summary */}
                  <VenueAnalyticsSummary venue={venue} />

                  {/* Quick actions */}
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button 
                          variant="outline" 
                          className="h-auto py-4 flex flex-col items-center justify-center hover:bg-purple-900/20 transition-colors"
                          onClick={() => setIsCreateEventOpen(true)}
                        >
                          <Calendar className="h-5 w-5 mb-2 text-purple-400" />
                          <span>Create Event</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto py-4 flex flex-col items-center justify-center hover:bg-blue-900/20 transition-colors"
                          onClick={() => setActiveTab("bookings")}
                        >
                          <Clock className="h-5 w-5 mb-2 text-blue-400" />
                          <span>Manage Bookings</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto py-4 flex flex-col items-center justify-center hover:bg-green-900/20 transition-colors"
                          onClick={() => setActiveTab("documents")}
                        >
                          <FileText className="h-5 w-5 mb-2 text-green-400" />
                          <span>Upload Documents</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-auto py-4 flex flex-col items-center justify-center hover:bg-orange-900/20 transition-colors"
                          onClick={() => setActiveTab("messaging")}
                        >
                          <MessageSquare className="h-5 w-5 mb-2 text-orange-400" />
                          <span>Message Clients</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="bookings">
              <ErrorBoundary>
                <div className="space-y-6">
                  <VenueCalendar venue={venue} />

                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Booking Management</CardTitle>
                        <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-6" />
                      </div>
                      <CardDescription>Manage your venue's booking requests and calendar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="requests">
                        <TabsList className="bg-gray-800 mb-4">
                          <TabsTrigger value="requests">Booking Requests</TabsTrigger>
                          <TabsTrigger value="calendar">Calendar</TabsTrigger>
                          <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="requests">
                          <div className="mb-4 flex gap-2 items-center">
                            <span className="text-white font-semibold">Filter:</span>
                            <Button variant={bookingStatusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setBookingStatusFilter("all")}>All</Button>
                            <Button variant={bookingStatusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setBookingStatusFilter("pending")}>Pending</Button>
                            <Button variant={bookingStatusFilter === "accepted" ? "default" : "outline"} size="sm" onClick={() => setBookingStatusFilter("accepted")}>Accepted</Button>
                            <Button variant={bookingStatusFilter === "declined" ? "default" : "outline"} size="sm" onClick={() => setBookingStatusFilter("declined")}>Declined</Button>
                          </div>
                          <div className="space-y-6">
                            {filteredBookings.map(request => (
                              <Card key={request.id}>
                                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 cursor-pointer" onClick={() => setSelectedBooking(request)}>
                                  <div>
                                    <h3 className="font-medium text-white">{request.eventName}</h3>
                                    <p className="text-sm text-gray-400">{request.organizer}</p>
                                    <p className="text-xs text-gray-400">{formatSafeDateTime(request.date)} • {request.attendees} attendees</p>
                                    <p className="text-xs text-gray-500 mt-1">Received {formatSafeDate(request.received)}</p>
                                    <p className="text-xs mt-1">Status: <span className={request.status === "accepted" ? "text-green-400" : request.status === "declined" ? "text-red-400" : "text-yellow-400"}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></p>
                                  </div>
                                  <div className="flex gap-2 mt-3 md:mt-0">
                                    {request.status === "pending" && (
                                      <>
                                        <Button size="sm" onClick={e => { e.stopPropagation(); handleAcceptBooking(request.id) }}>Accept</Button>
                                        <Button variant="destructive" size="sm" onClick={e => { e.stopPropagation(); handleDeclineBooking(request.id) }}>Decline</Button>
                                      </>
                                    )}
                                    {request.status === "accepted" && <span className="text-green-400 text-xs">Accepted</span>}
                                    {request.status === "declined" && <span className="text-red-400 text-xs">Declined</span>}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="calendar">
                          <div className="h-96 flex items-center justify-center bg-gray-800 rounded-lg">
                            <div className="text-center">
                              <img
                                src="/images/tourify-logo-white.png"
                                alt="Tourify"
                                className="h-8 mx-auto mb-4 opacity-50"
                              />
                              <p className="text-gray-400">Calendar view would appear here</p>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="settings">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Booking Lead Time</label>
                                <select className="w-full bg-gray-800 border border-gray-700 rounded-md p-2">
                                  <option>1 week</option>
                                  <option>2 weeks</option>
                                  <option>1 month</option>
                                  <option>2 months</option>
                                  <option>3 months</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Auto-Approve Bookings</label>
                                <select className="w-full bg-gray-800 border border-gray-700 rounded-md p-2">
                                  <option>Never (Review all requests)</option>
                                  <option>For trusted clients only</option>
                                  <option>For small events (&lt;100 people)</option>
                                  <option>Always</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Booking Notification Email</label>
                              <input className="w-full bg-gray-800 border border-gray-700 rounded-md p-2" />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="events">
              <ErrorBoundary>
                <div className="space-y-6">
                  <VenueEvents
                    events={events}
                    onCreateEvent={() => setIsCreateEventOpen(true)}
                    isOwner={venue.isOwner}
                  />
                  <EventFormModal
                    isOpen={isCreateEventOpen}
                    onClose={() => setIsCreateEventOpen(false)}
                    onSaveEvent={handleCreateEvent}
                  />
                </div>
              </ErrorBoundary>
            </TabsContent>



            <TabsContent value="analytics">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card>
                    <CardContent className="py-6">
                      <div className="text-xl font-bold mb-2">Booking Analytics</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-purple-400">{totalBookings}</div>
                          <div className="text-xs text-gray-400">Total Bookings</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-400">{acceptedBookings}</div>
                          <div className="text-xs text-gray-400">Accepted</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-400">{acceptanceRate}%</div>
                          <div className="text-xs text-gray-400">Acceptance Rate</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-400">{avgAttendees}</div>
                          <div className="text-xs text-gray-400">Avg. Attendees</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-6">
                      <div className="text-xl font-bold mb-2">Event Type Breakdown</div>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(eventTypeCounts).map(([type, count]) => (
                          <div key={type} className="bg-purple-900/30 rounded px-4 py-2 text-purple-200">
                            {type.charAt(0).toUpperCase() + type.slice(1)}: <span className="font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="messaging">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-orange-400" />
                        Message Center
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <div className="border rounded-lg h-96 overflow-hidden">
                            <iframe title="Staff Messaging" className="w-full h-full bg-gray-900" src="/venue/staff#communications" />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Quick Links</div>
                          <div className="grid gap-2">
                            <Button variant="outline" onClick={() => window.location.href = '/venue/staff#communications'}>
                              Open Staff Communications
                            </Button>
                            <Button variant="outline" onClick={() => window.location.href = '/messages'}>
                              Open Global Messages
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="documents">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-400" />
                        Document Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 flex items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-center">
                          <FileText className="h-12 w-12 text-green-400 mx-auto mb-4 opacity-50" />
                          <p className="text-gray-400 mb-2">Advanced document management coming soon</p>
                          <p className="text-sm text-gray-500">Upload and organize venue documents</p>
                          <Button className="mt-4 bg-green-600 hover:bg-green-700">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="finances">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        Financial Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <iframe title="Venue Finance" className="w-full h-[1200px] bg-gray-900" src="/venue/finances" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="staff">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-400" />
                        Staff Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 flex items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-center">
                          <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                          <p className="text-gray-400 mb-2">Comprehensive Staff Management System</p>
                          <p className="text-sm text-gray-500 mb-4">Manage staff, crew, and contractor teams in one place</p>
                          <Button 
                            onClick={() => window.location.href = '/venue/staff'}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Open Staff Management
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="promotion">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-pink-400" />
                        Marketing & Promotion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Button onClick={() => setActiveTab('promotion')} className="bg-pink-600 hover:bg-pink-700">Create Campaign</Button>
                        <Button variant="outline" onClick={() => window.location.href='/venue/analytics'}>View Analytics</Button>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">Campaigns</div>
                      <div className="border rounded-lg overflow-hidden p-4 bg-gray-900">
                        <PromotionShell />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="crm">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-cyan-400" />
                        Customer Relationship Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-400 mb-2">Recent Requesters</div>
                      <div className="grid gap-2">
                        {bookingRequests.slice(0, 10).map((b) => (
                          <div key={b.id} className="flex items-center justify-between p-3 bg-gray-800/60 rounded">
                            <div>
                              <div className="text-white text-sm font-medium">{b.eventName}</div>
                              <div className="text-xs text-gray-400">{b.organizer} • {formatSafeDate(b.date)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(b.organizer)}>Copy Contact</Button>
                              <Button size="sm" onClick={() => setActiveTab('bookings')}>View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="settings">
              <ErrorBoundary>
                <div className="space-y-6">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-green-400" />
                        Venue Settings
                      </CardTitle>
                      <CardDescription>
                        Manage your venue profile, booking policies, amenities, and payment settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6">
                        <TabsList className="bg-gray-800 w-full justify-start overflow-x-auto">
                          <TabsTrigger value="profile" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Profile
                          </TabsTrigger>
                          <TabsTrigger value="booking" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Booking
                          </TabsTrigger>
                          <TabsTrigger value="amenities" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Amenities
                          </TabsTrigger>
                          <TabsTrigger value="payments" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Payments
                          </TabsTrigger>
                        </TabsList>
                        
                        <VenueAccountSettings activeTab={activeSettingsTab} />
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>

          {/* Modals and Dialogs */}
          <BookingDetailsModal
            booking={selectedBooking}
            notes={selectedBooking ? bookingNotes[selectedBooking.id] || "" : ""}
            onChangeNote={note => selectedBooking && handleBookingNoteChange(selectedBooking.id, note)}
            onClose={() => setSelectedBooking(null)}
          />
          <EventDetailsModal
            event={selectedEvent}
            onEdit={() => { setEditEventData(selectedEvent); setIsEditEventOpen(true) }}
            onDelete={() => { setEventToDelete(selectedEvent); setIsDeleteEventOpen(true) }}
            onClose={() => setSelectedEvent(null)}
          />
          <EditEventModal
            event={editEventData}
            onSave={handleSaveEditEvent}
            onClose={() => setIsEditEventOpen(false)}
          />

          {/* Delete Event Confirmation */}
          <AlertDialog open={isDeleteEventOpen} onOpenChange={setIsDeleteEventOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
              </AlertDialogHeader>
              <div>Are you sure you want to delete the event "{eventToDelete?.title}"?</div>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteEventOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDeleteEvent}>Delete</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            venue={venue}
            onSave={handleSaveProfile}
          />
        </div>
      </div>
    </div>
  )
}
