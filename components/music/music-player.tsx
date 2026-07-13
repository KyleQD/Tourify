"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Users,
  BookmarkPlus,
  BookmarkCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MusicComment } from "./music-comment"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import {
  addTrackToLibrary,
  checkLibraryStatus,
  checkLikeStatus,
  toggleLike,
} from "@/lib/services/jukebox.service"
import { cn } from "@/lib/utils"

interface MusicTrack {
  id: string
  title: string
  description?: string
  type: "single" | "album" | "ep" | "mixtape"
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
  artist_name?: string
  artist_id?: string
  in_library?: boolean
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

function toJukeboxTrack(track: MusicTrack): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: track.artist_name || "Artist",
    artist_id: track.artist_id,
    duration: track.duration,
    file_url: track.file_url || `/api/music/stream?trackId=${track.id}`,
    cover_art_url: track.cover_art_url,
    genre: track.genre,
    tags: track.tags || [],
    in_library: track.in_library,
  }
}

export function MusicPlayer({
  track,
  onPlay,
  onPause,
  showControls = true,
  showStats = true,
  showSocial = true,
  className = "",
}: MusicPlayerProps) {
  const { user } = useAuth()
  const jukebox = useJukeboxOptional()
  const [isLiked, setIsLiked] = useState(false)
  const [inLibrary, setInLibrary] = useState(Boolean(track.in_library))
  const [likeCount, setLikeCount] = useState(track.stats?.likes || 0)
  const [commentCount, setCommentCount] = useState(track.stats?.comments || 0)
  const [shareCount, setShareCount] = useState(track.stats?.shares || 0)
  const [playCount, setPlayCount] = useState(track.stats?.plays || 0)
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [shareMessage, setShareMessage] = useState("")
  const [shareType, setShareType] = useState<"profile" | "message" | "post">(
    "profile"
  )

  const jukeboxTrack = toJukeboxTrack(track)
  const isCurrentTrack = jukebox?.state.currentTrack?.id === track.id
  const isPlaying = Boolean(isCurrentTrack && jukebox?.state.isPlaying)
  const currentTime = isCurrentTrack ? jukebox?.state.currentTime || 0 : 0
  const duration =
    isCurrentTrack && jukebox?.state.duration
      ? jukebox.state.duration
      : track.duration || 0
  const volume = jukebox?.state.volume ?? 1
  const isMuted = jukebox?.state.isMuted ?? false

  useEffect(() => {
    let cancelled = false
    setInLibrary(Boolean(track.in_library))

    Promise.all([
      user ? checkLikeStatus(track.id) : Promise.resolve(false),
      track.in_library || !user
        ? Promise.resolve(Boolean(track.in_library))
        : checkLibraryStatus(track.id),
    ]).then(([liked, library]) => {
      if (cancelled) return
      setIsLiked(liked)
      setInLibrary(library)
    })

    return () => {
      cancelled = true
    }
  }, [user, track.id, track.in_library])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handlePlay = () => {
    if (!jukebox) {
      toast.error("Music player is unavailable")
      return
    }
    if (isCurrentTrack && !isPlaying) {
      jukebox.resume()
    } else {
      jukebox.play(jukeboxTrack)
      setPlayCount((prev) => prev + 1)
    }
    onPlay?.()
  }

  const handlePause = () => {
    jukebox?.pause()
    onPause?.()
  }

  const handleSeek = (value: number[]) => {
    if (!isCurrentTrack) return
    jukebox?.seekTo(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    jukebox?.setVolume(value[0])
  }

  const toggleMute = () => {
    jukebox?.toggleMute()
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like tracks")
      return
    }

    const result = await toggleLike(track.id)
    if (!result) {
      toast.error("Failed to update like")
      return
    }
    setIsLiked(result.liked)
    setLikeCount((prev) => (result.liked ? prev + 1 : Math.max(0, prev - 1)))
    toast.success(result.liked ? "Added to likes" : "Removed from likes")
  }

  const handleAddToLibrary = async () => {
    if (!user) {
      toast.error("Please log in to save tracks")
      return
    }
    if (inLibrary || isLibraryLoading) return

    setIsLibraryLoading(true)
    const result = await addTrackToLibrary(track.id)
    if (result.ok) {
      setInLibrary(true)
      toast.success("Added to your library")
    } else {
      toast.error(result.message || "Failed to add to library")
    }
    setIsLibraryLoading(false)
  }

  const handleComment = async () => {
    if (!user) {
      toast.error("Please log in to comment")
      return
    }

    if (!commentText.trim()) {
      toast.error("Please enter a comment")
      return
    }

    try {
      const res = await fetch("/api/music/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ musicId: track.id, content: commentText.trim() }),
      })
      if (!res.ok) throw new Error("Failed")
      setCommentText("")
      setCommentCount((prev) => prev + 1)
      toast.success("Comment added")
    } catch {
      toast.error("Failed to add comment")
    }
  }

  const handleShare = async () => {
    if (!user) {
      toast.error("Please log in to share")
      return
    }

    try {
      const res = await fetch("/api/music/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          musicId: track.id,
          createPost: shareType === "post",
          content: shareMessage || `Check out this track: ${track.title}`,
        }),
      })
      if (!res.ok) throw new Error("Failed")

      setShareCount((prev) => prev + 1)
      setShowShareDialog(false)
      setShareMessage("")
      toast.success("Track shared successfully!")
    } catch {
      toast.error("Failed to share track")
    }
  }

  const shareToExternal = (platform: string) => {
    const url = `${window.location.origin}/music/${track.id}`
    const text = `Check out "${track.title}" on Tourify!`

    let shareUrl = ""
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      default:
        return
    }

    window.open(shareUrl, "_blank")
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn("bg-slate-900 rounded-lg p-4", className)}>
      <div className="flex items-center space-x-4 mb-4">
        {track.cover_art_url ? (
          <img
            src={track.cover_art_url}
            alt={track.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{track.title}</h3>
          <p className="text-slate-400 text-sm truncate">
            {track.artist_name || track.genre}
          </p>
          {showStats ? (
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
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isCurrentTrack ? (
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 1}
            step={0.5}
            className="mb-2"
          />
        ) : null}
        <div className="flex justify-between text-xs text-slate-400 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {showControls ? (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isPlaying ? handlePause : handlePlay}
              className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
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
      ) : null}

      {showSocial ? (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={isLiked ? "text-red-500" : ""}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span className="ml-1 text-xs">{likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToLibrary}
              disabled={inLibrary || isLibraryLoading}
              aria-label={inLibrary ? "In library" : "Add to library"}
            >
              {inLibrary ? (
                <BookmarkCheck className="w-4 h-4 text-purple-400" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
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
              <DropdownMenuItem onClick={() => shareToExternal("twitter")}>
                Share on Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToExternal("facebook")}>
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToExternal("linkedin")}>
                Share on LinkedIn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? "text-red-500" : ""}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddToLibrary}
            disabled={inLibrary || isLibraryLoading}
          >
            {inLibrary ? (
              <BookmarkCheck className="w-4 h-4 text-purple-400" />
            ) : (
              <BookmarkPlus className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments on &quot;{track.title}&quot;</DialogTitle>
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

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share &quot;{track.title}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share type</Label>
              <div className="flex space-x-2">
                <Button
                  variant={shareType === "profile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareType("profile")}
                >
                  Profile
                </Button>
                <Button
                  variant={shareType === "post" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareType("post")}
                >
                  Post
                </Button>
                <Button
                  variant={shareType === "message" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareType("message")}
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
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
