"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
  Repeat,
  Repeat1,
  Shuffle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { getTheme } from "@/lib/jukebox/visual-themes"
import { PlayerSocialActions } from "@/components/jukebox/player-actions"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"

export function PersistentPlayerBar() {
  const ctx = useJukeboxOptional()
  const progressBarRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const isVisible = Boolean(
    ctx?.state.isPlayerChromeVisible && ctx?.state.currentTrack
  )

  useEffect(() => {
    if (!isVisible) {
      document.documentElement.style.setProperty("--player-height", "0px")
      return
    }

    const el = barRef.current
    if (!el) return

    function updateHeight() {
      if (!barRef.current) return
      const height = barRef.current.getBoundingClientRect().height
      document.documentElement.style.setProperty(
        "--player-height",
        `${Math.ceil(height)}px`
      )
    }

    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty("--player-height", "0px")
    }
  }, [isVisible])

  if (!ctx || !isVisible || !ctx.state.currentTrack) return null

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
    dismissPlayer,
  } = ctx

  const currentTrack = state.currentTrack!
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

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-16 z-40 md:bottom-0">
      <div
        ref={progressBarRef}
        className="group relative h-1 w-full cursor-pointer bg-white/10 hover:h-2 transition-all touch-none"
        onClick={handleProgressClick}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = Math.max(
            0,
            Math.min(1, (touch.clientX - rect.left) / rect.width)
          )
          seekTo(pct * state.duration)
        }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-r-full bg-gradient-to-r",
            theme.progressGradient
          )}
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <div
        className={cn(
          "flex items-center gap-2 backdrop-blur-xl border-t px-3 py-2 sm:px-4 sm:py-2.5 safe-area-pb",
          theme.barBgClass,
          theme.barBorderClass
        )}
      >
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left sm:flex-none sm:w-56 lg:w-64"
          onClick={() => setExpanded(true)}
        >
          <TrackCoverImage
            src={currentTrack.cover_art_url}
            trackId={currentTrack.id}
            className="h-10 w-10 rounded-md sm:h-12 sm:w-12"
            iconClassName="h-5 w-5"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {currentTrack.title}
            </p>
            <p className="truncate text-xs text-slate-400">
              {currentTrack.artist_name}
            </p>
          </div>
        </button>

        <div className="flex-shrink-0 sm:hidden">
          <PlayerSocialActions
            trackId={currentTrack.id}
            initialInLibrary={currentTrack.in_library}
          />
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 w-9 sm:flex"
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={state.isShuffled}
          >
            <Shuffle
              className={cn(
                "h-4 w-4",
                state.isShuffled ? "text-purple-400" : "text-slate-400"
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9"
            onClick={prev}
            aria-label="Previous track"
          >
            <SkipBack className="h-4 w-4 text-white" />
          </Button>

          <Button
            onClick={togglePlayPause}
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9"
            onClick={next}
            aria-label="Next track"
          >
            <SkipForward className="h-4 w-4 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 w-9 sm:flex"
            onClick={cycleRepeatMode}
            aria-label="Repeat"
          >
            {state.repeatMode === "one" ? (
              <Repeat1 className="h-4 w-4 text-purple-400" />
            ) : (
              <Repeat
                className={cn(
                  "h-4 w-4",
                  state.repeatMode === "all"
                    ? "text-purple-400"
                    : "text-slate-400"
                )}
              />
            )}
          </Button>
        </div>

        <div className="hidden items-center gap-2 sm:flex flex-shrink-0 sm:w-72 lg:w-80 justify-end">
          <span className="text-xs text-slate-400 tabular-nums w-20 text-right">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <PlayerSocialActions
            trackId={currentTrack.id}
            initialInLibrary={currentTrack.in_library}
          />

          <div className="relative flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9"
              onClick={toggleMute}
              aria-label={state.isMuted ? "Unmute" : "Mute"}
            >
              {state.isMuted || state.volume === 0 ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-slate-400" />
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
            className="h-9 w-9"
            onClick={() => setExpanded(true)}
            aria-label="Expand player"
          >
            <ChevronUp className="h-4 w-4 text-slate-400" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9"
            onClick={dismissPlayer}
            aria-label="Close player"
          >
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 flex-shrink-0 sm:hidden"
          onClick={() => setExpanded(true)}
          aria-label="Expand player"
        >
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 flex-shrink-0 sm:hidden"
          onClick={dismissPlayer}
          aria-label="Close player"
        >
          <X className="h-4 w-4 text-slate-400" />
        </Button>
      </div>
    </div>
  )
}
