"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  Calendar,
  Music,
  Building,
  Users,
  Star,
  Clock,
  Heart,
  ArrowRight,
  Ticket,
  TrendingUp,
  Sparkles
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface LocalEvent {
  id: string
  title: string
  artist: string
  venue: string
  date: string
  time: string
  location: string
  genre: string
  price: number
  image: string
  rating: number
  attendees: number
}

interface LocalVenue {
  id: string
  name: string
  type: string
  location: string
  rating: number
  capacity: number
  image: string
  upcomingEvents: number
  genres: string[]
}

interface LocalArtist {
  id: string
  name: string
  genre: string
  location: string
  followers: number
  image: string
  isVerified: boolean
  upcomingShows: number
  rating: number
}

export function LocalDiscovery() {
  const [events, setEvents] = useState<LocalEvent[]>([])
  const [venues, setVenues] = useState<LocalVenue[]>([])
  const [artists, setArtists] = useState<LocalArtist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation] = useState("New York, NY") // This would come from user's location

  useEffect(() => {
    // Simulate loading local content
    const loadLocalContent = () => {
      const mockEvents: LocalEvent[] = [
        {
          id: '1',
          title: 'Jazz Night at Blue Note',
          artist: 'Sarah Williams Trio',
          venue: 'Blue Note NYC',
          date: '2024-12-25',
          time: '20:00',
          location: 'Greenwich Village, NYC',
          genre: 'Jazz',
          price: 45,
          image: '/placeholder.svg',
          rating: 4.8,
          attendees: 120
        },
        {
          id: '2',
          title: 'Indie Rock Showcase',
          artist: 'The Midnight Collective',
          venue: 'Brooklyn Bowl',
          date: '2024-12-26',
          time: '19:30',
          location: 'Williamsburg, Brooklyn',
          genre: 'Indie Rock',
          price: 35,
          image: '/placeholder.svg',
          rating: 4.6,
          attendees: 85
        },
        {
          id: '3',
          title: 'Electronic Underground',
          artist: 'DJ Luna',
          venue: 'House of Yes',
          date: '2024-12-27',
          time: '22:00',
          location: 'Bushwick, Brooklyn',
          genre: 'Electronic',
          price: 25,
          image: '/placeholder.svg',
          rating: 4.7,
          attendees: 200
        }
      ]

      const mockVenues: LocalVenue[] = [
        {
          id: '1',
          name: 'Blue Note NYC',
          type: 'Jazz Club',
          location: 'Greenwich Village',
          rating: 4.9,
          capacity: 200,
          image: '/placeholder.svg',
          upcomingEvents: 15,
          genres: ['Jazz', 'Blues', 'Soul']
        },
        {
          id: '2',
          name: 'Brooklyn Bowl',
          type: 'Music Venue',
          location: 'Williamsburg',
          rating: 4.7,
          capacity: 600,
          image: '/placeholder.svg',
          upcomingEvents: 8,
          genres: ['Rock', 'Indie', 'Alternative']
        },
        {
          id: '3',
          name: 'House of Yes',
          type: 'Nightclub',
          location: 'Bushwick',
          rating: 4.5,
          capacity: 400,
          image: '/placeholder.svg',
          upcomingEvents: 12,
          genres: ['Electronic', 'House', 'Techno']
        }
      ]

      const mockArtists: LocalArtist[] = [
        {
          id: '1',
          name: 'Sarah Williams',
          genre: 'Jazz',
          location: 'Manhattan, NY',
          followers: 2547,
          image: '/placeholder.svg',
          isVerified: true,
          upcomingShows: 3,
          rating: 4.8
        },
        {
          id: '2',
          name: 'The Midnight Collective',
          genre: 'Indie Rock',
          location: 'Brooklyn, NY',
          followers: 1832,
          image: '/placeholder.svg',
          isVerified: false,
          upcomingShows: 5,
          rating: 4.6
        },
        {
          id: '3',
          name: 'DJ Luna',
          genre: 'Electronic',
          location: 'Queens, NY',
          followers: 3241,
          image: '/placeholder.svg',
          isVerified: true,
          upcomingShows: 2,
          rating: 4.7
        }
      ]

      setEvents(mockEvents)
      setVenues(mockVenues)
      setArtists(mockArtists)
      setIsLoading(false)
    }

    setTimeout(loadLocalContent, 1000)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return formatSafeDate(date.toISOString())
  }

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          Discover Local Scene
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Explore what's happening in {userLocation}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="events" className="data-[state=active]:bg-purple-500">
              Events
            </TabsTrigger>
            <TabsTrigger value="venues" className="data-[state=active]:bg-purple-500">
              Venues
            </TabsTrigger>
            <TabsTrigger value="artists" className="data-[state=active]:bg-purple-500">
              Artists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-white/10 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-3/4"></div>
                            <div className="h-3 bg-white/10 rounded w-1/2"></div>
                            <div className="h-3 bg-white/10 rounded w-1/3"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Music className="h-8 w-8 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-white text-sm">{event.title}</h4>
                              <p className="text-purple-300 text-xs">{event.artist}</p>
                            </div>
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                              {formatDate(event.date)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {event.venue}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Ticket className="h-3 w-3" />
                              ${event.price}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs text-yellow-400">
                                <Star className="h-3 w-3 fill-current" />
                                {event.rating}
                              </div>
                              <div className="text-xs text-gray-400">
                                {event.attendees} attending
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">
                              <Heart className="h-3 w-3 mr-1" />
                              Interested
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="venues" className="mt-4">
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Building className="h-8 w-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white text-sm">{venue.name}</h4>
                            <p className="text-green-300 text-xs">{venue.type}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Star className="h-3 w-3 fill-current" />
                            {venue.rating}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {venue.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {venue.capacity} capacity
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex gap-1">
                            {venue.genres.slice(0, 2).map((genre) => (
                              <Badge key={genre} className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-gray-400">
                            {venue.upcomingEvents} upcoming events
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="w-16 h-16 border-2 border-white/20">
                          <AvatarImage src={artist.image} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                            {artist.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {artist.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Star className="h-3 w-3 text-white fill-current" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white text-sm">{artist.name}</h4>
                            <p className="text-orange-300 text-xs">{artist.genre}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Star className="h-3 w-3 fill-current" />
                            {artist.rating}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {artist.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {artist.followers.toLocaleString()} followers
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-xs text-gray-400">
                            {artist.upcomingShows} upcoming shows
                          </div>
                          <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-300 hover:bg-orange-500/20">
                            <Heart className="h-3 w-3 mr-1" />
                            Follow
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t border-white/10">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            Explore More in {userLocation}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 