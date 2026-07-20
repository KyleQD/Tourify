"use client"

import { motion } from "framer-motion"
import { BadgeCheck, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import type { DiscoverProfile } from "@/lib/discover/types"

export function DiscoverVenueCard({
  venue,
  onOpen,
}: {
  venue: DiscoverProfile
  onOpen: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-[240px] flex-shrink-0"
    >
      <SurfaceCard
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onOpen()
          }
        }}
        className="h-full cursor-pointer overflow-hidden border-white/10 bg-slate-900/50 transition hover:border-white/25"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-white/10">
              <AvatarImage src={venue.avatar_url || ""} alt={venue.display_name} />
              <AvatarFallback>{venue.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-semibold text-slate-100">
                <span className="truncate">{venue.display_name}</span>
                {venue.verified ? (
                  <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                ) : null}
              </p>
              <p className="truncate text-xs text-slate-400">@{venue.username}</p>
            </div>
          </div>

          {venue.location ? (
            <p className="flex items-start gap-1.5 text-xs text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-2">{venue.location}</span>
            </p>
          ) : null}

          {venue.bio ? (
            <p className="line-clamp-2 text-xs text-slate-500">{venue.bio}</p>
          ) : null}
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
