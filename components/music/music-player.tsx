"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Clock,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MusicComment } from './music-comment'

interface MusicTrack {
  id: string
  title: string
  description?: string
  type: 'single' | 'album' | 'ep' | 'mixtape'
  genre?: string
  release_date?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  lyrics?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
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
  updated_at: string
}

interface MusicPlayerProps {
  track: MusicTrack
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  showControls?: boolean
  showStats?: boolean
  showSocial?: boolean
  className?: string
}

export function MusicPlayer({ 
  track, 
  onPlay, 
  onPause, 
  onEnded, 
  showControls = true,
  showStats = true,
  showSocial = true,
  className = ""
}: MusicPlayerProps) {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(track.stats?.likes || 0)
  const [commentCount, setCommentCount] = useState(track.stats?.comments || 0)
  const [shareCount, setShareCount] = useState(track.stats?.shares || 0)
  const [playCount, setPlayCount] = useState(track.stats?.plays || 0)
  
  // Social features state
  const [showComments, setShowComments] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareType, setShareType] = useState<'profile' | 'message' | 'post'>('profile')

  useEffect(() => {
    if (user) {
      checkIfLiked()
    }
  }, [user, track.id])

  const checkIfLiked = async () => {
    if (!user) return
    
    try {
      const res = await fetch(`/api/music/like?musicId=${track.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.liked === true)
      }
    } catch {
      setIsLiked(false)
    }
  }

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      onPlay?.()
      recordPlay()
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      onPause?.()
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    onEnded?.()
  }

  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const recordPlay = async () => {
    try {
      await fetch('/api/music/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ musicId: track.id }),
      })
      setPlayCount(prev => prev + 1)
    } catch {
      // non-blocking
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like tracks')
      return
    }

    try {
      const res = await fetch('/api/music/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ musicId: track.id }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setIsLiked(data.liked)
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1)
      toast.success(data.liked ? 'Added to likes' : 'Removed from likes')
    } catch {
      toast.error('Failed to update like')
    }
  }

  const handleComment = async () => {
    if (!user) {
      toast.error('Please log in to comment')
      return
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      const res = await fetch('/api/music/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ musicId: track.id, content: commentText.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setCommentText('')
      setCommentCount(prev => prev + 1)
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const handleShare = async () => {
    if (!user) {
      toast.error('Please log in to share')
      return
    }

    try {
      const res = await fetch('/api/music/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          musicId: track.id,
          createPost: shareType === 'post',
          content: shareMessage || `Check out this track: ${track.title}`,
        }),
      })
      if (!res.ok) throw new Error('Failed')

      setShareCount(prev => prev + 1)
      setShowShareDialog(false)
      setShareMessage('')
      toast.success('Track shared successfully!')
    } catch {
      toast.error('Failed to share track')
    }
  }

  const shareToExternal = (platform: string) => {
    const url = `${window.location.origin}/music/${track.id}`
    const text = `Check out "${track.title}" on Tourify!`
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      default:
        return
    }
    
    window.open(shareUrl, '_blank')
  }

  return (
    <div className={`bg-slate-900 rounded-lg p-4 ${className}`}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={track.file_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Track info */}
      <div className="flex items-center space-x-4 mb-4">
        {track.cover_art_url && (
          <img 
            src={track.cover_art_url} 
            alt={track.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{track.title}</h3>
          <p className="text-slate-400 text-sm">{track.genre}</p>
          {showStats && (
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {playCount} plays
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                {likeCount} likes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <MessageCircle className="w-3 h-3 mr-1" />
                {commentCount} comments
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress 
          value={(currentTime / duration) * 100} 
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlay}
              disabled={isPlaying}
            >
              <Play className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePause}
              disabled={!isPlaying}
            >
              <Pause className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>
      )}

      {/* Social features */}
      {showSocial && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={isLiked ? 'text-red-500' : ''}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="ml-1 text-xs">{likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="ml-1 text-xs">{commentCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="w-4 h-4" />
              <span className="ml-1 text-xs">{shareCount}</span>
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => shareToExternal('twitter')}>
                Share on Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToExternal('facebook')}>
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToExternal('linkedin')}>
                Share on LinkedIn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments on "{track.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Add a comment</Label>
              <Textarea
                id="comment"
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button onClick={handleComment} disabled={!commentText.trim()}>
                Post Comment
              </Button>
            </div>
            <MusicComment musicId={track.id} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share "{track.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share type</Label>
              <div className="flex space-x-2">
                <Button
                  variant={shareType === 'profile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShareType('profile')}
                >
                  Profile
                </Button>
                <Button
                  variant={shareType === 'post' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShareType('post')}
                >
                  Post
                </Button>
                <Button
                  variant={shareType === 'message' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShareType('message')}
                >
                  Message
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="share-message">Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a message..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleShare} className="flex-1">
                Share
              </Button>
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 