"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  Mail,
  Phone,
  Globe,
  Star,
  Wifi,
  Car,
  Accessibility,
  Music,
  Coffee,
  Mic,
  Camera,
  Volume2,
  Lightbulb,
  Shield,
  CreditCard,
  Clock,
  CheckCircle,
  ExternalLink,
  Share2,
  BookOpen,
  ImageIcon,
  Play,
  Heart,
  MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfilePosts } from "./profile-posts"

interface VenueProfileProps {
  profile: {
    id: string
    username: string
    account_type: 'venue'
    profile_data: {
      venue_name: string
      name: string
      capacity: number
      venue_types: string[]
      description?: string
      address?: string
      city?: string
      state?: string
      country?: string
      postal_code?: string
    }
    avatar_url?: string
    cover_image?: string
    verified: boolean
    location?: string
    stats: {
      followers: number
      events?: number
      artists_hosted?: number
      monthly_bookings?: number
    }
    social_links?: {
      website?: string
      instagram?: string
      facebook?: string
      twitter?: string
    }
    contact_info?: {
      phone?: string
      email?: string
      booking_email?: string
      manager_name?: string
    }
  }
  isOwnProfile?: boolean
  onFollow?: () => void
  onMessage?: () => void
  portfolio?: Array<{ id: string; type?: string; media?: any[]; title?: string; description?: string }>
}

interface VenueSpecs {
  capacity: number
  stage_size?: string
  sound_system?: string
  lighting?: string
  green_room: boolean
  loading_dock: boolean
  parking_spots?: number
  alcohol_license: boolean
  food_service: boolean
  curfew?: string
  age_restrictions?: string
}

interface Amenity {
  id: string
  name: string
  icon: any
  available: boolean
  description?: string
}

interface VenueEvent {
  id: string
  name: string
  date: string
  artist: string
  status: 'upcoming' | 'past' | 'cancelled'
  attendance?: number
  genre?: string
  image?: string
  ticket_url?: string
}

