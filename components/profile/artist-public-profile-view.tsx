"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  User,
  MapPin,
  Calendar,
  Music2,
  Award,
  Users,
  Mail,
  Phone,
  Globe,
  Star,
  CheckCircle,
  ExternalLink,
  Share2,
  Play,
  Pause,
  Eye,
  Heart,
  Download,
  Disc3,
  Radio,
  Headphones,
  Volume2,
  Plus,
  Edit,
  Settings,
  // Mic,
  Video,
  ShoppingBag,
  TrendingUp,
  Tag,
  Sparkles,
  Zap,
  Target,
  Clock,
  DollarSign,
  Ticket,
  Store,
  MessageCircle,
  Instagram,
  Twitter,
  Youtube,
  Music,
  Apple,
  // Soundcloud,
  Link as LinkIcon,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Album,
  Guitar,
  Drum,
  Piano,
  Mic,
  // Stage,
  Lightbulb,
  Palette,
  Camera,
  Film,
  BookOpen,
  FileText,
  Briefcase,
  Building,
  Network,
  ThumbsUp,
  MessageSquare,
  Send,
  Bookmark,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArtistPublicProfileProps {
  profile: {
    id: string
    username: string
    account_type: 'artist'
    profile_data: {
      artist_name?: string
      stage_name?: string
      bio?: string
      genre?: string
      location?: string
      website?: string
      instagram?: string
      twitter?: string
      youtube?: string
      spotify?: string
      contact_email?: string
      phone?: string
      booking_rate?: string
      availability?: string
      equipment?: string
      music_style?: string
      experience_years?: string
      notable_performances?: string
      record_label?: string
      awards?: string
      upcoming_releases?: string
      collaboration_interest?: boolean
      available_for_hire?: boolean
    }
    avatar_url?: string
    cover_image?: string
    verified: boolean
    social_links?: any
    stats: {
      followers: number
      following: number
      posts: number
      likes: number
      views: number
      streams?: number
      events?: number
      monthly_listeners?: number
      total_revenue?: number
      engagement_rate?: number
    }
    created_at: string
  }
  isOwnProfile?: boolean
  onFollow?: (userId: string) => void
  onMessage?: (userId: string) => void
  onShare?: (profile: any) => void
}

interface Track {
  id: string
  title: string
  album?: string
  duration: string
  streams: number
  release_date: string
  cover_art?: string
  preview_url?: string
  spotify_url?: string
  apple_music_url?: string
}

interface Event {
  id: string
  title: string
  date: string
  venue: string
  city: string
  status: 'upcoming' | 'past' | 'sold_out'
  ticket_url?: string
  capacity: number
  sold_tickets: number
  price_range: string
}

interface MerchItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  available: boolean
}

