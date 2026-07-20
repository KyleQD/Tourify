"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useCurrentVenue } from "@/hooks/use-venue"
import { Loader2 } from "lucide-react"
import { VenueHiringKanban } from "@/components/hiring/venue-hiring-kanban"

function VenueHiringKanbanPageContent() {
  const searchParams = useSearchParams()
  const { venue, loading: venueLoading } = useCurrentVenue()
  const queryVenueId = searchParams.get("venue_id")?.trim() || ""
  const resolvedVenueId = venue?.id || queryVenueId

  if (venueLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  return (
    <VenueHiringKanban
      venueId={resolvedVenueId}
      venueName={venue?.name}
      showHeader
    />
  )
}

export default function VenueHiringKanbanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <VenueHiringKanbanPageContent />
    </Suspense>
  )
}
