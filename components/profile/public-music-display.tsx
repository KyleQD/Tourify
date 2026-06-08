"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  ExternalLink,
  Heart,
  Music,
  Disc3,
  Volume2,
  Headphones
} from "lucide-react"
import { toast } from "sonner"
import { ComingSoonBanner } from "@/components/ui/coming-soon-banner"

interface Track {
  id: string
  title: string
  artist: string
  type: string
  genre?: string
  duration: string
  play_count: number
  release_date: string
  cover_art_url?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  is_featured: boolean
}

interface PublicMusicDisplayProps {
  artistId: string
  isOwnProfile?: boolean
  compact?: boolean
}

export function PublicMusicDisplay({ artistId, isOwnProfile = false, compact = false }: PublicMusicDisplayProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [featuredTrack, setFeaturedTrack] = useState<Track | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPlaybackBanner, setShowPlaybackBanner] = useState(false)

  useEffect(() => {
    fetchMusic()
  }, [artistId])

  const fetchMusic = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/artists/${artistId}/music?limit=${compact ? 5 : 20}`)
      
      if (response.ok) {
        const data = await response.json()
        const tracks = data.tracks || []
        
        setTracks(tracks)
        
        // Find featured track or use first track
        const featured = tracks.find((track: Track) => track.is_featured) || tracks[0]
        setFeaturedTrack(featured)
        
      } else if (response.status === 404) {
        // Artist not found or no music
        setTracks([])
        setFeaturedTrack(null)
      } else {
        throw new Error('Failed to fetch music')
      }
    } catch (error) {
      console.error('Error fetching music:', error)
      setError('Failed to load music')
      toast.error('Failed to load music')
    } finally {
      setLoading(false)
    }
  }

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const handlePlayTrack = (trackId: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null)
      setShowPlaybackBanner(false)
    } else {
      setCurrentlyPlaying(trackId)
      setShowPlaybackBanner(true)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-1/3"></div>
            <div className="h-20 bg-white/20 rounded"></div>
            <div className="space-y-3">
              {[...Array(compact ? 3 : 5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/20 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="h-10 w-10 text-red-400" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Music Unavailable</h3>
          <p className="text-gray-400 text-lg">
            {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (tracks.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="h-10 w-10 text-purple-400" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">No Music Yet</h3>
          <p className="text-gray-400 text-lg">
            This artist hasn't released any music yet.
          </p>
          {isOwnProfile && (
            <Button className="mt-6 bg-purple-600 hover:bg-purple-700">
              Upload Music
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const playbackBanner = showPlaybackBanner ? (
    <ComingSoonBanner
      title="In-app audio playback coming soon"
      description="Use the streaming links on each track until native playback is available."
      className="mb-4"
    />
  ) : null

  if (compact) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-purple-400" />
            Latest Music
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playbackBanner}
          <div className="space-y-3">
            {tracks.slice(0, 3).map((track) => (
              <div key={track.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 rounded-full text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                  onClick={() => handlePlayTrack(track.id)}
                >
                  {currentlyPlaying === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <img 
                  src={track.cover_art_url || "/placeholder-album.jpg"} 
                  alt={track.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {track.genre && (
                      <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {track.genre}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatPlayCount(track.play_count)} plays
                    </span>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {track.spotify_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-green-500/20 hover:text-green-300"
                      asChild
                    >
                      <a href={track.spotify_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Heart className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {tracks.length > 3 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
              >
                View All Music ({tracks.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {playbackBanner}
      {/* Featured Track */}
      {featuredTrack && (
        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-purple-400" />
              Featured Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <img 
                  src={featuredTrack.cover_art_url || "/placeholder-album.jpg"} 
                  alt={featuredTrack.title}
                  className="h-24 w-24 rounded-xl shadow-2xl object-cover"
                />
                <Button
                  size="lg"
                  className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-white/90 hover:bg-white text-black shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                  onClick={() => handlePlayTrack(featuredTrack.id)}
                >
                  {currentlyPlaying === featuredTrack.id ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                {featuredTrack.is_featured && (
                  <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs">
                    Featured
                  </Badge>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1">{featuredTrack.title}</h3>
                <p className="text-purple-300 text-lg mb-2">{featuredTrack.artist}</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Headphones className="h-4 w-4" />
                    <span>{formatPlayCount(featuredTrack.play_count)} plays</span>
                  </div>
                  {featuredTrack.genre && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {featuredTrack.genre}
                    </Badge>
                  )}
                  <span className="text-gray-400 text-sm">{featuredTrack.duration}</span>
                </div>
                
                <div className="flex gap-2">
                  {featuredTrack.spotify_url && (
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      asChild
                    >
                      <a href={featuredTrack.spotify_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Spotify
                      </a>
                    </Button>
                  )}
                  {featuredTrack.apple_music_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-500 text-gray-300 hover:bg-gray-500/20"
                      asChild
                    >
                      <a href={featuredTrack.apple_music_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apple Music
                      </a>
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track List */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-400" />
              All Music
            </div>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div 
                key={track.id}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => handlePlayTrack(track.id)}
              >
                <div className="w-8 text-center">
                  {currentlyPlaying === track.id ? (
                    <Volume2 className="h-4 w-4 text-purple-400 mx-auto animate-pulse" />
                  ) : (
                    <span className="text-gray-400 text-sm group-hover:hidden">{index + 1}</span>
                  )}
                  <Play className="h-4 w-4 text-purple-400 mx-auto hidden group-hover:block" />
                </div>
                
                <img 
                  src={track.cover_art_url || "/placeholder-album.jpg"} 
                  alt={track.title}
                  className="h-14 w-14 rounded-lg object-cover shadow-lg"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    {track.genre && (
                      <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {track.genre}
                      </Badge>
                    )}
                    <span className="text-sm text-gray-400">
                      {track.type}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(track.release_date).getFullYear()}
                    </span>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-400">
                  <p>{formatPlayCount(track.play_count)} plays</p>
                  <p>{track.duration}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {track.spotify_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-green-500/20 hover:text-green-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(track.spotify_url, '_blank')
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-red-500/20 hover:text-red-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Heart className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}