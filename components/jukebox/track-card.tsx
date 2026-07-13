"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Play,
  Pause,
  Heart,
  ListPlus,
  MoreHorizontal,
  Share2,
  Download,
  ShoppingCart,
  User,
  Plus,
  Flag,
  BookmarkPlus,
  BookmarkCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukebox, type JukeboxTrack } from "@/contexts/jukebox-context"
import {
  addTrackToPlaylist,
  addTrackToLibrary,
  shareTrack,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import { useTrackSocialState } from "@/components/jukebox/player-actions"
import { setCachedSocialStatus } from "@/lib/jukebox/track-social-cache"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { toast } from "sonner"

function toastApiError(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) {
    toast.error(error)
    return
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    if (typeof record.message === "string" && record.message.trim()) {
      toast.error(record.message)
      return
    }
  }
  toast.error(fallback)
}

interface TrackCardProps {
  track: JukeboxTrack
  playlists?: JukeboxPlaylist[]
  showArtist?: boolean
  compact?: boolean
  index?: number
  onPlaylistUpdated?: () => void
  className?: string
}

export function TrackCard({
  track,
  playlists = [],
  showArtist = true,
  compact = false,
  index,
  onPlaylistUpdated,
  className,
}: TrackCardProps) {
  const { state, play, pause, addToQueue } = useJukebox()
  const {
    isLiked,
    inLibrary,
    isLikeLoading,
    isLibraryLoading,
    handleLike,
    handleAddToLibrary,
  } = useTrackSocialState({
    trackId: track.id,
    initialInLibrary: Boolean(track.in_library),
  })

  const isCurrentTrack = state.currentTrack?.id === track.id
  const isPlaying = isCurrentTrack && state.isPlaying

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pause()
    else play(track)
  }, [isPlaying, play, pause, track])

  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!inLibrary) {
        const libraryResult = await addTrackToLibrary(track.id)
        if (!libraryResult.ok) {
          toast.error(
            typeof libraryResult.message === "string"
              ? libraryResult.message
              : "Track must be in your library to add to playlist"
          )
          return
        }
        setCachedSocialStatus(track.id, { inLibrary: true })
      }
      const ok = await addTrackToPlaylist(playlistId, track.id)
      if (ok) {
        toast.success("Added to playlist")
        onPlaylistUpdated?.()
      } else {
        toast.error("Failed to add to playlist")
      }
    },
    [track.id, onPlaylistUpdated, inLibrary]
  )

  const handleShare = useCallback(async () => {
    const ok = await shareTrack(track.id)
    if (ok) toast.success("Shared to feed")
    else toast.error("Failed to share")
  }, [track.id])

  const handleAddToQueue = useCallback(() => {
    addToQueue(track)
    toast.success("Added to queue")
  }, [addToQueue, track])

  if (compact) {
    return (
      <div
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5 cursor-pointer",
          isCurrentTrack && "bg-purple-500/10 border border-purple-500/20",
          className
        )}
        onClick={handlePlayPause}
      >
        {typeof index === "number" && (
          <span className="w-6 text-center text-xs text-slate-500 group-hover:hidden">
            {index + 1}
          </span>
        )}
        {typeof index === "number" && (
          <span className="hidden w-6 text-center group-hover:block">
            {isPlaying ? (
              <Pause className="mx-auto h-3.5 w-3.5 text-purple-400" />
            ) : (
              <Play className="mx-auto h-3.5 w-3.5 text-white" />
            )}
          </span>
        )}

        <TrackCoverImage
          src={track.cover_art_url}
          trackId={track.id}
          className="h-10 w-10 rounded"
          iconClassName="h-4 w-4"
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isCurrentTrack ? "text-purple-300" : "text-white"
            )}
          >
            {track.title}
          </p>
          {showArtist && (
            <p className="truncate text-xs text-slate-400">
              {track.artist_name}
            </p>
          )}
        </div>

        <span className="text-xs text-slate-500">
          {formatDuration(track.duration)}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            handleLike()
          }}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            )}
          />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl p-3 transition-all hover:bg-white/5",
        isCurrentTrack &&
          "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20",
        className
      )}
    >
      <button
        onClick={handlePlayPause}
        className="relative flex-shrink-0"
      >
        <TrackCoverImage
          src={track.cover_art_url}
          trackId={track.id}
          className="h-14 w-14 rounded-lg"
          iconClassName="h-6 w-6"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPlaying ? (
            <Pause className="h-6 w-6 text-white" />
          ) : (
            <Play className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate font-medium",
            isCurrentTrack ? "text-purple-300" : "text-white"
          )}
        >
          {track.title}
        </p>
        {showArtist && (
          <p className="truncate text-sm text-slate-400">
            {track.artist_name}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          {track.genre && (
            <Badge
              variant="secondary"
              className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[10px] px-1.5 py-0"
            >
              {track.genre}
            </Badge>
          )}
          <span className="text-xs text-slate-500">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8"
          onClick={handleLike}
          disabled={isLikeLoading}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            )}
          />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8"
          onClick={handleAddToLibrary}
          disabled={isLibraryLoading || inLibrary}
          aria-label={inLibrary ? "In library" : "Add to library"}
        >
          {inLibrary ? (
            <BookmarkCheck className="h-4 w-4 text-purple-400" />
          ) : (
            <BookmarkPlus className="h-4 w-4 text-slate-400" />
          )}
        </Button>

        {track.listing_id && !inLibrary && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 text-emerald-400"
            onClick={() =>
              window.open(`/marketplace/listings/${track.listing_id}`, "_blank")
            }
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        )}

        {inLibrary && track.allow_downloads && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 text-blue-400"
            onClick={async () => {
              try {
                const res = await fetch(
                  `/api/music/download?trackId=${track.id}`,
                  { credentials: "include" }
                )
                if (!res.ok) {
                  const body = await res.json()
                  toastApiError(body.error ?? body, "Download failed")
                  return
                }
                const { url } = await res.json()
                if (url) window.open(url, "_blank")
              } catch {
                toast.error("Download failed")
              }
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAddToQueue}>
              <Plus className="mr-2 h-4 w-4" />
              Add to queue
            </DropdownMenuItem>

            {!inLibrary ? (
              <DropdownMenuItem
                onClick={handleAddToLibrary}
                disabled={isLibraryLoading}
              >
                <BookmarkPlus className="mr-2 h-4 w-4" />
                Add to library
              </DropdownMenuItem>
            ) : null}

            {playlists.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Add to playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {playlists.map((pl) => (
                    <DropdownMenuItem
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id)}
                    >
                      {pl.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share to feed
            </DropdownMenuItem>

            {track.artist_id && (
              <DropdownMenuItem
                onClick={() =>
                  window.open(`/artist/${track.artist_id}`, "_blank")
                }
              >
                <User className="mr-2 h-4 w-4" />
                View artist
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                try {
                  const res = await fetch("/api/music/report", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      musicId: track.id,
                      reason: "copyright_infringement",
                    }),
                  })
                  const data = await res.json()
                  if (res.ok) toast.success(typeof data.message === "string" ? data.message : "Report submitted")
                  else toastApiError(data.error ?? data, "Failed to submit report")
                } catch {
                  toast.error("Failed to submit report")
                }
              }}
              className="text-red-400 focus:text-red-400"
            >
              <Flag className="mr-2 h-4 w-4" />
              Report content
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
