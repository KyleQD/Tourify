"use client"

import type { LucideIcon } from "lucide-react"
import { VENUE_ICON_WELL, VENUE_MUTED, VENUE_TITLE } from "@/components/dashboard/venue-tokens"

interface VenuePageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: LucideIcon
}

export function VenuePageHeader({ title, subtitle, actions, icon: Icon }: VenuePageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={VENUE_ICON_WELL}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <h1 className={`text-2xl sm:text-3xl ${VENUE_TITLE}`}>{title}</h1>
          {subtitle ? <p className={`${VENUE_MUTED} mt-0.5`}>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
