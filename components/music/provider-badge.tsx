"use client"

/**
 * components/music/provider-badge.tsx
 *
 * Reusable provider attribution badge.
 * Shown on Audius-linked tracks in track cards and the import modal.
 * Uses text + icon only — never color-only (accessibility).
 */

import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface ProviderBadgeProps {
  provider: "audius" | "tourify"
  canonicalUrl?: string | null
  className?: string
}

export function ProviderBadge({ provider, canonicalUrl, className }: ProviderBadgeProps) {
  if (provider !== "audius") return null

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-purple-300/50 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300",
        className
      )}
      aria-label="Hosted on Audius"
    >
      {/* Simple "A" mark — replace with official Audius icon SVG if brand assets are available */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
      Audius
      {canonicalUrl && <ExternalLink className="h-2.5 w-2.5 opacity-70" aria-hidden="true" />}
    </span>
  )

  if (canonicalUrl) {
    return (
      <a
        href={canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 rounded-full"
        aria-label="Open on Audius (opens in new tab)"
        onClick={(e) => e.stopPropagation()}
      >
        {badge}
      </a>
    )
  }

  return badge
}
