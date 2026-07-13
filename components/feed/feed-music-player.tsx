'use client'

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  BookmarkPlus,
  BookmarkCheck,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import { useTrackSocialState } from '@/components/jukebox/player-actions'
import { TrackCoverImage } from '@/components/jukebox/track-cover-image'
import { resolveJukeboxCoverUrl } from '@/lib/services/jukebox.service'

interface MusicTrack {
  id: string
  title: string
  artist: string
  album?: string
  genre?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  description?: string
  tags: string[]
  is_featured: boolean
  is_public: boolean
  stats: {
    plays: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  author?: {
    id: string
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface FeedMusicPlayerProps {
  track: MusicTrack
  onLike?: (trackId: string) => void
  onShare?: (trackId: string) => void
  onComment?: (trackId: string) => void
  onViewMore?: (trackId: string) => void
  isLiked?: boolean
  className?: string
  compact?: boolean
  playSource?: string
}

export function FeedMusicPlayer({
  track,
  onLike,
  onShare,
  onComment,
  onViewMore,
  isLiked = false,
  className = '',
  compact = false,
  playSource = 'jukebox',
}: FeedMusicPlayerProps) {
  const jukebox = useJukeboxOptional()
  const {
    isLiked: trackLiked,
    inLibrary,
    isLibraryLoading,
    handleLike: handleTrackLike,
    handleAddToLibrary,
  } = useTrackSocialState({
    trackId: track.id,
    initialLiked: isLiked,
  })

  const liked = trackLiked || isLiked

  const isCurrentTrack = jukebox?.state.currentTrack?.id === track.id
  const isPlaying = Boolean(isCurrentTrack && jukebox?.state.isPlaying)
  const currentTime = isCurrentTrack ? jukebox?.state.currentTime || 0 : 0
  const duration =
    isCurrentTrack && jukebox?.state.duration
      ? jukebox.state.duration
      : track.duration || 0
  const volume = jukebox?.state.volume ?? 1
  const isMuted = jukebox?.state.isMuted ?? false

  const handlePlayPause = () => {
    if (!jukebox) {
      toast.error('Music player is unavailable')
      return
    }

    if (isCurrentTrack && isPlaying) {
      jukebox.pause()
      return
    }

    if (isCurrentTrack) {
      jukebox.resume()
      return
    }

    jukebox.play(
      {
        id: track.id,
        title: track.title,
        artist_name: track.artist,
        artist_id: track.author?.id,
        artist_avatar_url: track.author?.avatar_url,
        duration: track.duration,
        file_url: track.file_url || `/api/music/stream?trackId=${track.id}`,
        cover_art_url: resolveJukeboxCoverUrl(track.id, track.cover_art_url),
        genre: track.genre,
        tags: track.tags || [],
      },
      { source: playSource }
    )
  }

  const handleViewMore = () => {
    if (!jukebox) {
      toast.error('Music player is unavailable')
      return
    }

    if (!isCurrentTrack) {
      jukebox.play(
        {
          id: track.id,
          title: track.title,
          artist_name: track.artist,
          artist_id: track.author?.id,
          artist_avatar_url: track.author?.avatar_url,
          duration: track.duration,
          file_url: track.file_url || `/api/music/stream?trackId=${track.id}`,
          cover_art_url: resolveJukeboxCoverUrl(track.id, track.cover_art_url),
          genre: track.genre,
          tags: track.tags || [],
        },
        { source: playSource }
      )
    }

    jukebox.setExpanded(true, 'now-playing')
    onViewMore?.(track.id)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!jukebox || !isCurrentTrack || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    jukebox.seekTo(percentage * duration)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    jukebox?.setVolume(parseFloat(e.target.value))
  }

  const toggleMute = () => {
    jukebox?.toggleMute()
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleLike = () => {
    void handleTrackLike()
    onLike?.(track.id)
  }

  const handleShare = () => {
    onShare?.(track.id)
  }

  const handleComment = () => {
    onComment?.(track.id)
  }

  if (compact) {
    return (
      <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 group ${className}`}>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl overflow-hidden">
              <TrackCoverImage
                src={track.cover_art_url}
                trackId={track.id}
                alt={track.title}
                className="h-full w-full"
                iconClassName="h-6 w-6"
              />
            </div>

            <Button
              onClick={handlePlayPause}
              className="absolute inset-0 w-full h-full bg-black/50 hover:bg-black/70 rounded-xl border-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors">
              {track.title}
            </h3>
            <p className="text-gray-400 text-sm truncate">{track.artist}</p>
            {track.genre && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-2 py-1 text-xs mt-1">
                {track.genre}
              </Badge>
            )}
          </div>

          <div className="text-gray-400 text-sm">{formatTime(duration)}</div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`h-8 w-8 p-0 ${liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToLibrary}
              disabled={isLibraryLoading || inLibrary}
              className="h-8 w-8 p-0 text-gray-400 hover:text-purple-400"
            >
              {inLibrary ? (
                <BookmarkCheck className="h-4 w-4 text-purple-400" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewMore}
              className="h-8 w-8 p-0 text-gray-400 hover:text-purple-400"
              title="View more"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0 text-gray-400 hover:text-purple-400"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 group ${className}`}>
      {track.author && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={track.author.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {track.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{track.author.name}</span>
                {track.author.is_verified && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-2 py-0.5 text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                posted a track {formatDistanceToNow(new Date(track.created_at), { addSuffix: true })}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                <DropdownMenuItem
                  className="text-white hover:bg-slate-800"
                  onClick={handleAddToLibrary}
                >
                  Add to Library
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-slate-800" onClick={handleViewMore}>
                  View more
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-slate-800" onClick={handleShare}>
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl overflow-hidden">
              <TrackCoverImage
                src={track.cover_art_url}
                trackId={track.id}
                alt={track.title}
                className="h-full w-full"
                iconClassName="h-10 w-10"
              />
            </div>

            <Button
              onClick={handlePlayPause}
              className="absolute inset-0 w-full h-full bg-black/50 hover:bg-black/70 rounded-2xl border-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                {track.title}
              </h2>
              <p className="text-gray-300 text-lg mb-2">{track.artist}</p>
              {track.album && (
                <p className="text-gray-400 text-sm mb-3">from {track.album}</p>
              )}
              {track.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{track.description}</p>
              )}
            </div>

            {track.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {track.tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-2 py-1 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
                {track.tags.length > 3 && (
                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 px-2 py-1 text-xs">
                    +{track.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="mb-4">
              <div
                className="w-full h-2 bg-white/10 rounded-full cursor-pointer mb-2"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePlayPause}
                  className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full border-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`h-8 px-3 ${liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                  {track.stats.likes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToLibrary}
                  disabled={isLibraryLoading || inLibrary}
                  className="h-8 px-3 text-gray-400 hover:text-purple-400"
                >
                  {inLibrary ? (
                    <BookmarkCheck className="h-4 w-4 mr-1 text-purple-400" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4 mr-1" />
                  )}
                  {inLibrary ? 'Saved' : 'Library'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComment}
                  className="h-8 px-3 text-gray-400 hover:text-blue-400"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {track.stats.comments}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-8 px-3 text-gray-400 hover:text-purple-400"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  {track.stats.shares}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewMore}
                  className="h-8 px-3 text-gray-400 hover:text-purple-400"
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  View more
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
