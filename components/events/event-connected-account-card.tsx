"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, MapPin, Music, ChevronDown, ChevronUp } from "lucide-react"
import { paCard, paInset } from "@/components/public-artist/public-artist-ui"
import { cn } from "@/lib/utils"

export interface ConnectedAccountSocialLinks {
  website?: string
  instagram?: string
  facebook?: string
  twitter?: string
  [key: string]: string | undefined
}

export interface EventConnectedAccountCardProps {
  variant: "artist" | "venue"
  title: string
  displayName: string
  handle?: string | null
  avatarUrl?: string | null
  isVerified?: boolean
  about?: string | null
  tagline?: string | null
  profilePath?: string | null
  addressLine?: string | null
  socialLinks?: ConnectedAccountSocialLinks | null
  className?: string
  compact?: boolean
}

const SOCIAL_LABELS: Record<string, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
}

export function EventConnectedAccountCard({
  variant,
  title,
  displayName,
  handle,
  avatarUrl,
  isVerified,
  about,
  tagline,
  profilePath,
  addressLine,
  socialLinks,
  className,
  compact = false,
}: EventConnectedAccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasAbout = Boolean(about?.trim())
  const hasPath = Boolean(profilePath)
  const socialEntries = Object.entries(socialLinks || {}).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0
  )

  if (!displayName && !hasPath && !hasAbout) return null

  const initials = (displayName || handle || "?").charAt(0).toUpperCase()
  const Icon = variant === "venue" ? MapPin : Music
  const ctaLabel = variant === "venue" ? "View venue" : "View artist"
  const shouldClamp = hasAbout && !isExpanded && (about?.length || 0) > 220

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={cn(paCard, "overflow-hidden transition-shadow hover:shadow-purple-500/10", className)}
    >
      <div className={cn("p-5 sm:p-6 space-y-4", compact && "p-4 space-y-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Icon className={cn("h-4 w-4", variant === "venue" ? "text-red-400" : "text-purple-400")} />
            {title}
          </div>
          {isVerified ? (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-0 text-xs">
              Verified
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Avatar className={cn("h-12 w-12 ring-1 ring-white/10", compact && "h-10 w-10")}>
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback
              className={cn(
                "text-white",
                variant === "venue" ? "bg-red-500/20 text-red-200" : "bg-purple-500/20 text-purple-200"
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {hasPath ? (
              <Link
                href={profilePath!}
                className="font-semibold text-white hover:text-purple-200 transition-colors truncate block"
              >
                {displayName}
              </Link>
            ) : (
              <div className="font-semibold text-white truncate">{displayName}</div>
            )}
            {handle ? <div className="text-sm text-white/50 truncate">@{handle}</div> : null}
            {addressLine ? (
              <div className="text-sm text-white/55 mt-0.5 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400/80" />
                <span className="line-clamp-2">{addressLine}</span>
              </div>
            ) : null}
          </div>
        </div>

        {tagline && !hasAbout ? (
          <p className="text-sm text-white/70 leading-relaxed">{tagline}</p>
        ) : null}

        {hasAbout ? (
          <div className={cn(paInset, "p-4")}>
            <p
              className={cn(
                "text-sm leading-relaxed text-white/80",
                shouldClamp && "line-clamp-4"
              )}
            >
              {about}
            </p>
            {(about?.length || 0) > 220 ? (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-purple-200"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {socialEntries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {socialEntries.slice(0, 4).map(([key, value]) => (
              <Button
                key={key}
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <a href={value} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {SOCIAL_LABELS[key] || key}
                </a>
              </Button>
            ))}
          </div>
        ) : null}

        {hasPath ? (
          <Button
            asChild
            className="w-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
          >
            <Link href={profilePath!}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {ctaLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </motion.div>
  )
}
