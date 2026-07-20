"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VENUE_PRIMARY_BTN, VENUE_OUTLINE_BTN } from "@/components/dashboard/venue-tokens"

interface VenueEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string } | { label: string; onClick: () => void }
}

export function VenueEmptyState({ icon: Icon, title, description, action }: VenueEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900">
        <Icon className="h-7 w-7 text-zinc-400" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-zinc-200">{title}</h3>
      <p className="mb-5 max-w-sm text-center text-sm text-zinc-500">{description}</p>
      {action ? (
        "href" in action ? (
          <Button asChild size="sm" className={VENUE_PRIMARY_BTN}>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" className={VENUE_PRIMARY_BTN} onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  )
}

export { VENUE_OUTLINE_BTN }
