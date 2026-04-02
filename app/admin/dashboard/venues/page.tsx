"use client"

import { useState, useEffect } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { AdminPageHeader } from "../components/admin-page-header"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  Building,
  Search,
  Plus,
  Filter,
  Star,
  Eye,
  Edit,
  MoreVertical,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  Award,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Target,
  Zap,
  Sparkles,
  Crown,
  Shield,
  Heart,
  MessageSquare,
  FileText,
  Download,
  Upload,
  Share,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  BarChart3,
  PieChart,
  Truck,
  Coffee,
  Wifi,
  ParkingMeter,
  Accessibility,
  Volume2,
  Headphones,
  Mic,
  Radio,
  Camera,
  Monitor,
  Lightbulb,
  Utensils,
  Car,
  Bell,
  Settings,
  UserCheck,
  Handshake,
  Bookmark,
  Map,
  Navigation,
} from "lucide-react"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminStatCard } from "../components/admin-stat-card"
import { statusBadgeClass } from "../components/admin-badge-utils"
import { SurfaceInput } from "@/components/surface/surface-primitives"
import { AdminSurfaceCard } from "../components/admin-surface-card"
import { AdminSurfaceSelectTrigger, AdminSurfaceTabsList } from "../components/admin-surface-controls"
import { AdminPageActionsRow } from "../components/admin-page-actions-row"

interface Venue {
  id: string
  name: string
  owner_name?: string
  email: string
  phone?: string
  avatar_url?: string
  description?: string
  address: string
  city: string
  state: string
  country: string
  capacity: number
  venue_types: string[]
  status: 'active' | 'inactive' | 'pending' | 'verified'
  tier: 'basic' | 'premium' | 'partner' | 'exclusive'
  amenities: {
    sound_system: boolean
    lighting_system: boolean
    stage: boolean
    parking: boolean
    wifi: boolean
    catering: boolean
    security: boolean
    accessibility: boolean
    green_room: boolean
    bar_service: boolean
  }
  social_links: {
    website?: string
    instagram?: string
    facebook?: string
    twitter?: string
  }
  stats: {
    total_bookings: number
    completed_events: number
    total_revenue: number
    average_rating: number
    response_rate: number
    booking_success_rate: number
  }
  pricing: {
    base_rate: number
    hourly_rate?: number
    deposit_required: boolean
    cancellation_policy: string
  }
  availability_status: 'available' | 'busy' | 'unavailable'
  last_event?: string
  joined_date: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  contract_status: 'none' | 'pending' | 'active' | 'expired'
  partnership_level: 'standard' | 'preferred' | 'exclusive'
}

interface BookingRequest {
  id: string
  venue_id: string
  event_name: string
  requester_name: string
  event_date: string
  event_type: string
  expected_attendance: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_at: string
  budget_range?: string
  special_requirements?: string
}

