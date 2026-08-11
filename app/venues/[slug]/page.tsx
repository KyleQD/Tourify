'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Video,
  Youtube,
  Linkedin,
  Users,
  Clock,
  Star,
  Calendar,
  Music,
  Wifi,
  Car,
  Accessibility,
  Shield,
  Coffee,
  Utensils,
  Mic,
  Lightbulb,
  Volume2,
  Camera,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  X,
  ArrowLeft,
  Building2,
  User,
  BookOpen,
  Ticket,
  Newspaper,
  Download,
  Ruler,
} from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { ProfilePosts } from "@/components/profile/profile-posts"
import { MessageModal } from "@/components/messaging/message-modal"
import { AmenitiesGrid } from "@/components/venue-kit/amenities-section"

interface VenueProfile {
  id: string
  user_id?: string | null
  venue_name: string
  tagline?: string
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  neighborhood?: string
  capacity_standing?: number
  capacity_seated?: number
  capacity_total?: number
  venue_types: string[]
  amenities?: string[]
  age_restrictions?: string
  operating_hours?: Record<string, any>
  contact_info?: Record<string, any>
  social_links?: Record<string, any>
  settings?: Record<string, any>
  avatar_url?: string
  cover_image_url?: string
  meta_description?: string
  keywords?: string[]
  is_public: boolean
  profile_completion: number
  // New VK columns
  stage_dimensions?: string
  sound_system?: string
  lighting_rig?: string
  loading_dock?: boolean
  green_rooms?: number
  parking_spots?: number
  curfew?: string
  tech_rider_url?: string
  stage_plot_url?: string
  created_at: string
  updated_at: string
  stats?: {
    average_rating: number
    total_reviews: number
    monthly_views: number
    upcoming_events: number
  }
  recent_events?: any[]
  reviews?: any[]
  user_profile?: {
    username: string
    full_name: string
    avatar_url?: string
  }
  url_slug?: string
  capacity?: number
}