export function VenueProfileEnhanced({ profile, isOwnProfile = false, onFollow, onMessage, portfolio }: VenueProfileProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [venueSpecs, setVenueSpecs] = useState<VenueSpecs | null>(null)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [events, setEvents] = useState<VenueEvent[]>([])
  const [gallery, setGallery] = useState<string[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVenueData()
  }, [profile.id])

  const fetchVenueData = async () => {
    try {
      setLoading(true)
      
      // Prefer provided portfolio items for gallery
      if (portfolio && portfolio.length > 0) {
        const images: string[] = []
        portfolio.forEach(it => {
          if (!Array.isArray(it.media)) return
          it.media.forEach((m: any) => { if (m?.kind === 'image' && m.url) images.push(m.url) })
        })
        if (images.length > 0) setGallery(images.slice(0, 12))
      }
      
      // Fallback mock venue specs/amenities/events if none provided elsewhere
      // TODO: Replace with real API calls
      // Mock venue specifications
      const mockSpecs: VenueSpecs = {
        capacity: profile.profile_data.capacity || 500,
        stage_size: "24' x 16' x 4' height",
        sound_system: "Meyer Sound with 32-channel Midas console",
        lighting: "Full DMX system with moving heads and LED pars",
        green_room: true,
        loading_dock: true,
        parking_spots: 25,
        alcohol_license: true,
        food_service: true,
        curfew: "2:00 AM",
        age_restrictions: "21+"
      }
      
      // Mock amenities
      const mockAmenities: Amenity[] = [
        { id: "1", name: "Wi-Fi", icon: Wifi, available: true, description: "High-speed internet throughout venue" },
        { id: "2", name: "Parking", icon: Car, available: true, description: "25 on-site spots + street parking" },
        { id: "3", name: "ADA Accessible", icon: Accessibility, available: true, description: "Wheelchair ramp and accessible restrooms" },
        { id: "4", name: "Green Room", icon: Coffee, available: true, description: "Private space for performers" },
        { id: "5", name: "Professional Sound", icon: Volume2, available: true, description: "Meyer Sound system" },
        { id: "6", name: "Stage Lighting", icon: Lightbulb, available: true, description: "Full DMX lighting rig" },
        { id: "7", name: "Security", icon: Shield, available: true, description: "Professional security team" },
        { id: "8", name: "Box Office", icon: CreditCard, available: true, description: "On-site ticket sales" }
      ]
      
      // Mock recent/upcoming events
      const mockEvents: VenueEvent[] = [
        {
          id: "1",
          name: "Electric Nights",
          date: "2024-03-15",
          artist: "The Resonants",
          status: "upcoming",
          attendance: 450,
          genre: "Electronic",
          image: "/event-placeholder.jpg",
          ticket_url: "https://tickets.example.com"
        },
        {
          id: "2",
          name: "Jazz & Soul Evening",
          date: "2024-03-08",
          artist: "Midnight Echo",
          status: "past",
          attendance: 380,
          genre: "Jazz",
          image: "/event-placeholder.jpg"
        },
        {
          id: "3",
          name: "Rock Revival",
          date: "2024-02-28",
          artist: "Digital Pulse",
          status: "past",
          attendance: 500,
          genre: "Rock",
          image: "/event-placeholder.jpg"
        }
      ]
      
      // Mock gallery images
      const mockGallery = [
        "/venue-1.jpg",
        "/venue-2.jpg", 
        "/venue-3.jpg",
        "/venue-4.jpg",
        "/venue-5.jpg",
        "/venue-6.jpg"
      ]
      
      setVenueSpecs(mockSpecs)
      setAmenities(mockAmenities)
      setEvents(mockEvents)
      setGallery(mockGallery)
      
    } catch (error) {
      console.error('Error fetching venue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCapacity = (capacity: number) => {
    return capacity.toLocaleString()
  }

  const getVenueTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'concert_hall': 'bg-purple-500',
      'club': 'bg-pink-500',
      'bar': 'bg-blue-500',
      'theater': 'bg-green-500',
      'festival_ground': 'bg-orange-500',
      'warehouse': 'bg-gray-500'
    }
    return colors[type] || 'bg-purple-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/20 to-slate-900">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: profile.cover_image ? `url(${profile.cover_image})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        <div className="relative h-full flex items-end">
          <div className="container mx-auto px-6 pb-8">
            <div className="flex items-end gap-6">
              <Avatar className="h-32 w-32 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={profile.avatar_url} alt={profile.profile_data.venue_name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-purple-500">
                  {profile.profile_data.venue_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{profile.profile_data.venue_name}</h1>
                  {profile.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.profile_data.venue_types?.map((type) => (
                    <Badge key={type} className={cn("text-white border-white/30", getVenueTypeColor(type))}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-6 text-sm text-white/80 mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {formatCapacity(profile.profile_data.capacity)} capacity
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {profile.stats.events || 0} events hosted
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    {profile.stats.artists_hosted || 0} artists
                  </div>
                </div>
                
                {profile.location && (
                  <div className="flex items-center gap-2 text-white/80">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                {!isOwnProfile && (
                  <>
                    <Button 
                      onClick={onFollow}
                      className="bg-white text-black hover:bg-white/90 font-semibold"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button 
                      onClick={onMessage}
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/10 backdrop-blur border border-white/20 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="specs" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Music className="h-4 w-4 mr-2" />
              Venue Specs
            </TabsTrigger>
            <TabsTrigger 
              value="events" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* About Section */}
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">About {profile.profile_data.venue_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed mb-6">
                  {profile.profile_data.description || "This venue hasn't added a description yet."}
                </p>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Users className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{formatCapacity(profile.profile_data.capacity)}</div>
                    <div className="text-sm text-white/60">Capacity</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Calendar className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{profile.stats.events || 0}</div>
                    <div className="text-sm text-white/60">Events</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Mic className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{profile.stats.artists_hosted || 0}</div>
                    <div className="text-sm text-white/60">Artists</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">4.8</div>
                    <div className="text-sm text-white/60">Rating</div>
                  </div>
                </div>

                {/* Amenities Grid */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium text-lg">Amenities & Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {amenities.slice(0, 8).map((amenity) => (
                      <div 
                        key={amenity.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors",
                          amenity.available 
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        )}
                      >
                        <amenity.icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{amenity.name}</span>
                        {amenity.available && <CheckCircle className="h-4 w-4 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                {profile.contact_info && (
                  <div className="space-y-4 mt-6">
                    <h4 className="text-white font-medium text-lg">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.contact_info.booking_email && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                          <Mail className="h-5 w-5 text-indigo-400" />
                          <div>
                            <div className="text-white/60 text-sm">Booking Email</div>
                            <div className="text-white">{profile.contact_info.booking_email}</div>
                          </div>
                        </div>
                      )}
                      {profile.contact_info.phone && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                          <Phone className="h-5 w-5 text-green-400" />
                          <div>
                            <div className="text-white/60 text-sm">Phone</div>
                            <div className="text-white">{profile.contact_info.phone}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specs" className="space-y-6">
            {venueSpecs && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <h4 className="text-white font-medium mb-2">Capacity & Stage</h4>
                        <div className="space-y-2 text-white/80">
                          <div>Max Capacity: {formatCapacity(venueSpecs.capacity)} people</div>
                          {venueSpecs.stage_size && <div>Stage Size: {venueSpecs.stage_size}</div>}
                          {venueSpecs.age_restrictions && <div>Age Restrictions: {venueSpecs.age_restrictions}</div>}
                          {venueSpecs.curfew && <div>Curfew: {venueSpecs.curfew}</div>}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/5 rounded-xl">
                        <h4 className="text-white font-medium mb-2">Audio & Visual</h4>
                        <div className="space-y-2 text-white/80">
                          {venueSpecs.sound_system && <div>Sound: {venueSpecs.sound_system}</div>}
                          {venueSpecs.lighting && <div>Lighting: {venueSpecs.lighting}</div>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <h4 className="text-white font-medium mb-2">Facilities</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-white/80">
                            <span>Green Room</span>
                            <Badge className={venueSpecs.green_room ? "bg-green-500" : "bg-red-500"}>
                              {venueSpecs.green_room ? "Available" : "Not Available"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-white/80">
                            <span>Loading Dock</span>
                            <Badge className={venueSpecs.loading_dock ? "bg-green-500" : "bg-red-500"}>
                              {venueSpecs.loading_dock ? "Available" : "Not Available"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-white/80">
                            <span>Alcohol License</span>
                            <Badge className={venueSpecs.alcohol_license ? "bg-green-500" : "bg-red-500"}>
                              {venueSpecs.alcohol_license ? "Licensed" : "Not Licensed"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-white/80">
                            <span>Food Service</span>
                            <Badge className={venueSpecs.food_service ? "bg-green-500" : "bg-red-500"}>
                              {venueSpecs.food_service ? "Available" : "Not Available"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {venueSpecs.parking_spots && (
                        <div className="p-4 bg-white/5 rounded-xl">
                          <h4 className="text-white font-medium mb-2">Parking</h4>
                          <div className="text-white/80">
                            {venueSpecs.parking_spots} on-site parking spots
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      {event.image && (
                        <img 
                          src={event.image} 
                          alt={event.name}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">{event.name}</h3>
                          <Badge 
                            className={cn(
                              "text-white",
                              event.status === 'upcoming' && "bg-green-500",
                              event.status === 'past' && "bg-gray-500", 
                              event.status === 'cancelled' && "bg-red-500"
                            )}
                          >
                            {event.status}
                          </Badge>
                          {event.genre && (
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {event.genre}
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/70 text-lg mb-1">{event.artist}</p>
                        <div className="flex items-center gap-4 text-white/60">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatSafeDate(event.date)}
                          </div>
                          {event.attendance && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {event.attendance} attended
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {event.ticket_url && event.status === 'upcoming' && (
                          <Button 
                            size="sm" 
                            className="bg-white text-black hover:bg-white/90"
                            asChild
                          >
                            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Tickets
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <ProfilePosts 
              profileId={profile.id}
              profileUsername={profile.username}
              isOwnProfile={isOwnProfile}
              compact={false}
            />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">Venue Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((image, index) => (
                    <div key={index} className="relative group cursor-pointer">
                      <img 
                        src={image} 
                        alt={`Venue photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <Button size="sm" className="bg-white/90 text-black hover:bg-white">
                          <Camera className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}