export function ArtistPublicProfileView({ 
  profile, 
  isOwnProfile = false, 
  onFollow, 
  onMessage, 
  onShare 
}: ArtistPublicProfileProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [merchItems, setMerchItems] = useState<MerchItem[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchArtistData()
  }, [profile.id])

  const fetchArtistData = async () => {
    try {
      setLoading(true)
      
      // Load public tracks for this artist
      try {
        const res = await fetch(`/api/artists/${encodeURIComponent(profile.id)}/music?limit=6`)
        if (res.ok) {
          const json = await res.json()
          const loaded: Track[] = (json.tracks || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            album: undefined,
            duration: t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}` : '',
            streams: t.play_count || 0,
            release_date: t.release_date,
            cover_art: t.cover_art_url,
            preview_url: t.file_url,
            spotify_url: t.spotify_url
          }))
          setTracks(loaded)
        }
      } catch (e) {
        console.warn('Failed to load artist tracks, continuing with empty list')
        setTracks([])
      }

      const mockEvents: Event[] = [
        {
          id: "1",
          title: "Summer Festival 2024",
          date: "2024-07-15",
          venue: "Central Park",
          city: "New York",
          status: "upcoming",
          ticket_url: "https://tickets.example.com",
          capacity: 1000,
          sold_tickets: 450,
          price_range: "$25-$75"
        },
        {
          id: "2",
          title: "Electric Nights Tour",
          date: "2024-08-20",
          venue: "The Grand Hall",
          city: "Los Angeles",
          status: "upcoming",
          ticket_url: "https://tickets.example.com",
          capacity: 500,
          sold_tickets: 320,
          price_range: "$30-$60"
        }
      ]

      const mockMerch: MerchItem[] = [
        {
          id: "1",
          name: "Electric Nights T-Shirt",
          description: "Limited edition tour t-shirt",
          price: 25,
          image: "/merch-1.jpg",
          category: "clothing",
          available: true
        },
        {
          id: "2",
          name: "Signed Vinyl Album",
          description: "Electric Nights on vinyl with signature",
          price: 45,
          image: "/merch-2.jpg",
          category: "music",
          available: true
        }
      ]

      setEvents(mockEvents)
      setMerchItems(mockMerch)
    } catch (error) {
      console.error('Error fetching artist data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayTrack = (trackId: string) => {
    setCurrentlyPlaying(currentlyPlaying === trackId ? null : trackId)
  }

  const formatStreams = (streams: number) => {
    if (streams >= 1000000) {
      return `${(streams / 1000000).toFixed(1)}M`
    } else if (streams >= 1000) {
      return `${(streams / 1000).toFixed(1)}K`
    }
    return streams.toString()
  }

  const getDisplayName = () => {
    return profile.profile_data?.artist_name || 
           profile.profile_data?.stage_name || 
           profile.username
  }

  const getProfileColor = () => {
    return 'from-purple-600 via-pink-600 to-blue-600'
  }

  const getProfileIcon = () => {
    return <Mic className="h-4 w-4 text-white" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-300">Loading artist profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Cover Image with Gradient Overlay */}
      <div className="relative h-96 bg-gradient-to-r from-purple-900 via-pink-900 to-blue-900 overflow-hidden">
        {profile.cover_image && (
          <img 
            src={profile.cover_image} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>
        
        {/* Profile Header */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-8">
              {/* Avatar with Glow Effect */}
              <motion.div 
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <Avatar className="relative h-40 w-40 border-4 border-white/30 shadow-2xl ring-4 ring-white/10">
                  <AvatarImage src={profile.avatar_url} alt={getDisplayName()} />
                  <AvatarFallback className={`bg-gradient-to-br ${getProfileColor()} text-white text-4xl font-bold`}>
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Artist Badge */}
                <div className="absolute -bottom-2 -right-2 bg-slate-800 rounded-full p-3 border-2 border-white/30 shadow-lg">
                  <div className={`w-8 h-8 bg-gradient-to-br ${getProfileColor()} rounded-full flex items-center justify-center`}>
                    {getProfileIcon()}
                  </div>
                </div>
              </motion.div>

              {/* Profile Info */}
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                    {getDisplayName()}
                  </h1>
                  {profile.verified && (
                    <motion.div 
                      className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1 }}
                    >
                      <CheckCircle className="h-6 w-6 text-white" />
                    </motion.div>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-white/90 mb-6 flex-wrap">
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                    <Sparkles className="h-4 w-4 text-purple-300" />
                    <span className="font-medium">Artist</span>
                    {profile.profile_data?.genre && (
                      <>
                        <span className="text-white/60">•</span>
                        <span className="text-white/80">{profile.profile_data.genre}</span>
                      </>
                    )}
                  </span>
                  {profile.profile_data?.location && (
                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      <MapPin className="h-4 w-4" />
                      {profile.profile_data.location}
                    </span>
                  )}
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                    <Calendar className="h-4 w-4" />
                    Joined {formatSafeDate(profile.created_at)}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <motion.div 
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-2xl font-bold text-white">{profile.stats.followers.toLocaleString()}</div>
                    <div className="text-white/60 text-sm">Followers</div>
                  </motion.div>
                  <motion.div 
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-2xl font-bold text-white">{formatStreams(profile.stats.streams || 0)}</div>
                    <div className="text-white/60 text-sm">Streams</div>
                  </motion.div>
                  <motion.div 
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-2xl font-bold text-white">{profile.stats.events || 0}</div>
                    <div className="text-white/60 text-sm">Events</div>
                  </motion.div>
                  <motion.div 
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-2xl font-bold text-white">{profile.stats.monthly_listeners?.toLocaleString() || 0}</div>
                    <div className="text-white/60 text-sm">Monthly Listeners</div>
                  </motion.div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 flex-wrap">
                  {!isOwnProfile && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => onFollow?.(profile.id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Follow
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => onMessage?.(profile.id)}
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      </motion.div>
                    </>
                  )}
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => onShare?.(profile)}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </motion.div>
                  {isOwnProfile && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                        <Link href="/artist/profile">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="music" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                Music
              </TabsTrigger>
              <TabsTrigger 
                value="events" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                Events
              </TabsTrigger>
              <TabsTrigger 
                value="merch" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                Merch
              </TabsTrigger>
              <TabsTrigger 
                value="epk" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                EPK
              </TabsTrigger>
              <TabsTrigger 
                value="social" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
              >
                Social
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bio Section */}
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="h-5 w-5 text-purple-400" />
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 leading-relaxed">
                      {profile.profile_data?.bio || "No bio available"}
                    </p>
                    {profile.profile_data?.music_style && (
                      <div className="mt-4">
                        <h4 className="text-white font-medium mb-2">Music Style</h4>
                        <p className="text-white/70">{profile.profile_data.music_style}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                      Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Engagement Rate</span>
                      <span className="text-white font-medium">{profile.stats.engagement_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Total Revenue</span>
                      <span className="text-white font-medium">${profile.stats.total_revenue?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Experience</span>
                      <span className="text-white font-medium">{profile.profile_data?.experience_years || 0} years</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Music Tab */}
            <TabsContent value="music" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Latest Releases</h3>
                  <Button asChild variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Link href="/artist/music">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tracks.map((track) => (
                    <motion.div
                      key={track.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <img 
                            src={track.cover_art || "/placeholder-album.jpg"} 
                            alt={track.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute inset-0 bg-black/50 hover:bg-black/70 rounded-lg"
                            onClick={() => handlePlayTrack(track.id)}
                          >
                            {currentlyPlaying === track.id ? (
                              <Pause className="h-4 w-4 text-white" />
                            ) : (
                              <Play className="h-4 w-4 text-white" />
                            )}
                          </Button>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{track.title}</h4>
                          {track.album && (
                            <p className="text-white/60 text-sm">{track.album}</p>
                          )}
                          <p className="text-white/40 text-xs">{track.duration}</p>
                          <p className="text-purple-300 text-xs">{formatStreams(track.streams)} streams</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Upcoming Events</h3>
                  <Button asChild variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Link href="/artist/events">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-medium text-lg">{event.title}</h4>
                          <p className="text-white/60">{event.venue}, {event.city}</p>
                        </div>
                        <Badge className={cn(
                          "text-xs",
                          event.status === 'upcoming' && "bg-green-500/20 text-green-300 border-green-500/30",
                          event.status === 'sold_out' && "bg-red-500/20 text-red-300 border-red-500/30"
                        )}>
                          {event.status === 'upcoming' ? 'Upcoming' : 'Sold Out'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-white/70">
                          <Calendar className="h-4 w-4" />
                          <span>{formatSafeDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <Ticket className="h-4 w-4" />
                          <span>{event.sold_tickets}/{event.capacity} sold</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <DollarSign className="h-4 w-4" />
                          <span>{event.price_range}</span>
                        </div>
                      </div>
                      
                      {event.ticket_url && (
                        <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                            Get Tickets
                            <ArrowUpRight className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Merch Tab */}
            <TabsContent value="merch" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Merchandise</h3>
                  <Button asChild variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Link href="/artist/store">
                      View Store
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {merchItems.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <img 
                        src={item.image || "/placeholder-merch.jpg"} 
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="text-white font-medium">{item.name}</h4>
                        <p className="text-white/60 text-sm mb-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">${item.price}</span>
                          <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                            <ShoppingBag className="h-4 w-4 mr-2" />
                            Buy
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* EPK Tab */}
            <TabsContent value="epk" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Electronic Press Kit</h3>
                  <Button asChild variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Link href="/artist/epk">
                      View Full EPK
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-400" />
                        Bio & Press
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Artist Bio</h4>
                        <p className="text-white/70 text-sm">{profile.profile_data?.bio || "No bio available"}</p>
                      </div>
                      {profile.profile_data?.notable_performances && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Notable Performances</h4>
                          <p className="text-white/70 text-sm">{profile.profile_data.notable_performances}</p>
                        </div>
                      )}
                      {profile.profile_data?.awards && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Awards & Recognition</h4>
                          <p className="text-white/70 text-sm">{profile.profile_data.awards}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-400" />
                        Technical Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profile.profile_data?.equipment && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Equipment</h4>
                          <p className="text-white/70 text-sm">{profile.profile_data.equipment}</p>
                        </div>
                      )}
                      {profile.profile_data?.booking_rate && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Booking Rate</h4>
                          <p className="text-white/70 text-sm">{profile.profile_data.booking_rate}</p>
                        </div>
                      )}
                      {profile.profile_data?.availability && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Availability</h4>
                          <p className="text-white/70 text-sm">{profile.profile_data.availability}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="mt-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Connect & Follow</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {profile.profile_data?.instagram && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <a href={profile.profile_data.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                        <Instagram className="h-6 w-6 text-pink-400" />
                        <span className="text-white">Instagram</span>
                        <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
                      </a>
                    </motion.div>
                  )}
                  
                  {profile.profile_data?.twitter && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <a href={profile.profile_data.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                        <Twitter className="h-6 w-6 text-blue-400" />
                        <span className="text-white">Twitter</span>
                        <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
                      </a>
                    </motion.div>
                  )}
                  
                  {profile.profile_data?.youtube && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <a href={profile.profile_data.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                        <Youtube className="h-6 w-6 text-red-400" />
                        <span className="text-white">YouTube</span>
                        <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
                      </a>
                    </motion.div>
                  )}
                  
                  {profile.profile_data?.spotify && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <a href={profile.profile_data.spotify} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                        <Music className="h-6 w-6 text-green-400" />
                        <span className="text-white">Spotify</span>
                        <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
                      </a>
                    </motion.div>
                  )}
                  
                  {profile.profile_data?.website && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors"
                    >
                      <a href={profile.profile_data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                        <Globe className="h-6 w-6 text-purple-400" />
                        <span className="text-white">Website</span>
                        <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
                      </a>
                    </motion.div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
} 