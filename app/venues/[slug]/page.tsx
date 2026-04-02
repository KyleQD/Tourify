'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
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
  User
} from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueProfile {
  id: string
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function VenueProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [venue, setVenue] = useState<VenueProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.slug) {
      fetchVenueProfile(params.slug as string)
    }
  }, [params.slug])

  const fetchVenueProfile = async (slug: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/${slug}?track_view=true`)
      
      if (!response.ok) {
        throw new Error('Venue not found')
      }

      const data = await response.json()
      setVenue(data.venue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue')
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
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
      <div className="relative h-64 md:h-96 bg-gradient-to-r from-green-600 to-blue-600">
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
              <div className="flex items-center gap-4 mt-2">
                {venue.stats && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{venue.stats.average_rating}</span>
                    <span className="text-gray-300">({venue.stats.total_reviews} reviews)</span>
                  </div>
                )}
                <div className="flex gap-1">
                  {venue.venue_types.map((type) => (
                    <Badge key={type} variant="secondary" className="bg-green-600">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
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
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
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
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Venue Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderAmenities() || (
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
                <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book This Venue
                </Button>
                <Button variant="outline" className="w-full border-gray-600">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Venue
                </Button>
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
    </div>
  )
} 