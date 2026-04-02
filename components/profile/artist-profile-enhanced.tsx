"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  Play,
  Pause,
  Music,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Eye,
  Heart,
  Share2,
  Download,
  Star,
  Disc3,
  Radio,
  Headphones,
  Volume2,
  MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfilePosts } from "./profile-posts"

interface ArtistProfileProps {
  profile: {
    id: string
    username: string
    account_type: 'artist'
    profile_data: {
      artist_name: string
      name: string
      genres: string[]
      bio?: string
      location?: string
      label?: string
      manager?: string
    }
    avatar_url?: string
    cover_image?: string
    verified: boolean
    stats: {
      followers: number
      streams?: number
      monthly_listeners?: number
      events?: number
    }
    social_links?: {
      spotify?: string
      apple_music?: string
      instagram?: string
      twitter?: string
      youtube?: string
      website?: string
    }
  }
  isOwnProfile?: boolean
  onFollow?: () => void
  onMessage?: () => void
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

interface Show {
  id: string
  date: string
  venue: string
  city: string
  status: 'upcoming' | 'past' | 'sold_out'
  ticket_url?: string
}

export function ArtistProfileEnhanced({ profile, isOwnProfile = false, onFollow, onMessage }: ArtistProfileProps) {
  const [activeTab, setActiveTab] = useState("music")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mock data - replace with real API calls
  useEffect(() => {
    // Simulate loading artist's music and shows
    const mockTracks: Track[] = [
      {
        id: "1",
        title: "Midnight Echoes",
        album: "Digital Dreams",
        duration: "3:42",
        streams: 2500000,
        release_date: "2024-01-15",
        cover_art: "/album-placeholder.jpg",
        preview_url: "https://example.com/preview1.mp3",
        spotify_url: "https://open.spotify.com/track/example1"
      },
      {
        id: "2", 
        title: "Neon Nights",
        album: "Digital Dreams",
        duration: "4:18",
        streams: 1800000,
        release_date: "2024-01-15",
        cover_art: "/album-placeholder.jpg",
        preview_url: "https://example.com/preview2.mp3",
        spotify_url: "https://open.spotify.com/track/example2"
      },
      {
        id: "3",
        title: "Electric Pulse",
        album: "Singles",
        duration: "3:15",
        streams: 950000,
        release_date: "2023-11-22",
        cover_art: "/single-placeholder.jpg",
        preview_url: "https://example.com/preview3.mp3"
      }
    ]

    const mockShows: Show[] = [
      {
        id: "1",
        date: "2024-03-15",
        venue: "Electric Garden",
        city: "Los Angeles, CA",
        status: "upcoming",
        ticket_url: "https://tickets.example.com"
      },
      {
        id: "2",
        date: "2024-03-22",
        venue: "Neon Club",
        city: "San Francisco, CA", 
        status: "upcoming"
      },
      {
        id: "3",
        date: "2024-02-10",
        venue: "Digital Lounge",
        city: "Austin, TX",
        status: "past"
      }
    ]

    setTracks(mockTracks)
    setShows(mockShows)
    setLoading(false)
  }, [])

  const handlePlayTrack = (trackId: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null)
    } else {
      setCurrentlyPlaying(trackId)
      // In a real app, you'd start audio playback here
    }
  }

  const formatStreams = (streams: number) => {
    if (streams >= 1000000) {
      return `${(streams / 1000000).toFixed(1)}M`
    } else if (streams >= 1000) {
      return `${(streams / 1000).toFixed(1)}K`
    }
    return streams.toString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Hero Section with Cover Art */}
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
                <AvatarImage src={profile.avatar_url} alt={profile.profile_data.artist_name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                  {profile.profile_data.artist_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{profile.profile_data.artist_name}</h1>
                  {profile.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.profile_data.genres?.map((genre) => (
                    <Badge key={genre} variant="secondary" className="bg-white/20 text-white border-white/30">
                      {genre}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-6 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {profile.stats.followers.toLocaleString()} followers
                  </div>
                  {profile.stats.monthly_listeners && (
                    <div className="flex items-center gap-2">
                      <Headphones className="h-4 w-4" />
                      {formatStreams(profile.stats.monthly_listeners)} monthly listeners
                    </div>
                  )}
                  {profile.profile_data.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {profile.profile_data.location}
                    </div>
                  )}
                </div>
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
                      Message
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
              value="music" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Music className="h-4 w-4 mr-2" />
              Music
            </TabsTrigger>
            <TabsTrigger 
              value="shows" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Shows
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="about" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="music" className="space-y-6">
            {/* Featured Track */}
            {tracks.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Disc3 className="h-5 w-5" />
                    Featured Track
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={tracks[0].cover_art || "/placeholder-album.jpg"} 
                        alt={tracks[0].title}
                        className="h-20 w-20 rounded-lg shadow-lg"
                      />
                      <Button
                        size="sm"
                        className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black"
                        onClick={() => handlePlayTrack(tracks[0].id)}
                      >
                        {currentlyPlaying === tracks[0].id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{tracks[0].title}</h3>
                      <p className="text-white/70">{tracks[0].album}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                        <span>{formatStreams(tracks[0].streams)} plays</span>
                        <span>{tracks[0].duration}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {tracks[0].spotify_url && (
                        <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Spotify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discography */}
            <Card className="bg-white/10 backdrop-blur border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Discography</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tracks.map((track) => (
                    <div 
                      key={track.id} 
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                        onClick={() => handlePlayTrack(track.id)}
                      >
                        {currentlyPlaying === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <img 
                        src={track.cover_art || "/placeholder-album.jpg"} 
                        alt={track.title}
                        className="h-12 w-12 rounded"
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{track.title}</h4>
                        <p className="text-sm text-white/70">{track.album}</p>
                      </div>
                      
                      <div className="text-right text-sm text-white/60">
                        <p>{formatStreams(track.streams)} plays</p>
                        <p>{track.duration}</p>
                      </div>
                      
                      <div className="flex gap-1">
                        {track.spotify_url && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20">
                          <Heart className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shows" className="space-y-6">
            <div className="grid gap-4">
              {shows.map((show) => (
                <Card key={show.id} className="bg-white/10 backdrop-blur border border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{show.venue}</h3>
                        <p className="text-white/70">{show.city}</p>
                        <p className="text-sm text-white/60">{formatSafeDate(show.date)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={cn(
                            "text-white",
                            show.status === 'upcoming' && "bg-green-500",
                            show.status === 'past' && "bg-gray-500", 
                            show.status === 'sold_out' && "bg-red-500"
                          )}
                        >
                          {show.status.replace('_', ' ')}
                        </Badge>
                        
                        {show.ticket_url && show.status === 'upcoming' && (
                          <Button size="sm" className="bg-white text-black hover:bg-white/90">
                            Get Tickets
                          </Button>
                        )}
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

          <TabsContent value="about" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">About {profile.profile_data.artist_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed mb-6">
                  {profile.profile_data.bio || "This artist hasn't added a bio yet."}
                </p>
                
                {/* Social Links */}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Connect</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.social_links).map(([platform, url]) => (
                        url && (
                          <Button
                            key={platform}
                            variant="outline"
                            size="sm"
                            className="border-white/30 text-white hover:bg-white/10"
                            asChild
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-2" />
                              {platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                            </a>
                          </Button>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}