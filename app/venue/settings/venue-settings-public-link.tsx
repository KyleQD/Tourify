"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { getVenuePublicProfilePath } from "@/lib/utils/public-profile-routes"

export function VenueSettingsPublicLink() {
  const { venue, isLoading } = useCurrentVenue()
  if (isLoading || !venue?.id) return null

  const href = getVenuePublicProfilePath({
    id: venue.id,
    url_slug: venue.url_slug || venue.username || null,
  })
  if (!href) return null

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">Public venue page</p>
        <p className="text-xs text-zinc-400">Preview how artists and organizers see your venue.</p>
      </div>
      <Button asChild size="sm" variant="outline" className="border-zinc-700">
        <Link href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open public page
        </Link>
      </Button>
    </div>
  )
}
