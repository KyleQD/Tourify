"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MusicPlayer } from '@/components/music/music-player'
import { 
  Music2, 
  Play, 
  Heart, 
  Share2, 
  MessageCircle, 
  Clock, 
  Calendar,
  TrendingUp,
  Volume2,
  Star,
  ExternalLink,
  Headphones
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface MusicTrack {
  id: string
  title: string
  artist: string
  genre?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  description?: string
  play_count?: number
  likes_count?: number
  comments_count?: number
  shares_count?: number
  tags?: string[]
  type: 'single' | 'album' | 'ep' | 'mixtape'
  release_date?: string
  is_featured?: boolean
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  created_at: string
}

interface PublicMusicDisplayProps {
  artistId: string
  isOwnProfile?: boolean
  className?: string
}

export function PublicMusicDisplay({ artistId, isOwnProfile = false, className = '' }: PublicMusicDisplayProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null)
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMusic()
  }, [artistId])

  const loadMusic = async () => {
    try {
      setIsLoading(true)
      
      // Fetch public music for this artist
      const response = await fetch(`/api/artists/${artistId}/music`)
      if (response.ok) {
        const data = await response.json()
        setTracks(data.tracks || [])
      }
    } catch (error) {
      console.error('Error loading music:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlay = (trackId: string) => {
    setCurrentPlaying(currentPlaying === trackId ? null : trackId)
  }

  const handleLike = async (trackId: string) => {
    try {
      const response = await fetch('/api/music/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicId: trackId })
      })

      if (response.ok) {
        const { liked } = await response.json()
        setLikedTracks(prev => {
          const newSet = new Set(prev)
          if (liked) {
            newSet.add(trackId)
          } else {
            newSet.delete(trackId)
          }
          return newSet
        })

        // Update track likes count
        setTracks(prev => prev.map(track => 
          track.id === trackId 
            ? { ...track, likes_count: (track.likes_count || 0) + (liked ? 1 : -1) }
            : track
        ))
      }
    } catch (error) {
      console.error('Error liking track:', error)
      toast.error('Failed to like track')
    }
  }

  const handleShare = async (track: MusicTrack) => {
    try {
      const shareData = {
        title: `${track.title} by ${track.artist}`,
        text: track.description || `Listen to ${track.title}`,
        url: `${window.location.origin}/music/${track.id}`
      }

      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing track:', error)
    }
  }

  const getFilteredTracks = () => {
    switch (activeTab) {
      case 'featured':
        return tracks.filter(track => track.is_featured)
      case 'recent':
        return tracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
      case 'popular':
        return tracks.sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5)
      default:
        return tracks
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalStats = () => {
    return tracks.reduce((acc, track) => ({
      totalTracks: acc.totalTracks + 1,
      totalPlays: acc.totalPlays + (track.play_count || 0),
      totalLikes: acc.totalLikes + (track.likes_count || 0),
      totalDuration: acc.totalDuration + (track.duration || 0),
      featuredTracks: acc.featuredTracks + (track.is_featured ? 1 : 0)
    }), { totalTracks: 0, totalPlays: 0, totalLikes: 0, totalDuration: 0, featuredTracks: 0 })
  }

  const stats = getTotalStats()
  const filteredTracks = getFilteredTracks()

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-slate-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Music2 className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-3">No Music Yet</h3>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          {isOwnProfile 
            ? "Start sharing your music with the world by uploading your first track."
            : "This artist hasn't uploaded any music yet."
          }
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music2 className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Plays</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlays.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300">Likes</p>
                <p className="text-2xl font-bold text-white">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Duration</p>
                <p className="text-2xl font-bold text-white">{Math.round(stats.totalDuration / 60)}m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Music Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="all" className="text-gray-300 data-[state=active]:text-white">
            All ({tracks.length})
          </TabsTrigger>
          <TabsTrigger value="featured" className="text-gray-300 data-[state=active]:text-white">
            Featured ({stats.featuredTracks})
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-gray-300 data-[state=active]:text-white">
            Recent
          </TabsTrigger>
          <TabsTrigger value="popular" className="text-gray-300 data-[state=active]:text-white">
            Popular
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {filteredTracks.map((track) => (
              <Card key={track.id} className="bg-slate-900/50 border-slate-700/50 hover:border-purple-500/50 transition-all duration-200 group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Cover Art */}
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {track.cover_art_url ? (
                        <Image
                          src={track.cover_art_url}
                          alt={track.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Music2 className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(track.id)}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          {currentPlaying === track.id ? (
                            <Headphones className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {track.title}
                            </h3>
                            {track.is_featured && (
                              <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                              {track.type}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-2">
                            {track.artist} • {track.genre} • {formatDuration(track.duration)}
                          </p>
                          
                          {track.description && (
                            <p className="text-gray-500 text-sm line-clamp-2 mb-2">
                              {track.description}
                            </p>
                          )}
                          
                          {track.tags && track.tags.length > 0 && (
                            <div className="flex gap-1 mb-3">
                              {track.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs border-purple-500/30 text-purple-300"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {(track.play_count || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {(track.likes_count || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {(track.comments_count || 0).toLocaleString()}
                            </span>
                            {track.release_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatSafeDate(track.release_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(track.id)}
                            className={`text-gray-400 hover:text-red-400 ${
                              likedTracks.has(track.id) ? 'text-red-400' : ''
                            }`}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(track)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          
                          {/* External Links */}
                          <div className="flex gap-1">
                            {track.spotify_url && (
                              <a
                                href={track.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {track.apple_music_url && (
                              <a
                                href={track.apple_music_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-pink-400 hover:text-pink-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Music Player */}
                  {currentPlaying === track.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <MusicPlayer
                        track={{
                          id: track.id,
                          title: track.title,
                          description: track.description,
                          type: track.type,
                          genre: track.genre,
                          file_url: track.file_url,
                          cover_art_url: track.cover_art_url,
                          tags: track.tags || [],
                          is_featured: track.is_featured || false,
                          is_public: true,
                          stats: {
                            plays: track.play_count || 0,
                            likes: track.likes_count || 0,
                            comments: track.comments_count || 0,
                            shares: track.shares_count || 0
                          },
                          created_at: track.created_at,
                          updated_at: track.created_at
                        }}
                        showStats={false}
                        showSocial={false}
                        className="bg-slate-800/50 rounded-lg p-3"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 