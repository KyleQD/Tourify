"use client"

import { motion } from "framer-motion"
import type { ArtVariant } from "@/lib/jukebox/visual-themes"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"

interface AlbumArtVisualProps {
  coverUrl?: string | null
  trackId?: string
  variant: ArtVariant
  isPlaying: boolean
  size?: "sm" | "lg"
}

const sizeClasses = {
  sm: "h-52 w-52 sm:h-64 sm:w-64",
  lg: "h-52 w-52 sm:h-64 sm:w-64",
}

export function AlbumArtVisual({
  coverUrl,
  trackId,
  variant,
  isPlaying,
  size = "lg",
}: AlbumArtVisualProps) {
  const artContent = (
    <TrackCoverImage
      src={coverUrl}
      trackId={trackId}
      className="h-full w-full"
      iconClassName="h-16 w-16 text-white/60"
      fallbackClassName="from-purple-600 via-pink-600 to-orange-500"
    />
  )

  const baseClass = `${sizeClasses[size]} rounded-2xl overflow-hidden shadow-2xl`

  if (variant === "spin") {
    return (
      <motion.div
        className={`${baseClass} rounded-full`}
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? {
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        } : { duration: 0.5 }}
        style={{ willChange: "transform" }}
      >
        <div className="relative h-full w-full">
          {artContent}
          <div className="absolute inset-0 rounded-full" style={{
            background: "repeating-radial-gradient(circle, transparent, transparent 30%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.15) 31%)",
          }} />
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white/20" />
        </div>
      </motion.div>
    )
  }

  if (variant === "pulse") {
    return (
      <motion.div
        className={baseClass}
        animate={isPlaying ? {
          scale: [1, 1.03, 1],
          boxShadow: [
            "0 25px 50px -12px rgba(168,85,247,0.2)",
            "0 25px 50px -12px rgba(168,85,247,0.4)",
            "0 25px 50px -12px rgba(168,85,247,0.2)",
          ],
        } : { scale: 1 }}
        transition={isPlaying ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        } : {}}
      >
        {artContent}
      </motion.div>
    )
  }

  if (variant === "float") {
    return (
      <motion.div
        className={baseClass}
        animate={isPlaying ? {
          y: [0, -8, 0, 4, 0],
          rotate: [0, 1, 0, -1, 0],
        } : { y: 0, rotate: 0 }}
        transition={isPlaying ? {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        } : { duration: 0.5 }}
      >
        {artContent}
      </motion.div>
    )
  }

  if (variant === "glitch") {
    return (
      <motion.div
        className={baseClass}
        animate={isPlaying ? {
          opacity: [1, 1, 0.85, 1, 1, 0.9, 1],
          x: [0, 0, -2, 0, 2, 0, 0],
          skewX: [0, 0, -1, 0, 1, 0, 0],
        } : {}}
        transition={isPlaying ? {
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.4, 0.42, 0.44, 0.7, 0.72, 1],
        } : {}}
      >
        {artContent}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 mix-blend-screen"
            animate={{
              opacity: [0, 0, 0.15, 0, 0],
              backgroundPosition: ["0% 0%", "0% 0%", "50% 0%", "0% 0%", "0% 0%"],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              times: [0, 0.4, 0.42, 0.44, 1],
            }}
            style={{
              background: "linear-gradient(90deg, rgba(255,0,110,0.3) 33%, rgba(0,255,110,0.3) 66%, rgba(0,110,255,0.3) 100%)",
              backgroundSize: "300% 100%",
            }}
          />
        )}
      </motion.div>
    )
  }

  if (variant === "bounce") {
    return (
      <motion.div
        className={baseClass}
        animate={isPlaying ? {
          scale: [1, 1.06, 0.98, 1.04, 1],
          rotate: [0, -0.5, 0.5, -0.3, 0],
        } : { scale: 1, rotate: 0 }}
        transition={isPlaying ? {
          duration: 0.8,
          repeat: Infinity,
          ease: "easeOut",
        } : { duration: 0.3 }}
        style={{
          boxShadow: isPlaying
            ? "0 0 40px rgba(255,45,85,0.3), 0 0 80px rgba(34,211,238,0.15)"
            : "0 25px 50px -12px rgba(0,0,0,0.3)",
        }}
      >
        {artContent}
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: "2px solid rgba(255,45,85,0.3)",
              boxShadow: "inset 0 0 20px rgba(255,45,85,0.1), 0 0 15px rgba(255,45,85,0.2)",
            }}
          />
        )}
      </motion.div>
    )
  }

  return (
    <div className={`${baseClass} shadow-purple-500/20`}>
      {artContent}
    </div>
  )
}
