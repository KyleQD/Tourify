"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2,
  Settings,
  Edit,
  Pin,
  Send,
  Loader2,
  ExternalLink,
  UserPlus,
  Star,
  ChevronDown,
  ChevronUp,
  Ticket,
  Music,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  Activity,
  Zap,
  Radio,
  Headphones,
  Plus,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  MessageSquare,
  Play,
  Square,
  DollarSign,
  User,
  MoreHorizontal,
  Trash2,
  BarChart
} from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface EventData {
  id: string
  title: string
  description?: string
  type: string
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
  status: string
  is_public: boolean
  poster_url?: string
  setlist?: string[]
  tags?: string[]
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    website?: string
  }
  user_id: string
  slug: string
  created_at: string
  updated_at: string
  creator?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface EventPost {
  id: string
  content: string
  type: 'text' | 'image' | 'video' | 'announcement'
  media_urls?: string[]
  is_announcement: boolean
  is_pinned: boolean
  visibility: 'public' | 'attendees' | 'organizers'
  likes_count: number
  comments_count: number
  created_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface AttendanceData {
  attending: number
  interested: number
  not_going: number
  user_status: 'attending' | 'interested' | 'not_going' | null
  attendees: any[]
  interested_users: any[]
}

interface EnhancedEventPageProps {
  eventId: string
  event?: EventData
  onEventUpdated?: (event: EventData) => void
}

export function EnhancedEventPage({ eventId, event: initialEvent, onEventUpdated }: EnhancedEventPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [event, setEvent] = useState<EventData | null>(initialEvent || null)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [posts, setPosts] = useState<EventPost[]>([])
  const [isLoading, setIsLoading] = useState(!initialEvent)
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false)
  const [isPostingUpdate, setIsPostingUpdate] = useState(false)
  const [showAttendeeList, setShowAttendeeList] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video'>('text')
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'attendees'>('public')
  const [canPost, setCanPost] = useState(false)
  const [isEventCreator, setIsEventCreator] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([])
  
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load event data
  useEffect(() => {
    if (eventId && !initialEvent) {
      loadEventData()
    }
  }, [eventId, initialEvent])

  // Set event creator status
  useEffect(() => {
    if (event && user) {
      setIsEventCreator(event.user_id === user.id)
      setCanPost(event.user_id === user.id || attendance?.user_status === 'attending')
    }
  }, [event, user, attendance])

  const loadEventData = async () => {
    try {
      setIsLoading(true)
      
      // Load event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError
      setEvent({
        ...eventData,
        title: eventData.name,
        type: eventData.event_type,
        venue_address: eventData.address,
        venue_city: eventData.city,
        venue_state: eventData.state,
        venue_country: eventData.country,
        user_id: eventData.artist_id
      })

      // Load attendance data
      await loadAttendanceData()

      // Load event posts
      await loadEventPosts()
      
    } catch (error) {
      console.error('Error loading event data:', error)
      toast.error('Failed to load event data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAttendanceData = async () => {
    if (!eventId) return

    try {
      const { data: attendanceData, error } = await supabase
        .from('event_attendance')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('event_id', eventId)
      .eq('event_table', 'events')

      if (error) throw error

      const attending = attendanceData?.filter(a => a.status === 'attending') || []
      const interested = attendanceData?.filter(a => a.status === 'interested') || []
      const notGoing = attendanceData?.filter(a => a.status === 'not_going') || []
      
      const userStatus = user ? attendanceData?.find(a => a.user_id === user.id)?.status || null : null

      setAttendance({
        attending: attending.length,
        interested: interested.length,
        not_going: notGoing.length,
        user_status: userStatus,
        attendees: attending,
        interested_users: interested
      })
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const loadEventPosts = async () => {
    if (!eventId) return

    try {
      const { data: postsData, error } = await supabase
        .from('event_posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('event_id', eventId)
      .eq('event_table', 'events')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(postsData || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const handleAttendanceUpdate = async (status: 'attending' | 'interested' | 'not_going') => {
    if (!user || !eventId) return

    try {
      setIsUpdatingAttendance(true)

      // Use API route to ensure RLS-safe server-side context and creator override
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update attendance')
      }

      await loadAttendanceData()
      toast.success(`You are now ${status} this event!`)
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('Failed to update attendance')
    } finally {
      setIsUpdatingAttendance(false)
    }
  }

  const handleCreatePost = async () => {
    if (!user || !eventId || !newPostContent.trim()) return

    try {
      setIsPostingUpdate(true)

      const { data: newPost, error } = await supabase
        .from('event_posts')
        .insert({
          event_id: eventId,
          event_table: 'events',
          user_id: user.id,
          content: newPostContent,
          type: newPostType,
          media_urls: newMediaUrls.length > 0 ? newMediaUrls : null,
          visibility: newPostVisibility,
          is_announcement: isEventCreator,
          is_pinned: false,
          likes_count: 0,
          comments_count: 0
        })
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .single()

      if (error) throw error

      setPosts(prev => [newPost, ...prev])
      setNewPostContent('')
      setNewMediaUrls([])
      toast.success('Post created successfully!')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    } finally {
      setIsPostingUpdate(false)
    }
  }

  const handleMediaUpload = async (files: FileList) => {
    if (!user) return

    try {
      setUploadingMedia(true)
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `event-media/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('event-media')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      setNewMediaUrls(prev => [...prev, ...uploadedUrls])
      toast.success('Media uploaded successfully!')
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Failed to upload media')
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleShare = async (platform: string) => {
    if (!event) return

    const url = `${window.location.origin}/events/${event.slug}`
    const text = `Check out ${event.title} on ${formatSafeDate(event.event_date)}!`

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
        break
      case 'copy':
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
        break
    }
    setShowShareMenu(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      {/* Hero Section - Profile Style */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-80 md:h-96 overflow-hidden">
          {event.poster_url ? (
            <Image
              src={event.poster_url}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-blue-900/50" />
          )}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Event Avatar */}
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl border-4 border-white/20">
                  <Music className="h-12 w-12 md:h-16 md:w-16 text-white" />
                </div>
                {event.is_public && (
                  <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {event.type}
                  </Badge>
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    {event.status.replace('_', ' ')}
                  </Badge>
                  {event.is_public ? (
                    <Badge variant="outline" className="border-green-500/50 text-green-400">
                      <Eye className="h-3 w-3 mr-1" />
                      Public Event
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Private Event
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  {event.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-lg text-white/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  {event.start_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      {event.start_time}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-400" />
                    {event.venue_name}
                    {event.venue_city && `, ${event.venue_city}`}
                    {event.venue_state && `, ${event.venue_state}`}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <span className="text-white/80">{attendance?.attending || 0} attending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="text-white/80">{attendance?.interested || 0} interested</span>
                  </div>
                  {event.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-white/80">{event.capacity} capacity</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {user && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAttendanceUpdate('attending')}
                      disabled={isUpdatingAttendance || attendance?.user_status === 'attending'}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      {attendance?.user_status === 'attending' ? 'Attending' : 'Attend'}
                    </Button>
                    <Button
                      onClick={() => handleAttendanceUpdate('interested')}
                      disabled={isUpdatingAttendance || attendance?.user_status === 'interested'}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      size="sm"
                    >
                      {attendance?.user_status === 'interested' ? 'Interested' : 'Interested'}
                    </Button>
                  </div>
                )}
                {event.ticket_url && (
                  <Button asChild className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                      <Ticket className="h-4 w-4 mr-2" />
                      Get Tickets
                    </a>
                  </Button>
                )}
                <Button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Profile Style */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-xl">
              <MessageCircle className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-300 rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-300 rounded-xl">
              <Settings className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-pink-600/20 data-[state=active]:text-pink-300 rounded-xl">
              <ImageIcon className="h-4 w-4 mr-2" />
              Media
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Profile Style */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* About Section */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      About This Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {event.description && (
                      <div>
                        <p className="text-lg leading-relaxed text-white/90">{event.description}</p>
                      </div>
                    )}
                    
                    {event.setlist && event.setlist.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                          <Music className="h-5 w-5 text-purple-400" />
                          Setlist
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {event.setlist.map((song, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                              <span className="text-sm font-mono text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                                {index + 1}
                              </span>
                              <span className="text-white/90">{song}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.tags && event.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-white">Event Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-500/20 border-purple-500/30 text-purple-300">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event Timeline */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      Event Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {event.doors_open && (
                        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-white">Doors Open</p>
                            <p className="text-sm text-white/60">{event.doors_open}</p>
                          </div>
                        </div>
                      )}
                      {event.start_time && (
                        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-white">Show Starts</p>
                            <p className="text-sm text-white/60">{event.start_time}</p>
                          </div>
                        </div>
                      )}
                      {event.end_time && (
                        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-white">Show Ends</p>
                            <p className="text-sm text-white/60">{event.end_time}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Attendance Stats */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-400" />
                      Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <div className="text-2xl font-bold text-green-400">{attendance?.attending || 0}</div>
                        <div className="text-sm text-white/60">Attending</div>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <div className="text-2xl font-bold text-blue-400">{attendance?.interested || 0}</div>
                        <div className="text-sm text-white/60">Interested</div>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="text-2xl font-bold text-red-400">{attendance?.not_going || 0}</div>
                        <div className="text-sm text-white/60">Not Going</div>
                      </div>
                    </div>

                    {user && (
                      <div className="space-y-3">
                        <Button
                          onClick={() => handleAttendanceUpdate('attending')}
                          disabled={isUpdatingAttendance || attendance?.user_status === 'attending'}
                          className="w-full bg-green-600 hover:bg-green-700"
                          variant={attendance?.user_status === 'attending' ? 'secondary' : 'default'}
                        >
                          {attendance?.user_status === 'attending' ? '✓ Attending' : 'Attend Event'}
                        </Button>
                        <Button
                          onClick={() => handleAttendanceUpdate('interested')}
                          disabled={isUpdatingAttendance || attendance?.user_status === 'interested'}
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          {attendance?.user_status === 'interested' ? '✓ Interested' : 'Interested'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event Stats */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart className="h-5 w-5 text-purple-400" />
                      Event Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.capacity && (
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="text-white/80">Capacity</span>
                        <span className="font-semibold text-white">{event.capacity.toLocaleString()}</span>
                      </div>
                    )}
                    {(event.ticket_price_min || event.ticket_price_max) && (
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="text-white/80">Ticket Price</span>
                        <span className="font-semibold text-white">
                          ${event.ticket_price_min}
                          {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min && 
                            ` - $${event.ticket_price_max}`
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <span className="text-white/80">Event Type</span>
                      <Badge variant="outline" className="bg-purple-500/20 border-purple-500/30 text-purple-300">
                        {event.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <span className="text-white/80">Status</span>
                      <Badge variant="outline" className="bg-green-500/20 border-green-500/30 text-green-300">
                        {event.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.ticket_url && (
                      <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                          <Ticket className="h-4 w-4 mr-2" />
                          Get Tickets
                        </a>
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Event
                    </Button>
                    {isEventCreator && (
                      <Button variant="outline" className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Posts Tab - Enhanced */}
          <TabsContent value="posts" className="space-y-6">
            {/* Create Post */}
            {canPost && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    Create Post
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-purple-500/20 text-purple-300">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-3">
                        <Button
                          variant={newPostType === 'text' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewPostType('text')}
                          className={newPostType === 'text' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/20 text-white hover:bg-white/10'}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Text
                        </Button>
                        <Button
                          variant={newPostType === 'image' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewPostType('image')}
                          className={newPostType === 'image' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/20 text-white hover:bg-white/10'}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Image
                        </Button>
                        <Button
                          variant={newPostType === 'video' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewPostType('video')}
                          className={newPostType === 'video' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/20 text-white hover:bg-white/10'}
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Video
                        </Button>
                      </div>

                      <Textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share something about this event..."
                        rows={3}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400"
                      />

                      {newMediaUrls.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {newMediaUrls.map((url, index) => (
                            <div key={index} className="relative w-20 h-20">
                              <Image
                                src={url}
                                alt="Media"
                                fill
                                className="object-cover rounded-lg"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600"
                                onClick={() => setNewMediaUrls(prev => prev.filter((_, i) => i !== index))}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingMedia}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            {uploadingMedia ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Add Media
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                            className="hidden"
                          />
                          <Select
                            value={newPostVisibility}
                            onValueChange={(value: 'public' | 'attendees') => setNewPostVisibility(value)}
                          >
                            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/20">
                              <SelectItem value="public" className="text-white hover:bg-white/10">Public</SelectItem>
                              <SelectItem value="attendees" className="text-white hover:bg-white/10">Attendees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleCreatePost}
                          disabled={!newPostContent.trim() || isPostingUpdate}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isPostingUpdate ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={post.user.avatar_url} />
                          <AvatarFallback className="bg-purple-500/20 text-purple-300">
                            {post.user.full_name?.charAt(0) || post.user.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-semibold text-white">{post.user.full_name}</span>
                            {post.user.is_verified && (
                              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">✓</Badge>
                            )}
                            <span className="text-sm text-white/60">
                              {format(new Date(post.created_at), 'MMM d, h:mm a')}
                            </span>
                            {post.is_announcement && (
                              <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-300">Announcement</Badge>
                            )}
                            {post.is_pinned && (
                              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <p className="mb-4 text-white/90 leading-relaxed">{post.content}</p>
                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="flex gap-2 mb-4">
                              {post.media_urls.map((url, index) => (
                                <div key={index} className="relative w-32 h-32">
                                  <Image
                                    src={url}
                                    alt="Post media"
                                    fill
                                    className="object-cover rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-6 text-sm">
                            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                              <Heart className="h-4 w-4" />
                              <span>{post.likes_count}</span>
                            </button>
                            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments_count}</span>
                            </button>
                            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                              <Share2 className="h-4 w-4" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <CardContent className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Posts Yet</h3>
                    <p className="text-white/60">
                      {canPost 
                        ? "Be the first to share something about this event!" 
                        : "Posts from event attendees will appear here."
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab - Enhanced */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Attendance Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{attendance?.attending || 0}</h3>
                  <p className="text-green-400 font-medium">Attending</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Eye className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{attendance?.interested || 0}</h3>
                  <p className="text-blue-400 font-medium">Interested</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{attendance?.not_going || 0}</h3>
                  <p className="text-red-400 font-medium">Not Going</p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Attending ({attendance?.attending || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance?.attendees && attendance.attendees.length > 0 ? (
                    <div className="space-y-3">
                      {attendance.attendees.slice(0, 20).map((attendee) => (
                        <div key={attendee.user_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={attendee.user?.avatar_url} />
                            <AvatarFallback className="bg-green-500/20 text-green-300">
                              {attendee.user?.full_name?.charAt(0) || attendee.user?.username?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {attendee.user?.full_name}
                              {attendee.user?.is_verified && (
                                <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                              )}
                            </div>
                            <div className="text-sm text-white/60">@{attendee.user?.username}</div>
                          </div>
                          <Badge variant="outline" className="border-green-500/30 text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Going
                          </Badge>
                        </div>
                      ))}
                      {attendance.attendees.length > 20 && (
                        <div className="text-center py-3">
                          <p className="text-white/60 text-sm">
                            +{attendance.attendees.length - 20} more attending
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/60">No one has confirmed attendance yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-400" />
                    Interested ({attendance?.interested || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance?.interested_users && attendance.interested_users.length > 0 ? (
                    <div className="space-y-3">
                      {attendance.interested_users.slice(0, 20).map((user) => (
                        <div key={user.user_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.user?.avatar_url} />
                            <AvatarFallback className="bg-blue-500/20 text-blue-300">
                              {user.user?.full_name?.charAt(0) || user.user?.username?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {user.user?.full_name}
                              {user.user?.is_verified && (
                                <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                              )}
                            </div>
                            <div className="text-sm text-white/60">@{user.user?.username}</div>
                          </div>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                            <Eye className="h-3 w-3 mr-1" />
                            Interested
                          </Badge>
                        </div>
                      ))}
                      {attendance.interested_users.length > 20 && (
                        <div className="text-center py-3">
                          <p className="text-white/60 text-sm">
                            +{attendance.interested_users.length - 20} more interested
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/60">No one has shown interest yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab - Enhanced */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        Date & Time
                      </h4>
                      <div className="space-y-2 text-white/80">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span>{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        {event.doors_open && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-400" />
                            <span>Doors: {event.doors_open}</span>
                          </div>
                        )}
                        {event.start_time && (
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-purple-400" />
                            <span>Start: {event.start_time}</span>
                          </div>
                        )}
                        {event.end_time && (
                          <div className="flex items-center gap-2">
                            <Square className="h-4 w-4 text-red-400" />
                            <span>End: {event.end_time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-400" />
                        Venue Information
                      </h4>
                      <div className="space-y-2 text-white/80">
                        <div className="font-medium text-white">{event.venue_name}</div>
                        {event.venue_address && <div>{event.venue_address}</div>}
                        <div>{event.venue_city}, {event.venue_state}</div>
                        {event.venue_country && <div>{event.venue_country}</div>}
                      </div>
                    </div>

                    {event.capacity && (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-400" />
                          Capacity
                        </h4>
                        <div className="text-white/80">{event.capacity.toLocaleString()} people</div>
                      </div>
                    )}

                    {(event.ticket_price_min || event.ticket_price_max) && (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-yellow-400" />
                          Ticket Prices
                        </h4>
                        <div className="text-white/80">
                          {event.ticket_price_min && event.ticket_price_max ? (
                            `$${event.ticket_price_min} - $${event.ticket_price_max}`
                          ) : (
                            `$${event.ticket_price_min || event.ticket_price_max}`
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-purple-400" />
                    Links & Social
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {event.ticket_url && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-green-400" />
                        Tickets
                      </h4>
                      <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Get Tickets
                        </a>
                      </Button>
                    </div>
                  )}

                  {event.social_links && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-blue-400" />
                        Social Media
                      </h4>
                      <div className="space-y-3">
                        {event.social_links.facebook && (
                          <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                            <a href={event.social_links.facebook} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Facebook
                            </a>
                          </Button>
                        )}
                        {event.social_links.twitter && (
                          <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                            <a href={event.social_links.twitter} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Twitter
                            </a>
                          </Button>
                        )}
                        {event.social_links.instagram && (
                          <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                            <a href={event.social_links.instagram} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Instagram
                            </a>
                          </Button>
                        )}
                        {event.social_links.website && (
                          <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                            <a href={event.social_links.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Creator Info */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400" />
                      Event Creator
                    </h4>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={event.creator?.avatar_url} />
                        <AvatarFallback className="bg-purple-500/20 text-purple-300">
                          {event.creator?.full_name?.charAt(0) || event.creator?.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-white">
                          {event.creator?.full_name}
                          {event.creator?.is_verified && (
                            <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                          )}
                        </div>
                        <div className="text-sm text-white/60">@{event.creator?.username}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-pink-400" />
                  Event Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                {event.poster_url ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4 text-white">Event Poster</h4>
                      <div className="relative w-full max-w-md mx-auto">
                        <Image
                          src={event.poster_url}
                          alt={`${event.title} poster`}
                          width={400}
                          height={600}
                          className="rounded-2xl shadow-2xl"
                        />
                      </div>
                    </div>
                    
                    {/* Future: Add more media sections */}
                    <div className="text-center py-8">
                      <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">More media content coming soon!</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Media Available</h3>
                    <p className="text-white/60">Event poster and media will appear here when available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              ref={shareMenuRef}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Share Event</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => handleShare('twitter')}
                  variant="outline"
                  className="w-full"
                >
                  Share on Twitter
                </Button>
                <Button
                  onClick={() => handleShare('facebook')}
                  variant="outline"
                  className="w-full"
                >
                  Share on Facebook
                </Button>
                <Button
                  onClick={() => handleShare('copy')}
                  variant="outline"
                  className="w-full"
                >
                  Copy Link
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