export default function VenueProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [venue, setVenue] = useState<VenueProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMessageOpen, setIsMessageOpen] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [galleryDocs, setGalleryDocs] = useState<any[]>([])
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [vkSlug, setVkSlug] = useState<string | null>(null)
  const [vkPress, setVkPress] = useState<any[]>([])
  const [stickyVisible, setStickyVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  // Sticky bar: appears after scrolling past hero
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading])

  useEffect(() => {
    if (params.slug) {
      fetchVenueProfile(params.slug as string)
    }
  }, [params.slug])

  const fetchVenueProfile = async (slug: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/${slug}?track_view=true`)
      if (!response.ok) throw new Error('Venue not found')
      const data = await response.json()
      const loadedVenue = data.venue
      setVenue(loadedVenue)

      // Fetch reviews
      if (loadedVenue?.id) {
        try {
          const rRes = await fetch(`/api/venues/${loadedVenue.id}/reviews`)
          if (rRes.ok) {
            const { data: rData } = await rRes.json()
            setReviews(rData || [])
          }
        } catch { /* non-fatal */ }

        // Fetch public image documents for gallery
        try {
          const dRes = await fetch(`/api/venue/documents?venue_id=${encodeURIComponent(loadedVenue.id)}&public_only=true`)
          if (dRes.ok) {
            const { data: dData } = await dRes.json()
            const images = (dData || []).filter((d: any) =>
              d.is_public && d.file_url && (
                d.mime_type?.startsWith('image/') ||
                /\.(jpg|jpeg|png|gif|webp)$/i.test(d.file_url || '')
              )
            )
            setGalleryDocs(images)
          }
        } catch { /* non-fatal */ }

        // Fetch public Venue Kit settings (for Kit banner + press)
        try {
          const vkRes = await fetch(`/api/venues/${loadedVenue.id}/venue-kit`)
          if (vkRes.ok) {
            const vkData = await vkRes.json()
            if (vkData.vk_slug) setVkSlug(vkData.vk_slug)
            if (Array.isArray(vkData.press)) setVkPress(vkData.press)
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!venue?.id || !reviewForm.comment.trim()) return
    setIsSubmittingReview(true)
    try {
      const res = await fetch(`/api/venues/${venue.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewForm.rating,
          title: reviewForm.title || null,
          comment: reviewForm.comment,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit review')
      const { data: newReview } = await res.json()
      setReviews(prev => [newReview, ...prev])
      setReviewForm({ rating: 5, title: '', comment: '' })
      toast({ title: 'Review submitted', description: 'Thank you for your feedback!' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not submit review', variant: 'destructive' })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleShare = async () => {
    if (!venue) return

    const shareData = {
      title: venue.venue_name,
      text: venue.tagline || venue.description || `Check out ${venue.venue_name}`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied!",
          description: "Venue profile link copied to clipboard",
        })
      }
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  const renderAmenities = () => {
    if (!venue?.settings?.amenities) return null

    const amenityIcons: Record<string, any> = {
      sound_system: Volume2,
      lighting_system: Lightbulb,
      stage: Music,
      wifi: Wifi,
      parking: Car,
      accessible: Accessibility,
      security: Shield,
      bar_service: Coffee,
      food_service: Utensils,
      recording_capabilities: Mic,
      photography_services: Camera,
    }

    const amenities = Object.entries(venue.settings.amenities)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => {
        const Icon = amenityIcons[key] || CheckCircle
        return (
          <div key={key} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
            <Icon className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-300 capitalize">
              {key.replace(/_/g, ' ')}
            </span>
          </div>
        )
      })

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {amenities}
      </div>
    )
  }

  const renderOperatingHours = () => {
    if (!venue?.operating_hours) return null

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    return (
      <div className="space-y-2">
        {days.map((day) => {
          const hours = venue.operating_hours![day]
          if (!hours) return null
          
          return (
            <div key={day} className="flex justify-between items-center p-2 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-300 capitalize">{day}</span>
              <span className="text-sm text-white">
                {hours.open} - {hours.close}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderRecentEvents = () => {
    if (!venue?.recent_events || venue.recent_events.length === 0) {
      return (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No upcoming events scheduled</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {venue.recent_events.map((event) => (
          <Card key={event.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{event.title}</h4>
                  <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatSafeDate(event.event_date)}</span>
                    </div>
                    {event.ticket_price && (
                      <div className="flex items-center gap-1">
                        <span>${event.ticket_price}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                  View Event
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading venue profile...</p>
        </div>
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
            <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Venue Not Found</h2>
            <p className="text-red-300">{error || 'We could not find this venue.'}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => router.back()} 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => router.push('/venues')} 
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Discover Venues
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const capacityLabel = (() => {
    const total = venue.capacity_total ?? venue.capacity
    if (!total) return null
    return `${total.toLocaleString()} cap`
  })()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sticky Action Bar */}
      {stickyVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-b border-white/10 bg-gray-900/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={venue.avatar_url} alt={venue.venue_name} />
              <AvatarFallback className="bg-green-600 text-xs">{venue.venue_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-semibold">{venue.venue_name}</span>
            {venue.stats && (
              <div className="hidden items-center gap-1 text-xs text-yellow-400 sm:flex">
                <Star className="h-3 w-3 fill-current" />
                {venue.stats.average_rating}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {vkSlug && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-xs"
                onClick={() => router.push(`/vk/${vkSlug}`)}
              >
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Venue Kit
              </Button>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 text-xs hover:bg-emerald-500"
              onClick={() => router.push(`/venues/${venue.url_slug || params.slug}/booking-request`)}
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Book
            </Button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-40">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="bg-black/20 backdrop-blur-sm border-white/20 text-white hover:bg-black/40"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Cover Image */}
      <div ref={heroRef} className="relative h-64 md:h-96 bg-gradient-to-r from-green-600 to-blue-600">
        {venue.cover_image_url && (
          <img
            src={venue.cover_image_url}
            alt={venue.venue_name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-white">
              <AvatarImage src={venue.avatar_url} alt={venue.venue_name} />
              <AvatarFallback className="bg-green-600 text-white text-2xl">
                {venue.venue_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{venue.venue_name}</h1>
              {venue.tagline && (
                <p className="text-lg text-gray-200 mt-1">{venue.tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {venue.stats && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{venue.stats.average_rating}</span>
                    <span className="text-gray-300">({venue.stats.total_reviews} reviews)</span>
                  </div>
                )}
                {capacityLabel && (
                  <Badge className="bg-black/40 border border-white/20 text-white text-xs">
                    <Users className="mr-1 h-3 w-3" />
                    {capacityLabel}
                  </Badge>
                )}
                <div className="flex gap-1 flex-wrap">
                  {venue.venue_types.map((type) => (
                    <Badge key={type} variant="secondary" className="bg-green-600">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                size="sm"
                onClick={() => router.push(`/venues/${venue.url_slug || params.slug}/booking-request`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book This Venue
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="bg-black/20 backdrop-blur-sm border-white/20 text-white hover:bg-black/40"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-gray-800 p-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews
                  {reviews.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-300">
                      {reviews.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      About {venue.venue_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">
                      {venue.description || 'No description available.'}
                    </p>
                    
                    {venue.capacity && (
                      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-green-400" />
                          <span className="font-semibold">Capacity</span>
                        </div>
                        <p className="text-gray-300">{venue.capacity.toLocaleString()} people</p>
                      </div>
                    )}

                    {venue.address && (
                      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-green-400" />
                          <span className="font-semibold">Location</span>
                        </div>
                        <p className="text-gray-300">
                          {venue.address}
                          {venue.city && venue.state && (
                            <span>, {venue.city}, {venue.state}</span>
                          )}
                          {venue.country && <span>, {venue.country}</span>}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats */}
                {venue.stats && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Venue Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {venue.stats.average_rating}
                          </div>
                          <div className="text-sm text-gray-400">Average Rating</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {venue.stats.total_reviews}
                          </div>
                          <div className="text-sm text-gray-400">Reviews</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {venue.stats.monthly_views}
                          </div>
                          <div className="text-sm text-gray-400">Monthly Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-400">
                            {venue.stats.upcoming_events}
                          </div>
                          <div className="text-sm text-gray-400">Upcoming Events</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderRecentEvents()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="amenities" className="space-y-6">
                {/* Technical Specs */}
                {(venue.stage_dimensions || venue.sound_system || venue.lighting_rig || (venue.capacity_total ?? 0) > 0) && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-green-400" />
                        Technical Specs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(venue.capacity_total ?? venue.capacity) ? (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Capacity</p>
                            <p className="mt-1 font-semibold text-white">
                              {(venue.capacity_total ?? venue.capacity)?.toLocaleString()}
                              {venue.capacity_standing ? ` (${venue.capacity_standing.toLocaleString()} standing)` : ''}
                              {venue.capacity_seated ? ` / ${venue.capacity_seated.toLocaleString()} seated` : ''}
                            </p>
                          </div>
                        ) : null}
                        {venue.stage_dimensions && (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Stage</p>
                            <p className="mt-1 font-semibold text-white">{venue.stage_dimensions}</p>
                          </div>
                        )}
                        {venue.sound_system && (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Sound System</p>
                            <p className="mt-1 font-semibold text-white">{venue.sound_system}</p>
                          </div>
                        )}
                        {venue.lighting_rig && (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Lighting</p>
                            <p className="mt-1 font-semibold text-white">{venue.lighting_rig}</p>
                          </div>
                        )}
                        {venue.curfew && (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Curfew</p>
                            <p className="mt-1 font-semibold text-white">{venue.curfew}</p>
                          </div>
                        )}
                        {venue.age_restrictions && (
                          <div className="rounded-lg bg-gray-700 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Age Policy</p>
                            <p className="mt-1 font-semibold text-white">{venue.age_restrictions}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Venue Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Use new amenities grid from VK data if available, else fall back to legacy */}
                    {(venue.amenities && venue.amenities.length > 0) ? (
                      <AmenitiesGrid amenities={venue.amenities} />
                    ) : renderAmenities() || (
                      <p className="text-gray-400">No amenities information available.</p>
                    )}
                  </CardContent>
                </Card>

                {venue.operating_hours && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Operating Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderOperatingHours()}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── REVIEWS ───────────────────────────────────────── */}
              <TabsContent value="reviews" className="space-y-6">
                {/* Aggregate */}
                {reviews.length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-yellow-400">
                            {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                          </p>
                          <div className="flex justify-center gap-0.5 mt-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`h-4 w-4 ${i <= Math.round(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                            ))}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          {[5,4,3,2,1].map(star => {
                            const count = reviews.filter(r => r.rating === star).length
                            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                            return (
                              <div key={star} className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-3">{star}</span>
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                                  <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-4 text-right">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Individual reviews */}
                {reviews.map((review: any) => (
                  <Card key={review.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                            ))}
                          </div>
                          {review.title && <p className="font-medium text-white mt-1">{review.title}</p>}
                        </div>
                        <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      {review.comment && <p className="text-sm text-gray-300">{review.comment}</p>}
                      {review.response_from_venue && (
                        <div className="mt-3 rounded-md bg-gray-700 p-3">
                          <p className="text-xs font-medium text-green-400 mb-1">Response from venue</p>
                          <p className="text-sm text-gray-300">{review.response_from_venue}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Write a review form */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      Leave a Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Rating</p>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewForm(f => ({ ...f, rating: i }))}
                            className="focus:outline-none"
                          >
                            <Star className={`h-6 w-6 transition-colors ${i <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Title (optional)</p>
                      <input
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="Summarise your experience"
                        value={reviewForm.title}
                        onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Review <span className="text-red-400">*</span></p>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="Tell others about your experience with this venue…"
                        value={reviewForm.comment}
                        onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500"
                      disabled={!reviewForm.comment.trim() || isSubmittingReview}
                      onClick={handleSubmitReview}
                    >
                      {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── GALLERY ───────────────────────────────────────── */}
              <TabsContent value="gallery" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Photo Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {venue?.cover_image_url || galleryDocs.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {venue?.cover_image_url && (
                          <div className="relative col-span-2 md:col-span-3 aspect-video rounded-lg overflow-hidden">
                            <img
                              src={venue.cover_image_url}
                              alt={`${venue.venue_name} cover`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {galleryDocs.map((doc: any) => (
                          <div key={doc.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-700">
                            <img
                              src={doc.file_url}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm py-8 text-center">No photos available for this venue yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="posts" className="space-y-6">
                <ProfilePosts
                  profileId={venue.id}
                  ownerUserId={venue.user_id || undefined}
                  profileUsername={venue.url_slug || venue.venue_name}
                  compact={false}
                />
              </TabsContent>

              <TabsContent value="contact" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {venue.contact_info?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">{venue.contact_info.phone}</span>
                      </div>
                    )}
                    
                    {venue.contact_info?.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">{venue.contact_info.email}</span>
                      </div>
                    )}

                    {venue.social_links?.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-green-400" />
                        <a 
                          href={venue.social_links.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {venue.social_links.website}
                        </a>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      {venue.social_links?.instagram && (
                        <Button variant="outline" size="sm" className="border-gray-600">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </Button>
                      )}
                      {venue.social_links?.facebook && (
                        <Button variant="outline" size="sm" className="border-gray-600">
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </Button>
                      )}
                      {venue.social_links?.twitter && (
                        <Button variant="outline" size="sm" className="border-gray-600">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => router.push(`/venues/${venue.url_slug || params.slug}/booking-request`)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book This Venue
                </Button>

                {/* Venue Kit CTA */}
                {vkSlug && (
                  <Button
                    variant="outline"
                    className="w-full border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
                    onClick={() => router.push(`/vk/${vkSlug}`)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Venue Kit
                  </Button>
                )}
                {venue.user_id ? (
                  <Button
                    variant="outline"
                    className="w-full border-gray-600"
                    onClick={() => setIsMessageOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Venue
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-gray-600"
                    onClick={() => {
                      const email = venue.contact_info?.booking_email || venue.contact_info?.email
                      if (email) window.location.href = `mailto:${email}?subject=Venue inquiry: ${venue.venue_name}`
                    }}
                    disabled={!venue.contact_info?.booking_email && !venue.contact_info?.email}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Venue
                  </Button>
                )}
                <Button variant="outline" className="w-full border-gray-600">
                  <Heart className="h-4 w-4 mr-2" />
                  Save to Favorites
                </Button>
              </CardContent>
            </Card>

            {/* Venue Owner Info */}
            {venue.user_profile && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Venue Owner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={venue.user_profile.avatar_url} />
                      <AvatarFallback className="bg-green-600">
                        {venue.user_profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{venue.user_profile.full_name}</p>
                      <p className="text-sm text-gray-400">@{venue.user_profile.username}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {venue.user_id ? (
        <MessageModal
          isOpen={isMessageOpen}
          onClose={() => setIsMessageOpen(false)}
          recipient={{
            id: venue.user_id,
            username: venue.user_profile?.username || venue.url_slug || venue.venue_name,
            full_name: venue.venue_name,
            avatar_url: venue.avatar_url || venue.user_profile?.avatar_url,
          }}
          recipientAccount={{
            profileId: venue.id,
            accountType: 'venue',
          }}
        />
      ) : null}
    </div>
  )
}
