"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Music, Users, Play, Heart, Share2, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Artist {
  id: string
  artist_name: string
  bio: string
  avatar_url?: string
  location?: string
  genres: string[]
  follower_count: number
  upcoming_events: number
  is_verified: boolean
  social_links: {
    spotify?: string
    youtube?: string
    instagram?: string
  }
}

export default function ArtistDiscoveryPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set())

  const genres = [
    "Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical", 
    "Country", "R&B", "Indie", "Folk", "Metal", "Reggae"
  ]

  const locations = [
    "New York", "Los Angeles", "Nashville", "Atlanta", "Chicago", 
    "Austin", "Seattle", "Miami", "Boston", "Denver"
  ]

  useEffect(() => {
    loadArtists()
  }, [searchQuery, selectedGenre, selectedLocation])

  const loadArtists = async () => {
    try {
      setIsLoading(true)
      
      let query = supabase
        .from('artist_profiles')
        .select(`
          id,
          artist_name,
          bio,
          avatar_url,
          location,
          genres,
          follower_count,
          is_verified,
          social_links
        `)
        .eq('is_public', true)
        .order('follower_count', { ascending: false })
        .limit(20)

      if (searchQuery) {
        query = query.ilike('artist_name', `%${searchQuery}%`)
      }

      if (selectedGenre) {
        query = query.contains('genres', [selectedGenre])
      }

      if (selectedLocation) {
        query = query.ilike('location', `%${selectedLocation}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setArtists(data || [])
    } catch (error) {
      console.error('Error loading artists:', error)
      toast.error('Failed to load artists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (artistId: string) => {
    try {
      const { error } = await supabase
        .from('artist_followers')
        .insert({
          artist_id: artistId,
          follower_id: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error

      setFollowedArtists(prev => new Set([...prev, artistId]))
      toast.success('Artist followed!')
    } catch (error) {
      console.error('Error following artist:', error)
      toast.error('Failed to follow artist')
    }
  }

  const handleShare = async (artist: Artist) => {
    if (navigator.share) {
      await navigator.share({
        title: `Check out ${artist.artist_name} on Tourify`,
        text: artist.bio,
        url: `https://tourify.com/artist/${artist.id}`
      })
    } else {
      await navigator.clipboard.writeText(`https://tourify.com/artist/${artist.id}`)
      toast.success('Artist link copied to clipboard!')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Discover Amazing Artists</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Connect with talented artists from around the world. Find your next favorite musician and support emerging talent.
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search artists by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Genre Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedGenre === null ? "default" : "outline"}
                onClick={() => setSelectedGenre(null)}
                className="h-10"
              >
                All Genres
              </Button>
              {genres.slice(0, 4).map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre ? "default" : "outline"}
                  onClick={() => setSelectedGenre(genre)}
                  className="h-10"
                >
                  {genre}
                </Button>
              ))}
            </div>

            {/* Location Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedLocation === null ? "default" : "outline"}
                onClick={() => setSelectedLocation(null)}
                className="h-10"
              >
                All Locations
              </Button>
              {locations.slice(0, 3).map((location) => (
                <Button
                  key={location}
                  variant={selectedLocation === location ? "default" : "outline"}
                  onClick={() => setSelectedLocation(location)}
                  className="h-10"
                >
                  {location}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-slate-800 rounded mb-4"></div>
                <div className="h-4 bg-slate-800 rounded mb-2"></div>
                <div className="h-3 bg-slate-800 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <Card key={artist.id} className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50 transition-colors group">
              <CardContent className="p-6">
                {/* Artist Avatar and Info */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artist.avatar_url} alt={artist.artist_name} />
                    <AvatarFallback className="bg-purple-600 text-white text-lg">
                      {artist.artist_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">{artist.artist_name}</h3>
                      {artist.is_verified && (
                        <Badge className="bg-blue-600 text-white px-2 py-1">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    {artist.location && (
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <MapPin className="h-3 w-3" />
                        {artist.location}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {artist.bio || "Passionate musician creating amazing sounds..."}
                </p>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {artist.genres?.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs bg-slate-800 text-gray-300">
                      {genre}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {artist.follower_count || 0} followers
                  </div>
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    {artist.upcoming_events || 0} events
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!followedArtists.has(artist.id) ? (
                    <Button
                      onClick={() => handleFollow(artist.id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex-1 bg-green-600 text-white cursor-not-allowed"
                    >
                      <Heart className="h-4 w-4 mr-2 fill-current" />
                      Following
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/artist/${artist.id}`, '_blank')}
                    className="border-slate-700 text-gray-300 hover:text-white"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleShare(artist)}
                    className="border-slate-700 text-gray-300 hover:text-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && artists.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Artists Found</h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search criteria or explore different genres and locations.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setSelectedGenre(null)
                setSelectedLocation(null)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Community Impact Section */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Building the Music Community</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Every follow, share, and discovery helps artists grow their careers. Join thousands of music lovers 
            supporting emerging talent and building connections that last.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">10K+</div>
              <div className="text-gray-400">Artists Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">50K+</div>
              <div className="text-gray-400">Connections Made</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">25K+</div>
              <div className="text-gray-400">Events Promoted</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 