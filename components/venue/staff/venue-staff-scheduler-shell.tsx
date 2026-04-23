"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { VenueStaffShiftsPanel } from "@/components/venue/staff/venue-staff-shifts-panel"

interface VenueStaffSchedulerShellProps {
  venueId: string
}

function VenueStaffSchedulerInner({ venueId }: VenueStaffSchedulerShellProps) {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("event_id")?.trim() || undefined
  return <VenueStaffShiftsPanel venueId={venueId} eventId={eventId} />
}

export function VenueStaffSchedulerShell({ venueId }: VenueStaffSchedulerShellProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/30 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <VenueStaffSchedulerInner venueId={venueId} />
    </Suspense>
  )
}
