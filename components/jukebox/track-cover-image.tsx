"use client"

import { useEffect, useState } from "react"
import { Music } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveJukeboxCoverUrl } from "@/lib/services/jukebox.service"

interface TrackCoverImageProps {
  src?: string | null
  trackId?: string
  alt?: string
  className?: string
  iconClassName?: string
  fallbackClassName?: string
}

export function TrackCoverImage({
  src,
  trackId,
  alt = "",
  className,
  iconClassName,
  fallbackClassName,
}: TrackCoverImageProps) {
  const resolvedSrc = resolveJukeboxCoverUrl(trackId, src) || src || undefined
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [resolvedSrc])

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600",
          className,
          fallbackClassName
        )}
      >
        <Music className={cn("text-white", iconClassName || "h-5 w-5")} />
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={cn("flex-shrink-0 object-cover", className)}
      onError={() => setHasError(true)}
    />
  )
}
