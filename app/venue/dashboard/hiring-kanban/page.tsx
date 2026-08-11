"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { VenueHiringKanban } from "@/components/hiring/venue-hiring-kanban"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VENUE_PRIMARY_BTN } from "@/components/dashboard/venue-tokens"

function VenueHiringKanbanPageContent() {
  const searchParams = useSearchParams()
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const queryVenueId = searchParams.get("venue_id")?.trim() || ""
  const resolvedVenueId = venue?.id || queryVenueId

  if (venueLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  if (!resolvedVenueId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card className="max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="text-lg">Venue required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p>Select or create a venue profile before reviewing hiring applications.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className={VENUE_PRIMARY_BTN}>
                <Link href="/venue/dashboard/venues">Your venues</Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-700">
                <Link href="/venue/dashboard/jobs">Post a job</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