function mapProfileToVenue(p: any): Venue {
  return {
    id: p.id,
    name: p.full_name || p.venue_name || p.username || 'Unknown Venue',
    owner_name: p.owner_name,
    email: p.email || '',
    phone: p.phone || undefined,
    avatar_url: p.avatar_url || undefined,
    description: p.bio || p.description || undefined,
    address: p.address || '',
    city: p.city || p.location || '',
    state: p.state || '',
    country: p.country || 'USA',
    capacity: p.capacity || 0,
    venue_types: p.venue_types || [],
    status: 'active',
    tier: 'basic',
    amenities: p.amenities || {
      sound_system: false, lighting_system: false, stage: false,
      parking: false, wifi: false, catering: false,
      security: false, accessibility: false, green_room: false, bar_service: false
    },
    social_links: p.social_links || {},
    stats: {
      total_bookings: 0, completed_events: 0, total_revenue: 0,
      average_rating: 0, response_rate: 0, booking_success_rate: 0
    },
    pricing: { base_rate: 0, deposit_required: false, cancellation_policy: '' },
    availability_status: 'available',
    joined_date: p.created_at || new Date().toISOString(),
    verification_status: p.verified ? 'verified' : 'unverified',
    contract_status: 'none',
    partnership_level: 'standard'
  }
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch('/api/search?q=&type=venues&limit=50', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const list = data.results?.venues ?? []
          setVenues(list.map(mapProfileToVenue))
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVenues()
  }, [])

  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([])
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])

  // Filter venues based on search and filters
  useEffect(() => {
    let filtered = venues

    if (searchQuery) {
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.venue_types.some(type => type.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(venue => venue.status === statusFilter)
    }

    if (tierFilter !== "all") {
      filtered = filtered.filter(venue => venue.tier === tierFilter)
    }

    setFilteredVenues(filtered)
  }, [venues, searchQuery, statusFilter, tierFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
      case 'inactive':
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Inactive</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
      case 'verified':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Unknown</Badge>
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'basic':
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Basic</Badge>
      case 'premium':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Premium</Badge>
      case 'partner':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Partner</Badge>
      case 'exclusive':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Crown className="h-3 w-3 mr-1" />Exclusive</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Unknown</Badge>
    }
  }

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>
      case 'busy':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Busy</Badge>
      case 'unavailable':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Unavailable</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Unknown</Badge>
    }
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Unverified</Badge>
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="container mx-auto space-y-6">
        <AdminPageHeader
          title="Venue Management"
          subtitle="Manage venue partnerships, bookings, and relationship coordination"
          icon={Building}
          actions={
            <AdminPageActionsRow>
              <Button
                type="button"
                disabled
                title="Venue creation is not available in admin yet"
                className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white border-0 opacity-60 cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Venue
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 backdrop-blur-sm transition-all duration-200">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </AdminPageActionsRow>
          }
        />

        {/* Stats Overview */}
        {isLoading ? (
          <AdminPageSkeleton />
        ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Venues"
            value={venues.length}
            icon={Building}
            color="blue"
            size="default"
          />
          <AdminStatCard
            title="Active Venues"
            value={venues.filter(v => v.status === 'active').length}
            icon={Activity}
            color="green"
            size="default"
          />
          <AdminStatCard
            title="Avg Rating"
            value={
              venues.length > 0
                ? (venues.reduce((sum, v) => sum + (v.stats.average_rating || 0), 0) / venues.length).toFixed(1)
                : '0.0'
            }
            icon={Star}
            color="amber"
            size="default"
          />
          <AdminStatCard
            title="Total Revenue"
            value={`$${formatNumber(venues.reduce((sum, v) => sum + (v.stats.total_revenue || 0), 0))}`}
            icon={DollarSign}
            color="orange"
            size="default"
          />
        </div>

        {/* Search and Filters */}
        <AdminSurfaceCard>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <SurfaceInput
                  placeholder="Search venues by name, location, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <AdminSurfaceSelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Status" />
                </AdminSurfaceSelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <AdminSurfaceSelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Tier" />
                </AdminSurfaceSelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </AdminSurfaceCard>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <motion.div
              key={venue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <AdminSurfaceCard className="hover:border-purple-500/30 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={venue.avatar_url} />
                        <AvatarFallback>{venue.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-white">{venue.name}</h3>
                        <p className="text-sm text-slate-400">{venue.city}, {venue.state}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedVenue(venue)
                        setIsDetailsOpen(true)
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {getStatusBadge(venue.status)}
                        {getTierBadge(venue.tier)}
                      </div>
                      {getAvailabilityBadge(venue.availability_status)}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {getVerificationBadge(venue.verification_status)}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Capacity</p>
                        <p className="font-semibold text-white">{formatNumber(venue.capacity)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {venue.venue_types.slice(0, 3).map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      {venue.venue_types.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{venue.venue_types.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Bookings</p>
                        <p className="font-semibold text-white">{venue.stats.total_bookings}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Revenue</p>
                        <p className="font-semibold text-green-400">
                          ${formatNumber(venue.stats.total_revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Rating</p>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                          <p className="font-semibold text-white">{venue.stats.average_rating}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400">Response Rate</p>
                        <p className="font-semibold text-white">{venue.stats.response_rate}%</p>
                      </div>
                    </div>

                    {/* Amenities Icons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {venue.amenities.sound_system && <Volume2 className="h-4 w-4 text-slate-400" />}
                      {venue.amenities.lighting_system && <Lightbulb className="h-4 w-4 text-slate-400" />}
                      {venue.amenities.parking && <Car className="h-4 w-4 text-slate-400" />}
                      {venue.amenities.wifi && <Wifi className="h-4 w-4 text-slate-400" />}
                      {venue.amenities.catering && <Utensils className="h-4 w-4 text-slate-400" />}
                      {venue.amenities.accessibility && <Accessibility className="h-4 w-4 text-slate-400" />}
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Success Rate</span>
                        <span className="text-xs text-slate-400">
                          {venue.stats.booking_success_rate}%
                        </span>
                      </div>
                      <Progress value={venue.stats.booking_success_rate} className="h-2" />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex space-x-2">
                        {venue.social_links.website && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Globe className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {venue.social_links.instagram && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Instagram className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {venue.social_links.facebook && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Facebook className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVenue(venue)
                            setIsDetailsOpen(true)
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Edit is not implemented"
                          className="text-slate-500 cursor-not-allowed opacity-60"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AdminSurfaceCard>
            </motion.div>
          ))}
        </div>

        {filteredVenues.length === 0 && !isLoading && (
          <AdminEmptyState
            icon={Building}
            title="No venues found"
            description="Venues will appear when your search returns results"
          />
        )}
          </>
        )}

        {/* Recent Booking Requests */}
        <AdminSurfaceCard>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center">
              <Bell className="h-5 w-5 mr-2 text-yellow-400" />
              Recent Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookingRequests.map((request) => {
                const venue = venues.find(v => v.id === request.venue_id)
                return (
                  <div key={request.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{venue?.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-white">{request.event_name}</h4>
                        <p className="text-sm text-slate-400">
                          {venue?.name} • {formatSafeDate(request.event_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Expected</p>
                        <p className="font-medium text-white">{formatNumber(request.expected_attendance)}</p>
                      </div>
                      <Badge
                        className={statusBadgeClass(
                          request.status === "approved" ? "confirmed" : request.status
                        )}
                      >
                        {request.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </AdminSurfaceCard>

        {/* Venue Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Venue Profile - {selectedVenue?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedVenue && (
              <div className="space-y-6">
                <div className="flex items-start space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedVenue.avatar_url} />
                    <AvatarFallback className="text-2xl">{selectedVenue.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedVenue.name}</h2>
                      <p className="text-slate-400">{selectedVenue.description}</p>
                      <p className="text-slate-400 mt-1">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {selectedVenue.address}, {selectedVenue.city}, {selectedVenue.state}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {getStatusBadge(selectedVenue.status)}
                      {getTierBadge(selectedVenue.tier)}
                      {getAvailabilityBadge(selectedVenue.availability_status)}
                      {getVerificationBadge(selectedVenue.verification_status)}
                    </div>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <AdminSurfaceTabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </AdminSurfaceTabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AdminStatCard
                        title="Capacity"
                        value={formatNumber(selectedVenue.capacity)}
                        icon={Users}
                        color="blue"
                        size="default"
                      />
                      <AdminStatCard
                        title="Total Bookings"
                        value={selectedVenue.stats.total_bookings}
                        icon={CalendarIcon}
                        color="green"
                        size="default"
                      />
                      <AdminStatCard
                        title="Total Revenue"
                        value={`$${formatNumber(selectedVenue.stats.total_revenue)}`}
                        icon={DollarSign}
                        color="amber"
                        size="default"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminSurfaceCard>
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-white">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{selectedVenue.email}</span>
                          </div>
                          {selectedVenue.phone && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">{selectedVenue.phone}</span>
                            </div>
                          )}
                          {selectedVenue.owner_name && (
                            <div className="flex items-center space-x-3">
                              <UserCheck className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">{selectedVenue.owner_name}</span>
                            </div>
                          )}
                        </CardContent>
                      </AdminSurfaceCard>

                      <AdminSurfaceCard>
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-white">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average Rating</span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                              <span className="text-white">{selectedVenue.stats.average_rating}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Response Rate</span>
                            <span className="text-white">{selectedVenue.stats.response_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Success Rate</span>
                            <span className="text-white">{selectedVenue.stats.booking_success_rate}%</span>
                          </div>
                        </CardContent>
                      </AdminSurfaceCard>
                    </div>
                  </TabsContent>

                  <TabsContent value="amenities">
                    <AdminSurfaceCard>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Venue Amenities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(selectedVenue.amenities).map(([amenity, available]) => {
                            const getAmenityIcon = (amenity: string) => {
                              switch (amenity) {
                                case 'sound_system': return <Volume2 className="h-5 w-5" />
                                case 'lighting_system': return <Lightbulb className="h-5 w-5" />
                                case 'stage': return <Monitor className="h-5 w-5" />
                                case 'parking': return <Car className="h-5 w-5" />
                                case 'wifi': return <Wifi className="h-5 w-5" />
                                case 'catering': return <Utensils className="h-5 w-5" />
                                case 'security': return <Shield className="h-5 w-5" />
                                case 'accessibility': return <Accessibility className="h-5 w-5" />
                                case 'green_room': return <Coffee className="h-5 w-5" />
                                case 'bar_service': return <Coffee className="h-5 w-5" />
                                default: return <CheckCircle className="h-5 w-5" />
                              }
                            }

                            return (
                              <div 
                                key={amenity} 
                                className={`flex items-center space-x-3 p-3 rounded-xl ${
                                  available ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-700/50'
                                }`}
                              >
                                <div className={available ? 'text-green-400' : 'text-slate-500'}>
                                  {getAmenityIcon(amenity)}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${available ? 'text-white' : 'text-slate-500'}`}>
                                    {amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </p>
                                  <p className={`text-xs ${available ? 'text-green-400' : 'text-slate-500'}`}>
                                    {available ? 'Available' : 'Not Available'}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </AdminSurfaceCard>
                  </TabsContent>

                  <TabsContent value="pricing">
                    <AdminSurfaceCard>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Pricing Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-slate-400">Base Rate</Label>
                            <p className="text-2xl font-bold text-green-400">
                              {formatSafeCurrency(selectedVenue.pricing.base_rate)}
                            </p>
                          </div>
                          {selectedVenue.pricing.hourly_rate && (
                            <div>
                              <Label className="text-slate-400">Hourly Rate</Label>
                              <p className="text-2xl font-bold text-blue-400">
                                {formatSafeCurrency(selectedVenue.pricing.hourly_rate)}/hr
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-slate-400">Deposit Required</Label>
                          <p className="text-white">
                            {selectedVenue.pricing.deposit_required ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-slate-400">Cancellation Policy</Label>
                          <p className="text-white">{selectedVenue.pricing.cancellation_policy}</p>
                        </div>
                      </CardContent>
                    </AdminSurfaceCard>
                  </TabsContent>

                  <TabsContent value="bookings">
                    <AdminSurfaceCard>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Booking History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Booking history integration would be implemented here</p>
                          <p className="text-sm">Connect to the booking management system</p>
                        </div>
                      </CardContent>
                    </AdminSurfaceCard>
                  </TabsContent>

                  <TabsContent value="analytics">
                    <AdminSurfaceCard>
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Performance Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Venue analytics charts would be displayed here</p>
                          <p className="text-sm">Revenue trends, booking patterns, and performance metrics</p>
                        </div>
                      </CardContent>
                    </AdminSurfaceCard>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
} 