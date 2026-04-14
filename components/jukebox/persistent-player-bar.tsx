"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  ChevronUp,
  Music,
  Repeat,
  Repeat1,
  Shuffle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { getTheme } from "@/lib/jukebox/visual-themes"
import { toggleLike } from "@/lib/services/jukebox.service"
import { toast } from "sonner"

export function PersistentPlayerBar() {
  const ctx = useJukeboxOptional()
  const [isLiked, setIsLiked] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  if (!ctx) return null

  const {
    state,
    togglePlayPause,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    setExpanded,
  } = ctx

  if (!state.currentTrack) return null

  const theme = getTheme(state.visualTheme)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progress =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(pct * state.duration)
  }

  async function handleLike() {
    if (!state.currentTrack) return
    const result = await toggleLike(state.currentTrack.id)
    if (result) {
      setIsLiked(result.liked)
      toast.success(result.liked ? "Added to likes" : "Removed from likes")
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 md:bottom-0">
      {/* Progress bar at very top of the bar - thin scrubber */}
      <div
        ref={progressBarRef}
        className="group relative h-1 w-full cursor-pointer bg-white/10 hover:h-2 transition-all touch-none"
        onClick={handleProgressClick}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
          seekTo(pct * state.duration)
        }}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-r-full bg-gradient-to-r", theme.progressGradient)}
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <div className={cn("flex items-center gap-2 backdrop-blur-xl border-t px-3 py-2 sm:px-4 sm:py-2.5 safe-area-pb", theme.barBgClass, theme.barBorderClass)}>
        {/* Track info - left section */}
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left sm:flex-none sm:w-64"
          onClick={() => setExpanded(true)}
        >
          {state.currentTrack.cover_art_url ? (
            <img
              src={state.currentTrack.cover_art_url}
              alt=""
              className="h-10 w-10 rounded-md object-cover flex-shrink-0 sm:h-12 sm:w-12"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-pink-600 sm:h-12 sm:w-12">
              <Music className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {state.currentTrack.title}
            </p>
            <p className="truncate text-xs text-slate-400">
              {state.currentTrack.artist_name}
            </p>
          </div>
        </button>

        {/* Like button (visible on mobile too) */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 flex-shrink-0 sm:hidden"
          onClick={handleLike}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            )}
          />
        </Button>

        {/* Playback controls - center */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 w-8 sm:flex"
            onClick={toggleShuffle}
          >
            <Shuffle
              className={cn(
                "h-3.5 w-3.5",
                state.isShuffled ? "text-purple-400" : "text-slate-400"
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8"
            onClick={prev}
          >
            <SkipBack className="h-4 w-4 text-white" />
          </Button>

          <Button
            onClick={togglePlayPause}
            className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
          >
            {state.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8"
            onClick={next}
          >
            <SkipForward className="h-4 w-4 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 w-8 sm:flex"
            onClick={cycleRepeatMode}
          >
            {state.repeatMode === "one" ? (
              <Repeat1 className="h-3.5 w-3.5 text-purple-400" />
            ) : (
              <Repeat
                className={cn(
                  "h-3.5 w-3.5",
                  state.repeatMode === "all"
                    ? "text-purple-400"
                    : "text-slate-400"
                )}
              />
            )}
          </Button>
        </div>

        {/* Time + Volume - right section (desktop) */}
        <div className="hidden items-center gap-2 sm:flex flex-shrink-0 sm:w-64 justify-end">
          <span className="text-xs text-slate-400 tabular-nums w-20 text-right">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8"
            onClick={handleLike}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
              )}
            />
          </Button>

          <div className="relative flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              {state.isMuted || state.volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
              )}
            </Button>
            <Slider
              value={[state.isMuted ? 0 : state.volume]}
              onValueChange={([v]) => setVolume(v)}
              max={1}
              step={0.01}
              className="w-20"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8"
            onClick={() => setExpanded(true)}
          >
            <ChevronUp className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        {/* Mobile play/pause only (already shown above) + expand */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 flex-shrink-0 sm:hidden"
          onClick={() => setExpanded(true)}
        >
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </Button>
      </div>
    </div>
  )
}
