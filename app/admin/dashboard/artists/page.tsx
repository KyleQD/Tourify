"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { AdminPageHeader } from "../components/admin-page-header"
import {
  Music,
  Search,
  Plus,
  Filter,
  Star,
  Eye,
  Edit,
  MoreVertical,
  Calendar,
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
  Youtube,
  Music2,
  Apple,
  Disc,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Volume2,
  Headphones,
  Mic,
  Radio,
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
} from "lucide-react"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminStatCard } from "../components/admin-stat-card"

interface Artist {
  id: string
  name: string
  stage_name?: string
  email: string
  phone?: string
  avatar_url?: string
  bio?: string
  genres: string[]
  status: 'active' | 'inactive' | 'pending' | 'verified'
  tier: 'emerging' | 'established' | 'headliner' | 'legend'
  location?: string
  social_links: {
    website?: string
    instagram?: string
    twitter?: string
    facebook?: string
    youtube?: string
    spotify?: string
    apple_music?: string
    soundcloud?: string
  }
  stats: {
    total_bookings: number
    completed_events: number
    total_revenue: number
    average_rating: number
    followers: number
    monthly_listeners: number
  }
  upcoming_events: number
  last_performance?: string
  joined_date: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  contract_status: 'none' | 'pending' | 'active' | 'expired'
}

interface Booking {
  id: string
  artist_id: string
  event_title: string
  event_date: string
  venue: string
  location: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  fee: number
  type: 'headliner' | 'support' | 'opening' | 'special_guest'
  booking_date: string
  notes?: string
}

interface Performance {
  id: string
  artist_id: string
  event_title: string
  date: string
  venue: string
  attendance: number
  rating: number
  revenue: number
  feedback?: string
}

