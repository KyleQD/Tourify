"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart, BookmarkPlus, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  toggleLike,
  addTrackToLibrary,
} from "@/lib/services/jukebox.service"
import {
  ensureSocialStatus,
  prefetchSocialStatus,
  setCachedSocialStatus,
  subscribeSocialStatus,
  getCachedSocialStatus,
} from "@/lib/jukebox/track-social-cache"
import { toast } from "sonner"

interface UseTrackSocialStateArgs {
  trackId: string | undefined
  initialInLibrary?: boolean
  initialLiked?: boolean
}

export function useTrackSocialState({
  trackId,
  initialInLibrary = false,
  initialLiked = false,
}: UseTrackSocialStateArgs) {
  const cached = trackId ? getCachedSocialStatus(trackId) : undefined
  const [isLiked, setIsLiked] = useState(cached?.liked ?? initialLiked)
  const [inLibrary, setInLibrary] = useState(
    cached?.inLibrary ?? initialInLibrary
  )
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)

  useEffect(() => {
    if (!trackId) {
      setIsLiked(false)
      setInLibrary(false)
      return
    }

    if (initialInLibrary || initialLiked) {
      setCachedSocialStatus(trackId, {
        liked: initialLiked || cached?.liked || false,
        inLibrary: initialInLibrary || cached?.inLibrary || false,
      })
    }

    const unsubscribe = subscribeSocialStatus(trackId, (status) => {
      setIsLiked(status.liked)
      setInLibrary(status.inLibrary)
    })

    prefetchSocialStatus([trackId])
    void ensureSocialStatus(trackId)

    return unsubscribe
  }, [trackId, initialInLibrary, initialLiked])

  const handleLike = useCallback(async () => {
    if (!trackId || isLikeLoading) return
    setIsLikeLoading(true)
    const result = await toggleLike(trackId)
    if (result) {
      setCachedSocialStatus(trackId, { liked: result.liked })
      toast.success(result.liked ? "Added to likes" : "Removed from likes")
    } else {
      toast.error("Failed to update like")
    }
    setIsLikeLoading(false)
  }, [trackId, isLikeLoading])

  const handleAddToLibrary = useCallback(async () => {
    if (!trackId || isLibraryLoading || inLibrary) return
    setIsLibraryLoading(true)
    const result = await addTrackToLibrary(trackId)
    if (result.ok) {
      setCachedSocialStatus(trackId, { inLibrary: true })
      toast.success("Added to your library")
    } else {
      toast.error(
        typeof result.message === "string"
          ? result.message
          : "Failed to add to library"
      )
    }
    setIsLibraryLoading(false)
  }, [trackId, isLibraryLoading, inLibrary])

  return {
    isLiked,
    inLibrary,
    isLikeLoading,
    isLibraryLoading,
    handleLike,
    handleAddToLibrary,
  }
}

interface PlayerSocialActionsProps {
  trackId: string | undefined
  initialInLibrary?: boolean
  initialLiked?: boolean
  size?: "sm" | "md"
  className?: string
  showLabels?: boolean
}

export function PlayerSocialActions({
  trackId,
  initialInLibrary = false,
  initialLiked = false,
  size = "sm",
  className,
  showLabels = false,
}: PlayerSocialActionsProps) {
  const {
    isLiked,
    inLibrary,
    isLikeLoading,
    isLibraryLoading,
    handleLike,
    handleAddToLibrary,
  } = useTrackSocialState({ trackId, initialInLibrary, initialLiked })

  const buttonSize = size === "md" ? "h-10 w-10" : "h-9 w-9"
  const iconSize = "h-4 w-4"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(buttonSize, showLabels && "w-auto gap-1.5 px-2")}
        onClick={handleLike}
        disabled={!trackId || isLikeLoading}
        aria-label={isLiked ? "Unlike track" : "Like track"}
      >
        <Heart
          className={cn(
            iconSize,
            isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
          )}
        />
        {showLabels ? (
          <span className="text-xs text-slate-400">
            {isLiked ? "Liked" : "Like"}
          </span>
        ) : null}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(buttonSize, showLabels && "w-auto gap-1.5 px-2")}
        onClick={handleAddToLibrary}
        disabled={!trackId || isLibraryLoading || inLibrary}
        aria-label={inLibrary ? "In library" : "Add to library"}
      >
        {inLibrary ? (
          <BookmarkCheck className={cn(iconSize, "text-purple-400")} />
        ) : (
          <BookmarkPlus className={cn(iconSize, "text-slate-400")} />
        )}
        {showLabels ? (
          <span className="text-xs text-slate-400">
            {inLibrary ? "Saved" : "Library"}
          </span>
        ) : null}
      </Button>
    </div>
  )
}
