"use client"

import { useState, useEffect } from "react"
import { 
  Building, 
  Users, 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLodging, useLodgingBookings, useLodgingProviders, useLodgingGuestAssignments } from "@/hooks/use-lodging"
import type { 
  LodgingBooking, 
  LodgingProvider, 
  LodgingGuestAssignment,
  LodgingRoomType 
} from "@/hooks/use-lodging"

interface LodgingManagementProps {
  eventId?: string
  tourId?: string
}

interface WorkforcePersonOption {
  userId: string
  name: string
  email: string | null
  role: string | null
  staffMemberId: string | null
}

export function LodgingManagement({ eventId, tourId }: LodgingManagementProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("bookings")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isGuestAssignmentDialogOpen, setIsGuestAssignmentDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<LodgingBooking | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<LodgingProvider | null>(null)
  const [workforcePeople, setWorkforcePeople] = useState<WorkforcePersonOption[]>([])

  // Fetch data
  const { 
    bookings, 
    providers, 
    guestAssignments,
    bookingsLoading,
    fetchBookings, 
    fetchProviders,
    fetchGuestAssignments,
    createBooking, 
    updateBooking, 
    deleteBooking,
    createGuestAssignment,
    updateGuestAssignment,
    deleteGuestAssignment
  } = useLodging()

  // Form states
  const [bookingForm, setBookingForm] = useState({
    provider_id: "",
    room_type_id: "",
    check_in_date: "",
    check_out_date: "",
    check_in_time: "15:00",
    check_out_time: "11:00",
    rooms_booked: 1,
    guests_per_room: 1,
    total_guests: 1,
    primary_guest_name: "",
    primary_guest_email: "",
    primary_guest_phone: "",
    special_requests: "",
    dietary_restrictions: [] as string[],
    accessibility_needs: [] as string[],
    rate_per_night: 0,
    tax_amount: 0,
    fees: 0,
    discount_amount: 0,
    deposit_amount: 0,
    booking_source: "direct" as const,
    status: "pending" as const,
    payment_status: "pending" as const,
    total_amount: 0,
    confirmation_number: "",
    cancellation_policy: "",
    cancellation_deadline: ""
  })

  const [guestAssignmentForm, setGuestAssignmentForm] = useState({
    booking_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_type: "crew" as const,
    staff_id: "",
    crew_member_id: "",
    team_member_id: "",
    room_number: "",
    bed_preference: "",
    roommate_preference: "",
    dietary_restrictions: [] as string[],
    accessibility_needs: [] as string[],
    special_requests: ""
  })

  // Filtered data
  const filteredBookings = bookings?.filter(booking => {
    const matchesSearch = booking.primary_guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.lodging_providers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  const filteredGuestAssignments = guestAssignments?.filter(assignment => {
    const matchesSearch = assignment.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.guest_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  // Load data
  useEffect(() => {
    fetchBookings({ event_id: eventId, tour_id: tourId })
    fetchProviders()
    fetchGuestAssignments()
  }, [eventId, tourId, fetchBookings, fetchProviders, fetchGuestAssignments])

  useEffect(() => {
    let cancelled = false
    async function loadWorkforcePeople() {
      if (!eventId && !tourId) {
        setWorkforcePeople([])
        return
      }
      try {
        const params = new URLSearchParams()
        if (eventId) params.set("event_id", eventId)
        if (tourId) params.set("tour_id", tourId)
        const response = await fetch(`/api/admin/workforce/people?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))
        if (cancelled) return
        const rows = Array.isArray(payload.people) ? payload.people : Array.isArray(payload.members) ? payload.members : []
        setWorkforcePeople(
          rows.map((row: any) => ({
            userId: String(row.userId ?? row.user_id ?? row.id),
            name: String(row.name ?? row.full_name ?? "Staff member"),
            email: row.email ?? null,
            role: row.role ?? null,
            staffMemberId: row.staffMemberId ?? row.staff_member_id ?? null,
          })).filter((row: WorkforcePersonOption) => row.userId)
        )
      } catch {
        if (!cancelled) setWorkforcePeople([])
      }
    }
    void loadWorkforcePeople()
    return () => {
      cancelled = true
    }
  }, [eventId, tourId])

  // Handle form submission
  const handleCreateBooking = async () => {
    try {
      await createBooking({
        ...bookingForm,
        event_id: eventId,
        tour_id: tourId
      })
      setIsCreateDialogOpen(false)
      setBookingForm({
        provider_id: "",
        room_type_id: "",
        check_in_date: "",
        check_out_date: "",
        check_in_time: "15:00",
        check_out_time: "11:00",
        rooms_booked: 1,
        guests_per_room: 1,
        total_guests: 1,
        primary_guest_name: "",
        primary_guest_email: "",
        primary_guest_phone: "",
        special_requests: "",
        dietary_restrictions: [],
        accessibility_needs: [],
        rate_per_night: 0,
        tax_amount: 0,
        fees: 0,
        discount_amount: 0,
        deposit_amount: 0,
        status: "pending" as const,
        payment_status: "pending" as const,
        total_amount: 0,
        booking_source: "direct",
        confirmation_number: "",
        cancellation_policy: "",
        cancellation_deadline: ""
      })
    } catch (error) {
      console.error("Error creating booking:", error)
    }
  }

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return
    
    try {
      await updateBooking(selectedBooking.id, bookingForm)
      setIsEditDialogOpen(false)
      setSelectedBooking(null)
    } catch (error) {
      console.error("Error updating booking:", error)
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteBooking(bookingId)
      } catch (error) {
        console.error("Error deleting booking:", error)
      }
    }
  }

  const handleCreateGuestAssignment = async () => {
    try {
      await createGuestAssignment(guestAssignmentForm)
      setIsGuestAssignmentDialogOpen(false)
      setGuestAssignmentForm({
        booking_id: "",
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        guest_type: "crew",
        staff_id: "",
        crew_member_id: "",
        team_member_id: "",
        room_number: "",
        bed_preference: "",
        roommate_preference: "",
        dietary_restrictions: [],
        accessibility_needs: [],
        special_requests: ""
      })
    } catch (error) {
      console.error("Error creating guest assignment:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20", label: "Pending" },
      confirmed: { color: "bg-green-500/20 text-green-500 border-green-500/20", label: "Confirmed" },
      checked_in: { color: "bg-blue-500/20 text-blue-500 border-blue-500/20", label: "Checked In" },
      checked_out: { color: "bg-gray-500/20 text-gray-500 border-gray-500/20", label: "Checked Out" },
      cancelled: { color: "bg-red-500/20 text-red-500 border-red-500/20", label: "Cancelled" },
      no_show: { color: "bg-orange-500/20 text-orange-500 border-orange-500/20", label: "No Show" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const getGuestTypeBadge = (type: string) => {
    const typeConfig = {
      crew: { color: "bg-purple-500/20 text-purple-500 border-purple-500/20", label: "Crew" },
      artist: { color: "bg-pink-500/20 text-pink-500 border-pink-500/20", label: "Artist" },
      staff: { color: "bg-blue-500/20 text-blue-500 border-blue-500/20", label: "Staff" },
      vendor: { color: "bg-orange-500/20 text-orange-500 border-orange-500/20", label: "Vendor" },
      guest: { color: "bg-green-500/20 text-green-500 border-green-500/20", label: "Guest" },
      vip: { color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20", label: "VIP" }
    }
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.guest
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Lodging Management</h2>
          <p className="text-slate-400">Manage hotel bookings, guest assignments, and accommodations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lodging Booking</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={bookingForm.provider_id} onValueChange={(value) => setBookingForm({...bookingForm, provider_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers?.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Guest Name</Label>
                  <Input 
                    value={bookingForm.primary_guest_name}
                    onChange={(e) => setBookingForm({...bookingForm, primary_guest_name: e.target.value})}
                    placeholder="Enter guest name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-in Date</Label>
                  <Input 
                    type="date"
                    value={bookingForm.check_in_date}
                    onChange={(e) => setBookingForm({...bookingForm, check_in_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Input 
                    type="date"
                    value={bookingForm.check_out_date}
                    onChange={(e) => setBookingForm({...bookingForm, check_out_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rooms Booked</Label>
                  <Input 
                    type="number"
                    value={bookingForm.rooms_booked}
                    onChange={(e) => setBookingForm({...bookingForm, rooms_booked: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Guests</Label>
                  <Input 
                    type="number"
                    value={bookingForm.total_guests}
                    onChange={(e) => setBookingForm({...bookingForm, total_guests: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Night</Label>
                  <Input 
                    type="number"
                    value={bookingForm.rate_per_night}
                    onChange={(e) => setBookingForm({...bookingForm, rate_per_night: parseFloat(e.target.value)})}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Guest Email</Label>
                  <Input 
                    type="email"
                    value={bookingForm.primary_guest_email}
                    onChange={(e) => setBookingForm({...bookingForm, primary_guest_email: e.target.value})}
                    placeholder="guest@example.com"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Special Requests</Label>
                  <Textarea 
                    value={bookingForm.special_requests}
                    onChange={(e) => setBookingForm({...bookingForm, special_requests: e.target.value})}
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBooking}>
                  Create Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search bookings, guests, or providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="guests">Guest Assignments</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-100">
                            {booking.lodging_providers?.name || 'Unknown Hotel'}
                          </h3>
                          {getStatusBadge(booking.status)}
                          <Badge variant="outline" className="text-xs">
                            {booking.booking_number}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                          <div>
                            <span className="font-medium">Guest:</span> {booking.primary_guest_name}
                          </div>
                          <div>
                            <span className="font-medium">Check-in:</span> {booking.check_in_date}
                          </div>
                          <div>
                            <span className="font-medium">Check-out:</span> {booking.check_out_date}
                          </div>
                          <div>
                            <span className="font-medium">Total:</span> ${booking.total_amount}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {booking.rooms_booked} rooms
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {booking.total_guests} guests
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {booking.total_nights} nights
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking)
                            setBookingForm({
                              provider_id: booking.provider_id,
                              room_type_id: booking.room_type_id,
                              check_in_date: booking.check_in_date,
                              check_out_date: booking.check_out_date,
                              check_in_time: booking.check_in_time || "15:00",
                              check_out_time: booking.check_out_time || "11:00",
                              rooms_booked: booking.rooms_booked,
                              guests_per_room: booking.guests_per_room,
                              total_guests: booking.total_guests,
                              primary_guest_name: booking.primary_guest_name,
                              primary_guest_email: booking.primary_guest_email || "",
                              primary_guest_phone: booking.primary_guest_phone || "",
                              special_requests: booking.special_requests || "",
                              dietary_restrictions: booking.dietary_restrictions,
                              accessibility_needs: booking.accessibility_needs,
                              rate_per_night: booking.rate_per_night,
                              tax_amount: booking.tax_amount,
                              fees: booking.fees,
                              discount_amount: booking.discount_amount,
                              deposit_amount: booking.deposit_amount,
                              booking_source: booking.booking_source as "direct",
                              status: booking.status as "pending",
                              payment_status: booking.payment_status as "pending",
                              total_amount: booking.total_amount || 0,
                              confirmation_number: booking.confirmation_number || "",
                              cancellation_policy: booking.cancellation_policy || "",
                              cancellation_deadline: booking.cancellation_deadline || ""
                            })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Guest Assignments Tab */}
        <TabsContent value="guests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-100">Guest Assignments</h3>
            <Dialog open={isGuestAssignmentDialogOpen} onOpenChange={setIsGuestAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Guest
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Guest to Booking</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Booking</Label>
                    <Select value={guestAssignmentForm.booking_id} onValueChange={(value) => setGuestAssignmentForm({...guestAssignmentForm, booking_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookings?.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {booking.booking_number} - {booking.primary_guest_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Roster member</Label>
                    <Select
                      value={guestAssignmentForm.team_member_id || "__manual__"}
                      onValueChange={(value) => {
                        if (value === "__manual__") {
                          setGuestAssignmentForm({
                            ...guestAssignmentForm,
                            team_member_id: "",
                            staff_id: "",
                            crew_member_id: "",
                          })
                          return
                        }
                        const person = workforcePeople.find((row) => row.userId === value)
                        setGuestAssignmentForm({
                          ...guestAssignmentForm,
                          team_member_id: value,
                          staff_id: person?.staffMemberId || "",
                          crew_member_id: person?.staffMemberId || "",
                          guest_name: person?.name || guestAssignmentForm.guest_name,
                          guest_email: person?.email || guestAssignmentForm.guest_email,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select from roster" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__manual__">Enter manually</SelectItem>
                        {workforcePeople.map((person) => (
                          <SelectItem key={person.userId} value={person.userId}>
                            {person.name}{person.role ? ` · ${person.role}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Guest Name</Label>
                    <Input 
                      value={guestAssignmentForm.guest_name}
                      onChange={(e) => setGuestAssignmentForm({...guestAssignmentForm, guest_name: e.target.value})}
                      placeholder="Enter guest name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guest Type</Label>
                    <Select value={guestAssignmentForm.guest_type} onValueChange={(value: any) => setGuestAssignmentForm({...guestAssignmentForm, guest_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crew">Crew</SelectItem>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Guest Email</Label>
                    <Input 
                      type="email"
                      value={guestAssignmentForm.guest_email}
                      onChange={(e) => setGuestAssignmentForm({...guestAssignmentForm, guest_email: e.target.value})}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Room Number</Label>
                    <Input 
                      value={guestAssignmentForm.room_number}
                      onChange={(e) => setGuestAssignmentForm({...guestAssignmentForm, room_number: e.target.value})}
                      placeholder="e.g., 301"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsGuestAssignmentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGuestAssignment}>
                    Assign Guest
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {filteredGuestAssignments.map((assignment) => (
              <Card key={assignment.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-slate-100">{assignment.guest_name}</h4>
                        {getGuestTypeBadge(assignment.guest_type)}
                        {getStatusBadge(assignment.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                        <div>
                          <span className="font-medium">Booking:</span> {assignment.lodging_bookings?.booking_number}
                        </div>
                        <div>
                          <span className="font-medium">Room:</span> {assignment.room_number || 'TBD'}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {assignment.guest_email || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {assignment.guest_phone || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteGuestAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lodging Booking</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={bookingForm.status} onValueChange={(value) => setBookingForm({...bookingForm, status: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={bookingForm.payment_status} onValueChange={(value) => setBookingForm({...bookingForm, payment_status: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate per Night</Label>
              <Input 
                type="number"
                value={bookingForm.rate_per_night}
                onChange={(e) => setBookingForm({...bookingForm, rate_per_night: parseFloat(e.target.value)})}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input 
                type="number"
                value={bookingForm.total_amount}
                onChange={(e) => setBookingForm({...bookingForm, total_amount: parseFloat(e.target.value)})}
                min="0"
                step="0.01"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Special Requests</Label>
              <Textarea 
                value={bookingForm.special_requests}
                onChange={(e) => setBookingForm({...bookingForm, special_requests: e.target.value})}
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBooking}>
              Update Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 