function mapProfileToArtist(p: any): Artist {
  return {
    id: p.id,
    name: p.full_name || p.username || 'Unknown',
    stage_name: p.artist_name || p.display_name,
    email: p.email || '',
    phone: p.phone || undefined,
    avatar_url: p.avatar_url || undefined,
    bio: p.bio || undefined,
    genres: p.genres || [],
    status: 'active',
    tier: 'emerging',
    location: p.location || undefined,
    social_links: p.social_links || {},
    stats: {
      total_bookings: 0,
      completed_events: 0,
      total_revenue: 0,
      average_rating: 0,
      followers: p.stats?.followers ?? p.follower_count ?? 0,
      monthly_listeners: 0
    },
    upcoming_events: 0,
    joined_date: p.created_at || new Date().toISOString(),
    verification_status: p.verified ? 'verified' : 'unverified',
    contract_status: 'none'
  }
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchArtists() {
      try {
        const res = await fetch('/api/search?q=&type=artists&limit=50', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const list = data.results?.artists ?? []
          setArtists(list.map(mapProfileToArtist))
        }
      } catch (err) {
        console.error('Failed to fetch artists:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchArtists()
  }, [])

  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Filter artists based on search and filters
  useEffect(() => {
    let filtered = artists

    if (searchQuery) {
      filtered = filtered.filter(artist =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genres.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(artist => artist.status === statusFilter)
    }

    if (tierFilter !== "all") {
      filtered = filtered.filter(artist => artist.tier === tierFilter)
    }

    setFilteredArtists(filtered)
  }, [artists, searchQuery, statusFilter, tierFilter])

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
      case 'emerging':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Emerging</Badge>
      case 'established':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Established</Badge>
      case 'headliner':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Headliner</Badge>
      case 'legend':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Crown className="h-3 w-3 mr-1" />Legend</Badge>
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
          title="Artist Management"
          subtitle="Manage artist profiles, bookings, and performance tracking"
          icon={Music}
          actions={
            <>
              <Button
                type="button"
                disabled
                title="Artist creation is not available in admin yet"
                className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white border-0 opacity-60 cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Artist
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 backdrop-blur-sm transition-all duration-200">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </>
          }
        />

        {/* Stats Overview */}
        {isLoading ? (
          <AdminPageSkeleton />
        ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Artists"
            value={artists.length}
            icon={Music}
            color="purple"
            size="default"
          />
          <AdminStatCard
            title="Active Artists"
            value={artists.filter(a => a.status === 'active').length}
            icon={Activity}
            color="green"
            size="default"
          />
          <AdminStatCard
            title="Avg Rating"
            value={
              artists.length > 0
                ? (artists.reduce((sum, a) => sum + (a.stats.average_rating || 0), 0) / artists.length).toFixed(1)
                : '0.0'
            }
            icon={Star}
            color="amber"
            size="default"
          />
          <AdminStatCard
            title="Total Revenue"
            value={`$${artists.length > 0 ? (artists.reduce((sum, a) => sum + (a.stats.total_revenue || 0), 0) / 1000).toFixed(0) : '0'}K`}
            icon={DollarSign}
            color="blue"
            size="default"
          />
        </div>

        {/* Search and Filters */}
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search artists by name, email, or genre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48 bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full lg:w-48 bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="emerging">Emerging</SelectItem>
                  <SelectItem value="established">Established</SelectItem>
                  <SelectItem value="headliner">Headliner</SelectItem>
                  <SelectItem value="legend">Legend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Artists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtists.map((artist) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={artist.avatar_url} />
                        <AvatarFallback>{artist.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-white">{artist.stage_name || artist.name}</h3>
                        <p className="text-sm text-slate-400">{artist.location}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedArtist(artist)
                        setIsDetailsOpen(true)
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {getStatusBadge(artist.status)}
                        {getTierBadge(artist.tier)}
                      </div>
                      {getVerificationBadge(artist.verification_status)}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {artist.genres.slice(0, 3).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {artist.genres.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{artist.genres.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Bookings</p>
                        <p className="font-semibold text-white">{artist.stats.total_bookings}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Revenue</p>
                        <p className="font-semibold text-green-400">
                          ${formatNumber(artist.stats.total_revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Rating</p>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                          <p className="font-semibold text-white">{artist.stats.average_rating}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400">Followers</p>
                        <p className="font-semibold text-white">{formatNumber(artist.stats.followers)}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Performance</span>
                        <span className="text-xs text-slate-400">
                          {artist.stats.total_bookings > 0 ? Math.round((artist.stats.completed_events / artist.stats.total_bookings) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={artist.stats.total_bookings > 0 ? (artist.stats.completed_events / artist.stats.total_bookings) * 100 : 0} 
                        className="h-2"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex space-x-2">
                        {artist.social_links.instagram && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Instagram className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {artist.social_links.spotify && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Music2 className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {artist.social_links.youtube && (
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <Youtube className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedArtist(artist)
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
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredArtists.length === 0 && !isLoading && (
          <AdminEmptyState
            icon={Music}
            title="No artists found"
            description="Artists will appear when your search returns results"
          />
        )}
          </>
        )}

        {/* Artist Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Music className="h-5 w-5 mr-2" />
                Artist Profile - {selectedArtist?.stage_name || selectedArtist?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedArtist && (
              <div className="space-y-6">
                <div className="flex items-start space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedArtist.avatar_url} />
                    <AvatarFallback className="text-2xl">{selectedArtist.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedArtist.stage_name || selectedArtist.name}</h2>
                      <p className="text-slate-400">{selectedArtist.bio}</p>
                    </div>
                    <div className="flex space-x-2">
                      {getStatusBadge(selectedArtist.status)}
                      {getTierBadge(selectedArtist.tier)}
                      {getVerificationBadge(selectedArtist.verification_status)}
                    </div>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="social">Social & Media</TabsTrigger>
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AdminStatCard
                        title="Total Bookings"
                        value={selectedArtist.stats.total_bookings}
                        icon={Calendar}
                        color="blue"
                        size="default"
                      />
                      <AdminStatCard
                        title="Completed Events"
                        value={selectedArtist.stats.completed_events}
                        icon={CheckCircle}
                        color="green"
                        size="default"
                      />
                      <AdminStatCard
                        title="Total Revenue"
                        value={`$${formatNumber(selectedArtist.stats.total_revenue)}`}
                        icon={DollarSign}
                        color="amber"
                        size="default"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-white">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{selectedArtist.email}</span>
                          </div>
                          {selectedArtist.phone && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">{selectedArtist.phone}</span>
                            </div>
                          )}
                          {selectedArtist.location && (
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300">{selectedArtist.location}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-white">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average Rating</span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                              <span className="text-white">{selectedArtist.stats.average_rating}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Followers</span>
                            <span className="text-white">{formatNumber(selectedArtist.stats.followers)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Monthly Listeners</span>
                            <span className="text-white">{formatNumber(selectedArtist.stats.monthly_listeners)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="bookings">
                    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Recent Bookings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Booking history integration would be implemented here</p>
                          <p className="text-sm">Connect to the booking management system</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="performance">
                    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Performance Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Performance analytics charts would be displayed here</p>
                          <p className="text-sm">Revenue trends, audience growth, and engagement metrics</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="social">
                    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Social Media & Streaming</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(selectedArtist.social_links).map(([platform, handle]) => {
                            if (!handle) return null
                            
                            const getIcon = (platform: string) => {
                              switch (platform) {
                                case 'instagram': return <Instagram className="h-5 w-5" />
                                case 'twitter': return <Twitter className="h-5 w-5" />
                                case 'facebook': return <Facebook className="h-5 w-5" />
                                case 'youtube': return <Youtube className="h-5 w-5" />
                                case 'spotify': return <Music2 className="h-5 w-5" />
                                case 'apple_music': return <Apple className="h-5 w-5" />
                                case 'soundcloud': return <Disc className="h-5 w-5" />
                                default: return <Globe className="h-5 w-5" />
                              }
                            }

                            return (
                              <div key={platform} className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-sm">
                                {getIcon(platform)}
                                <div>
                                  <p className="text-sm font-medium text-white capitalize">{platform.replace('_', ' ')}</p>
                                  <p className="text-xs text-slate-400">{handle}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contracts">
                    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-white">Contract Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Contract management interface would be implemented here</p>
                          <p className="text-sm">Upload, manage, and track artist contracts and agreements</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
} 