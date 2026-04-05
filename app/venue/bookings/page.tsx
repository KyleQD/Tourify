"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { useVenueCalendarData } from "../hooks/use-venue-calendar-data"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { approveBookingAndMaybeCreateEvent, respondToVenueBookingRequest } from "../actions/event-actions"
import RecurringTemplateForm from "../components/recurring-template-form"
import { useRouter } from "next/navigation"
import { getEventTypeBadgeColor, isSameCalendarDay } from "../lib/event-presentation"
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  DollarSign,
  Mail,
  Phone,
  Search,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Send,
  RefreshCw,
  AlertCircle,
  Download,
  Plus,
  CheckCircle,
  XCircle,
  Clock3,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface BookingRequest {
  id: string
  event_name: string
  event_type: string
  event_date: string
  event_duration: number
  expected_attendance: number
  budget_range: string
  description: string
  special_requirements: string
  contact_email: string
  contact_phone: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  response_message: string
  requested_at: string
  responded_at: string
  requester_id: string
}

const statusIcons = {
  pending: Clock3,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: AlertCircle,
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
}

export default function BookingsPage() {
  const router = useRouter()
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("requests")
  const {
    bookings: calendarEvents,
    venueEvents: calendarVenueEvents,
    isLoading: isCalendarLoading,
    error: calendarError,
    refresh: refreshCalendarData,
  } = useVenueCalendarData({
    venueId: venue?.id,
    month: calendarMonth,
    enabled: activeTab === "calendar",
  })
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [dateFilter, setDateFilter] = useState<Date | undefined>()
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")
  const [genreFilter, setGenreFilter] = useState<string>("all")

  // Response states
  const [responseAction, setResponseAction] = useState<"approve" | "reject" | null>(null)
  const [responseMessage, setResponseMessage] = useState("")

  useEffect(() => {
    if (venue?.id) {
      void fetchBookings({ showLoading: true })
    }
  }, [venue?.id])

  const fetchBookings = async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
    if (!venue?.id) return
    
    try {
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      const bookingData = await venueService.getVenueBookingRequests(venue.id)
      const normalized = (bookingData || []).map((b: any) => ({
        ...b,
        expected_attendance: b.expected_attendance ?? 0,
        response_message: b.response_message || "",
      })) as BookingRequest[]
      setBookings(normalized)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: "Error",
        description: "Failed to load booking requests",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleBookingAction = async (bookingId: string, action: "approved" | "rejected", message?: string) => {
    const previousBookings = [...bookings]
    try {
      setIsActionInProgress(bookingId)
      setBookings(prev => prev.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: action, response_message: message || "", responded_at: new Date().toISOString() }
          : booking
      ))

      if (action === "approved") {
        const result = await approveBookingAndMaybeCreateEvent({
          requestId: bookingId,
          createEvent: true,
          responseMessage: message,
        })
        if (!result.success) throw new Error(result.error || "Failed to approve booking request")
      } else {
        const result = await respondToVenueBookingRequest({
          requestId: bookingId,
          action: "rejected",
          responseMessage: message,
        })
        if (!result.success) throw new Error(result.error || "Failed to reject booking request")
      }

      toast({
        title: action === "approved" ? "Booking Approved" : "Booking Rejected",
        description: `Successfully ${action} the booking request.`,
      })
      
      setIsResponseModalOpen(false)
      setSelectedBooking(null)
      setResponseMessage("")
      setResponseAction(null)
      await fetchBookings()
      await refreshCalendarData()
    } catch (error) {
      setBookings(previousBookings)
      console.error('Error responding to booking:', error)
      toast({
        title: "Error",
        description: "Failed to respond to booking request",
        variant: "destructive"
      })
    } finally {
      setIsActionInProgress(null)
    }
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false

      if (
        deferredSearchTerm &&
        !booking.event_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) &&
        !booking.contact_email.toLowerCase().includes(deferredSearchTerm.toLowerCase())
      ) return false

      if (dateFilter && !isSameCalendarDay(booking.event_date, dateFilter)) return false

      if (eventTypeFilter !== "all" && booking.event_type !== eventTypeFilter) return false
      if (genreFilter !== "all" && (booking as any).genre !== genreFilter) return false

      return true
    })
  }, [bookings, statusFilter, deferredSearchTerm, dateFilter, eventTypeFilter, genreFilter])

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((booking) => booking.status === "pending").length,
    approved: bookings.filter((booking) => booking.status === "approved").length,
    rejected: bookings.filter((booking) => booking.status === "rejected").length,
  }), [bookings])

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return bookings
      .filter((booking) => booking.status === "approved" && new Date(booking.event_date).getTime() > now)
      .sort((first, second) => new Date(first.event_date).getTime() - new Date(second.event_date).getTime())
      .slice(0, 5)
  }, [bookings])

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof calendarEvents>()
    for (const booking of calendarEvents) {
      const key = new Date(booking.event_date).toDateString()
      const existing = map.get(key)
      if (existing) existing.push(booking)
      else map.set(key, [booking])
    }
    return map
  }, [calendarEvents])

  const venueEventsByDate = useMemo(() => {
    const map = new Map<string, typeof calendarVenueEvents>()
    for (const event of calendarVenueEvents) {
      const key = new Date(event.date).toDateString()
      const existing = map.get(key)
      if (existing) existing.push(event)
      else map.set(key, [event])
    }
    return map
  }, [calendarVenueEvents])

  if (venueLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
          <p className="text-muted-foreground">
            Manage booking requests and venue calendar for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetchBookings()
              await refreshCalendarData()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => router.push("/venue/dashboard/calendar")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time booking requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock3 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}% approval rate` : "No requests yet"}
            </p>
          </CardContent>
        </Card>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Declined requests</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Booking Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Templates</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
            <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                      id="search"
                      placeholder="Search by event name or contact..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
              />
            </div>
                </div>

                <div className="min-w-[120px]">
                  <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label>Event Type</Label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                      <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label>Genre</Label>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      <SelectItem value="edm">EDM</SelectItem>
                      <SelectItem value="hiphop">Hip-Hop</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="jazz">Jazz</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label>Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter ? format(dateFilter, "PPP") : "Any date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                      />
                      {dateFilter && (
                        <div className="p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDateFilter(undefined)}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

            <Button
              variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setEventTypeFilter("all")
                    setDateFilter(undefined)
                  }}
            >
                  Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

          {/* Booking Requests List */}
          <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">
                    {bookings.length === 0 ? 
                      "No booking requests yet. When clients request to book your venue, they'll appear here." :
                      "No bookings match your current filters."
                    }
                  </div>
              </CardContent>
            </Card>
          ) : (
              filteredBookings.map((booking) => {
                const StatusIcon = statusIcons[booking.status]
                return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                    <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{booking.event_name}</h3>
                            <Badge variant="outline" className={statusColors[booking.status]}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                            <Badge variant="secondary">{booking.event_type}</Badge>
                            {(booking as any).genre && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200">{(booking as any).genre}</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {format(new Date(booking.event_date), "PPP")}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              {booking.event_duration} hours
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {booking.expected_attendance} guests
                        </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              {booking.budget_range}
                        </div>
                      </div>
                      
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              {booking.contact_email}
                        </div>
                            {booking.contact_phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {booking.contact_phone}
                        </div>
                            )}
                        </div>

                          {booking.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {booking.description}
                            </p>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Requested {format(new Date(booking.requested_at), "PPP 'at' p")}
                            {booking.responded_at && (
                              <span> • Responded {format(new Date(booking.responded_at), "PPP 'at' p")}</span>
                            )}
                      </div>
                    </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking)
                              setIsDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>

                      {booking.status === "pending" && (
                            <div className="flex gap-1">
                          <Button
                             size="sm"
                                onClick={() => handleBookingAction(booking.id, "approved")}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={isActionInProgress === booking.id}
                          >
                                <Check className="h-4 w-4 mr-2" />
                                {isActionInProgress === booking.id ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                                variant="destructive"
                            size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setResponseAction("reject")
                                  setIsResponseModalOpen(true)
                                }}
                                disabled={isActionInProgress === booking.id}
                          >
                                <X className="h-4 w-4 mr-2" />
                                {isActionInProgress === booking.id ? "Processing..." : "Reject"}
                          </Button>
                            </div>
                      )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setIsDetailModalOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(booking.contact_email)
                                  toast({ title: "Email copied to clipboard" })
                                }}
                        >
                                <Mail className="h-4 w-4 mr-2" />
                                Copy Email
                              </DropdownMenuItem>
                              {booking.contact_phone && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(booking.contact_phone)
                                    toast({ title: "Phone copied to clipboard" })
                                  }}
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Copy Phone
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )
              })
          )}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          {venue && (
            <RecurringTemplateForm venueId={venue.id} onCreated={() => {
              toast({ title: 'Template saved', description: 'Generate slots from the template to open applications.' })
            }} />
          )}
          <Card>
            <CardHeader>
              <CardTitle>How recurring nights work</CardTitle>
              <CardDescription>Define weekly nights like EDM Night or Reggae Night. Slots are generated and artists can request those dates.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Venue Calendar</CardTitle>
                <CardDescription>Confirmed booking requests (approved)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground w-28 text-center">
                  {format(calendarMonth, 'MMMM yyyy')}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCalendarLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : calendarError ? (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {calendarError}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 0).getDate() }).map((_, idx) => {
                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), idx + 1)
                    const dayKey = date.toDateString()
                    const items = bookingsByDate.get(dayKey) || []
                    const venueItems = venueEventsByDate.get(dayKey) || []
                    return (
                      <div key={idx} className="border rounded-md p-2 min-h-24">
                        <div className="text-xs font-medium text-muted-foreground">{idx + 1}</div>
                        <div className="mt-1 space-y-1">
                          {items.map(item => (
                            <div key={item.id} className="text-xs rounded bg-green-100 text-green-800 px-1 py-0.5 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="truncate" title={item.event_name}>{item.event_name}</span>
                            </div>
                          ))}
                          {venueItems.map(item => (
                            <div
                              key={item.id}
                              className={`text-xs rounded text-white px-1 py-0.5 truncate ${getEventTypeBadgeColor(item.type)}`}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
                <Card>
                  <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Approved bookings scheduled for the future</CardDescription>
                  </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming events scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-medium">{event.event_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {format(new Date(event.event_date), "PPP")}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {event.expected_attendance} guests
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {event.event_duration} hours
                          </span>
                        </div>
                    </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirmed
                      </Badge>
                    </div>
                  ))}
                    </div>
              )}
                  </CardContent>
                </Card>
        </TabsContent>

        <TabsContent value="settings">
              <Card>
                <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
              <CardDescription>Configure your venue's booking preferences</CardDescription>
                </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Booking Policies</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lead-time">Minimum Lead Time</Label>
                    <Select defaultValue="1week">
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1day">1 Day</SelectItem>
                        <SelectItem value="3days">3 Days</SelectItem>
                        <SelectItem value="1week">1 Week</SelectItem>
                        <SelectItem value="2weeks">2 Weeks</SelectItem>
                        <SelectItem value="1month">1 Month</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-advance">Maximum Advance Booking</Label>
                    <Select defaultValue="1year">
                      <SelectTrigger>
                        <SelectValue placeholder="Select maximum advance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto-approve">Auto-Approval Settings</Label>
                    <Select defaultValue="manual">
                      <SelectTrigger>
                        <SelectValue placeholder="Select auto-approval policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Review (Recommended)</SelectItem>
                        <SelectItem value="trusted">Trusted Clients Only</SelectItem>
                        <SelectItem value="small">Small Events (&lt;50 people)</SelectItem>
                        <SelectItem value="all">All Requests</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Notifications</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      placeholder="bookings@yourvenue.com"
                      defaultValue={venue.contact_info?.booking_email || venue.contact_info?.email || ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response-template">Default Response Template</Label>
                    <Textarea
                      id="response-template"
                      placeholder="Thank you for your booking request. We'll review and respond within 24 hours."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rejection-template">Rejection Template</Label>
                    <Textarea
                      id="rejection-template"
                      placeholder="Unfortunately, we cannot accommodate your request for the requested date."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedBooking.event_name}
                  <Badge variant="outline" className={statusColors[selectedBooking.status]}>
                    {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Booking request details and contact information
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Event Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Event Type:</span>
                        <span>{selectedBooking.event_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(selectedBooking.event_date), "PPP")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{selectedBooking.event_duration} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Attendance:</span>
                        <span>{selectedBooking.expected_attendance} guests</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget Range:</span>
                        <span>{selectedBooking.budget_range}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.contact_email}</span>
                      </div>
                      {selectedBooking.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedBooking.contact_phone}</span>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                  
                {selectedBooking.description && (
                    <div>
                    <h4 className="font-medium mb-2">Event Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedBooking.description}
                    </p>
                    </div>
                  )}
                  
                {selectedBooking.special_requirements && (
                    <div>
                    <h4 className="font-medium mb-2">Special Requirements</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedBooking.special_requirements}
                    </p>
                    </div>
                  )}

                {selectedBooking.response_message && (
                    <div>
                    <h4 className="font-medium mb-2">Your Response</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedBooking.response_message}
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground border-t pt-4">
                  <p>Requested on {format(new Date(selectedBooking.requested_at), "PPP 'at' p")}</p>
                  {selectedBooking.responded_at && (
                    <p>Responded on {format(new Date(selectedBooking.responded_at), "PPP 'at' p")}</p>
                  )}
                      </div>
                    </div>
                
                {selectedBooking.status === "pending" && (
                <DialogFooter>
                    <Button 
                    variant="outline"
                      onClick={() => {
                      setSelectedBooking(selectedBooking)
                      setResponseAction("reject")
                      setIsDetailModalOpen(false)
                      setIsResponseModalOpen(true)
                      }}
                    >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                    </Button>
                    <Button 
                      onClick={() => {
                      setSelectedBooking(selectedBooking)
                      setResponseAction("approve")
                      setIsDetailModalOpen(false)
                      setIsResponseModalOpen(true)
                      }}
                    className="bg-green-600 hover:bg-green-700"
                    >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                    </Button>
                </DialogFooter>
              )}
                  </>
                )}
        </DialogContent>
      </Dialog>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent>
          {selectedBooking && responseAction && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {responseAction === "approve" ? "Approve" : "Reject"} Booking Request
                </DialogTitle>
                <DialogDescription>
                  {responseAction === "approve" 
                    ? "Confirm this booking and send approval message to the client."
                    : "Decline this booking request and provide a reason."
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedBooking.event_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedBooking.event_date), "PPP")} • {selectedBooking.expected_attendance} guests
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response">
                    {responseAction === "approve" ? "Approval Message" : "Rejection Reason"}
                  </Label>
                  <Textarea
                    id="response"
                    placeholder={
                      responseAction === "approve"
                        ? "Great! We're excited to host your event. We'll follow up with next steps..."
                        : "Unfortunately, we cannot accommodate your request because..."
                    }
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsResponseModalOpen(false)
                    setResponseMessage("")
                    setResponseAction(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleBookingAction(selectedBooking.id, (responseAction === "approve" ? "approved" : "rejected"), responseMessage)}
                  className={responseAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                  variant={responseAction === "reject" ? "destructive" : "default"}
                  disabled={isActionInProgress === selectedBooking.id}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isActionInProgress === selectedBooking.id
                    ? "Sending..."
                    : responseAction === "approve"
                      ? "Approve & Send"
                      : "Reject & Send"}
                </Button>
              </DialogFooter>
            </>
          )}
          </DialogContent>
        </Dialog>
    </div>
  )
}
