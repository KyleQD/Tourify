"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { VenuePageHeader } from "@/components/dashboard/venue-page-header"
import { VenuePageSkeleton } from "@/components/dashboard/venue-page-skeleton"
import { VENUE_CARD, VENUE_PRIMARY_BTN, VENUE_SECTION_LABEL } from "@/components/dashboard/venue-tokens"
import { buildVenueActionItems, type VenueActionItem } from "@/lib/venue/build-action-items"
import { venueService } from "@/lib/services/venue.service"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Package,
  UserCircle,
  Users,
} from "lucide-react"

const TOTAL_CHECKLIST_STEPS = 8

const priorityStyles: Record<VenueActionItem["priority"], string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  low: "border-zinc-600 bg-zinc-800 text-zinc-300",
}

const typeIcons: Record<VenueActionItem["type"], typeof ListChecks> = {
  profile: UserCircle,
  booking: ClipboardList,
  event: CalendarDays,
  staff: Users,
  documents: FileText,
  equipment: Package,
}

export default function VenueOnboardingPage() {
  const { venue, stats, isLoading, error } = useCurrentVenue()
  const [documentCount, setDocumentCount] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [hasSiteMap, setHasSiteMap] = useState<boolean | undefined>(undefined)
  const [isCountsLoading, setIsCountsLoading] = useState(true)

  useEffect(() => {
    if (!venue?.id) {
      setIsCountsLoading(false)
      return
    }

    let cancelled = false

    async function loadCounts() {
      setIsCountsLoading(true)
      try {
        const [documents, equipment, mapsRes] = await Promise.all([
          venueService.getVenueDocuments(venue.id),
          venueService.getVenueEquipment(venue.id),
          fetch("/api/site-maps/shared", { credentials: "include", cache: "no-store" }),
        ])
        if (cancelled) return
        setDocumentCount(documents.length)
        setEquipmentCount(equipment.length)
        if (mapsRes.ok) {
          const mapsJson = await mapsRes.json()
          const maps = Array.isArray(mapsJson?.data) ? mapsJson.data : []
          setHasSiteMap(maps.length > 0)
        } else {
          setHasSiteMap(undefined)
        }
      } catch {
        if (!cancelled) {
          setDocumentCount(0)
          setEquipmentCount(0)
          setHasSiteMap(undefined)
        }
      } finally {
        if (!cancelled) setIsCountsLoading(false)
      }
    }

    void loadCounts()
    return () => {
      cancelled = true
    }
  }, [venue?.id])

  if (isLoading || isCountsLoading) return <VenuePageSkeleton />

  if (error || !venue) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Card className="max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Venue Not Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-400">
            <p>{error || "We could not load a venue profile for this account."}</p>
            <Button asChild className={VENUE_PRIMARY_BTN}>
              <Link href="/venue/settings">Open Venue Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const actionItems = buildVenueActionItems({
    venue: {
      name: venue.name,
      capacity: venue.capacity,
      location: venue.location,
      description: venue.description,
      avatar: venue.avatar,
    },
    pendingBookings: stats?.pendingRequests ?? 0,
    upcomingEvents: stats?.upcomingEvents ?? 0,
    openApplications: 0,
    documentCount,
    equipmentCount,
    hasSiteMap,
  })

  const completedSteps = TOTAL_CHECKLIST_STEPS - actionItems.length
  const progressPercent = Math.round((completedSteps / TOTAL_CHECKLIST_STEPS) * 100)
  const isComplete = actionItems.length === 0

  return (
    <div className="space-y-6 pb-12">
      <VenuePageHeader
        title="Venue setup checklist"
        subtitle={`Get ${venue.name} ready for bookings, events, and day-of operations.`}
        icon={ListChecks}
        actions={
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <Link href="/venue/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <section className={VENUE_CARD + " p-5"}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className={VENUE_SECTION_LABEL}>Setup progress</p>
          <Badge variant="outline" className="border-zinc-700 text-zinc-300">
            {completedSteps} of {TOTAL_CHECKLIST_STEPS} complete
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2 bg-zinc-800" />
        <p className="mt-2 text-sm text-zinc-400">
          {isComplete
            ? "Your venue checklist is complete. You can still review operations from the dashboard."
            : `${actionItems.length} task${actionItems.length === 1 ? "" : "s"} remaining to finish core setup.`}
        </p>
      </section>

      {isComplete ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 text-zinc-100">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <div>
              <p className="text-lg font-medium text-zinc-100">All set for now</p>
              <p className="mt-1 text-sm text-zinc-400">
                Core venue setup tasks are done. Head to the dashboard to manage bookings and events.
              </p>
            </div>
            <Button asChild className={VENUE_PRIMARY_BTN}>
              <Link href="/venue/dashboard">
                Open dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {actionItems.map((item) => {
            const Icon = typeIcons[item.type]
            return (
              <li key={item.id} className={VENUE_CARD + " p-4"}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 rounded-md border border-zinc-700 bg-zinc-950 p-2 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                        <Badge variant="outline" className={priorityStyles[item.priority]}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Suggested by {format(item.dueDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {item.href ? (
                    <Button asChild size="sm" className={VENUE_PRIMARY_BTN + " shrink-0"}>
                      <Link href={item.href}>
                        Complete
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
