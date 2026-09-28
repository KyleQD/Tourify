"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MapPin,
  RefreshCw,
  Route,
  UserCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringEventCoverage, HiringJobOverviewItem, HiringOverviewData } from "@/types/hiring-dashboard"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"
import { JobPostingLifecycleActions } from "./job-posting-lifecycle-actions"

interface HiringOverviewPanelProps {
  employer: HiringEntity
}

interface OperationsEvent {
  id: string
  name?: string | null
  title?: string | null
  start_at?: string | null
  event_date?: string | null
  venue_name?: string | null
  location?: string | null
  readiness?: { status?: string | null; score?: number | null } | null
}

interface OperationsTour {
  id: string
  name?: string | null
  title?: string | null
  start_date?: string | null
  startDate?: string | null
  end_date?: string | null
  endDate?: string | null
  status?: string | null
  total_shows?: number | null
  totalShows?: number | null
  readiness?: { status?: string | null; score?: number | null } | null
  events?: Array<{ id?: string | null }> | null
}

interface OperationsState {
  events: OperationsEvent[]
  tours: OperationsTour[]
  coverage: HiringEventCoverage[]
  isLoading: boolean
  error: string | null
}

const EMPTY_OVERVIEW: HiringOverviewData = {
  actionCounts: {
    newApplications: 0,
    onboardingAwaitingApproval: 0,
    readyToAssign: 0,
    openRoles: 0,
  },
  currentJobs: [],
  archivedJobs: [],
  readyToAssignWorkers: [],
  recentActivity: [],
  freshAt: "",
}

function getReadinessLabel(readiness?: OperationsEvent["readiness"]): string {
  return readiness?.status ? normalizeStatusLabel(readiness.status) : "Not assessed"
}

function getEventDate(event: OperationsEvent): string | null {
  return event.start_at ?? event.event_date ?? null
}

function getTourStart(tour: OperationsTour): string | null {
  return tour.start_date ?? tour.startDate ?? null
}

function getTourEnd(tour: OperationsTour): string | null {
  return tour.end_date ?? tour.endDate ?? null
}

export function HiringOverviewPanel({ employer }: HiringOverviewPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const { data, isLoading, error, refetch } = useHiringDashboardFetch<HiringOverviewData>({
    url: `/api/hiring/dashboard?${queryString}&view=overview`,
    initialData: EMPTY_OVERVIEW,
    refreshIntervalMs: 30_000,
    refreshOnFocus: true,
  })
  const [operations, setOperations] = useState<OperationsState>({
    events: [],
    tours: [],
    coverage: [],
    isLoading: true,
    error: null,
  })

  const loadOperations = useCallback(async (signal?: AbortSignal) => {
    if (!isActingReady) return
    setOperations((current) => ({ ...current, isLoading: true, error: null }))

    const requestInit: RequestInit = {
      credentials: "include",
      cache: "no-store",
      headers: actingHeaders,
      signal,
    }
    const [eventsResult, toursResult, staffingResult] = await Promise.allSettled([
      fetch("/api/admin/events?sort=start_at&order=asc&limit=20", requestInit),
      fetch("/api/admin/tours?sort=start_date&order=asc&limit=20", requestInit),
      fetch("/api/admin/staff-operations/summary", requestInit),
    ])

    if (signal?.aborted) return

    let partialError = false
    let events: OperationsEvent[] = []
    let tours: OperationsTour[] = []
    let coverage: HiringEventCoverage[] = []

    if (eventsResult.status === "fulfilled" && eventsResult.value.ok) {
      const payload = await eventsResult.value.json().catch(() => ({}))
      events = Array.isArray(payload.events) ? payload.events : Array.isArray(payload.items) ? payload.items : []
    } else {
      partialError = true
    }

    if (toursResult.status === "fulfilled" && toursResult.value.ok) {
      const payload = await toursResult.value.json().catch(() => ({}))
      tours = Array.isArray(payload.tours) ? payload.tours : Array.isArray(payload.items) ? payload.items : []
    } else {
      partialError = true
    }

    if (staffingResult.status === "fulfilled" && staffingResult.value.ok) {
      const payload = await staffingResult.value.json().catch(() => ({}))
      coverage = Array.isArray(payload.eventCoverage) ? payload.eventCoverage : []
    } else {
      partialError = true
    }

    const now = Date.now()
    const upcomingEvents = events
      .filter((event) => {
        const value = getEventDate(event)
        if (!value) return false
        const timestamp = new Date(value).getTime()
        return Number.isFinite(timestamp) && timestamp >= now
      })
      .slice(0, 5)
    const currentTours = tours
      .filter((tour) => {
        if (String(tour.status ?? "").toLowerCase() === "archived") return false
        const end = getTourEnd(tour)
        return !end || new Date(end).getTime() >= now
      })
      .slice(0, 3)

    setOperations({
      events: upcomingEvents,
      tours: currentTours,
      coverage,
      isLoading: false,
      error: partialError ? "Some event, tour, or staffing details could not be loaded." : null,
    })
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    const controller = new AbortController()
    void loadOperations(controller.signal)
    return () => controller.abort()
  }, [actingContextKey, loadOperations])

  useEffect(() => {
    if (!isActingReady) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOperations()
    }, 30_000)
    const refresh = () => {
      if (document.visibilityState === "visible") void loadOperations()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [isActingReady, loadOperations])

  const coverageByEvent = useMemo(
    () => new Map(operations.coverage.map((item) => [item.eventId, item])),
    [operations.coverage]
  )
  const eventNamesById = useMemo(
    () => new Map(operations.events.map((event) => [event.id, event.name ?? event.title ?? "Linked event"])),
    [operations.events]
  )
  const tourNamesById = useMemo(
    () => new Map(operations.tours.map((tour) => [tour.id, tour.name ?? tour.title ?? "Linked tour"])),
    [operations.tours]
  )

  async function refreshAll() {
    await Promise.all([refetch(), loadOperations()])
  }

  if (error) {
    return (
      <WorkforcePanel className="border-destructive/30 p-6">
        <CardHeader>
          <CardTitle>Unable to load hiring overview</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
        </CardContent>
      </WorkforcePanel>
    )
  }

  const actionCards = [
    {
      label: "New applications",
      value: data.actionCounts.newApplications,
      description: "Waiting for review",
      href: `/admin/dashboard/hiring?tab=applications&${queryString}`,
      icon: ClipboardCheck,
      tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
    },
    {
      label: "Onboarding review",
      value: data.actionCounts.onboardingAwaitingApproval,
      description: "Submitted for approval",
      href: `/admin/dashboard/hiring?tab=onboarding&${queryString}`,
      icon: UserCheck,
      tone: "text-purple-300 bg-purple-500/10 border-purple-500/25",
    },
    {
      label: "Ready to assign",
      value: data.actionCounts.readyToAssign,
      description: "Active without a future shift",
      href: `/admin/dashboard/hiring?tab=roster&${queryString}`,
      icon: Users,
      tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      label: "Open roles",
      value: data.actionCounts.openRoles,
      description: "Positions still to fill",
      href: `/admin/dashboard/hiring?tab=jobs&${queryString}`,
      icon: BriefcaseBusiness,
      tone: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Hiring command center</h2>
          <p className="text-sm text-slate-400">Review candidates, fill roles, and move approved people into live work.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshAll()} disabled={isLoading || operations.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || operations.isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {actionCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.tone}`}><Icon className="h-4 w-4" /></span>
                <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{card.value}</p>
              <p className="text-sm font-medium text-slate-200">{card.label}</p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <JobSection title="Current job listings" description="Open, draft, paused, closed, and filled roles for this hiring account." jobs={data.currentJobs.slice(0, 6)} queryString={queryString} emptyLabel="No current job postings" eventNamesById={eventNamesById} tourNamesById={tourNamesById} />

        <WorkforcePanel>
          <CardHeader>
            <CardTitle className="text-white">Recent activity</CardTitle>
            <CardDescription>Select an item to continue the work.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No hiring activity has been recorded yet.</p> : (
              <div className="space-y-2">
                {data.recentActivity.slice(0, 8).map((activity) => {
                  const content = (
                    <div className="group flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 transition hover:border-cyan-400/25 hover:bg-white/[0.055]">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{activity.action}</p>
                        {activity.description ? <p className="mt-0.5 text-xs text-slate-400">{activity.description}</p> : null}
                        <p className="mt-1 text-[11px] text-slate-500">{formatDashboardDate(activity.createdAt)}</p>
                      </div>
                      {activity.target ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 group-hover:text-cyan-300" /> : null}
                    </div>
                  )
                  return activity.target ? (
                    <Link key={activity.id} href={activity.target.href} aria-label={`${activity.target.actionLabel}: ${activity.action}`}>{content}</Link>
                  ) : <div key={activity.id}>{content}</div>
                })}
              </div>
            )}
          </CardContent>
        </WorkforcePanel>
      </div>

      <JobSection title="Archived job postings" description="Applicant history remains available after a listing is removed." jobs={data.archivedJobs.slice(0, 5)} queryString={queryString} emptyLabel="No archived postings" archived eventNamesById={eventNamesById} tourNamesById={tourNamesById} />

      <WorkforcePanel>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Upcoming staffing needs</CardTitle>
            <CardDescription>Nearest events and tours, joined with real shift coverage and open hiring roles.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/admin/dashboard/events">View events</Link></Button>
            <Button variant="outline" size="sm" asChild><Link href="/admin/dashboard/tours">View tours</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {operations.error ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-sm text-amber-200">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{operations.error}</span>
              <Button variant="ghost" size="sm" onClick={() => void loadOperations()}>Retry</Button>
            </div>
          ) : null}
          {operations.isLoading && operations.events.length === 0 && operations.tours.length === 0 ? <p className="text-sm text-slate-400">Loading upcoming staffing needs…</p> : null}
          {!operations.isLoading && operations.events.length === 0 && operations.tours.length === 0 ? (
            <WorkforceEmptyState icon={CalendarDays} title="No upcoming events or tours" description="Upcoming operational work will appear here as events and tours are scheduled." />
          ) : null}
          {operations.events.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Events</h3>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {operations.events.map((event) => {
                  const coverage = coverageByEvent.get(event.id)
                  const linkedRoles = data.currentJobs.filter((job) => job.eventId === event.id && job.remainingPositions > 0)
                  return (
                    <Link key={event.id} href={`/admin/dashboard/events/${event.id}?tab=staff`} className="group rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-400/30 hover:bg-white/[0.065]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{event.name ?? event.title ?? "Untitled event"}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDashboardDate(getEventDate(event))}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{event.venue_name ?? event.location ?? "Venue not set"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-300" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{getReadinessLabel(event.readiness)}</Badge>
                        <Badge className={coverage?.openShifts ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>{coverage ? `${coverage.filledShifts} filled · ${coverage.openShifts} open` : "No shifts"}</Badge>
                        {linkedRoles.length ? <Badge className="bg-purple-500/15 text-purple-300">{linkedRoles.length} open role{linkedRoles.length === 1 ? "" : "s"}</Badge> : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
          {operations.tours.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Tours</h3>
              <div className="grid gap-3 lg:grid-cols-3">
                {operations.tours.map((tour) => {
                  const eventIds = (tour.events ?? []).map((event) => event.id).filter((id): id is string => Boolean(id))
                  const coverages = eventIds.map((id) => coverageByEvent.get(id)).filter((item): item is HiringEventCoverage => Boolean(item))
                  const openShifts = coverages.reduce((sum, item) => sum + item.openShifts, 0)
                  const filledShifts = coverages.reduce((sum, item) => sum + item.filledShifts, 0)
                  const linkedRoles = data.currentJobs.filter((job) => job.tourId === tour.id && job.remainingPositions > 0)
                  return (
                    <Link key={tour.id} href={`/admin/dashboard/tours/${tour.id}`} className="group rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-purple-400/30 hover:bg-white/[0.065]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{tour.name ?? tour.title ?? "Untitled tour"}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Route className="h-3.5 w-3.5" />{formatDashboardDate(getTourStart(tour))} · {tour.total_shows ?? tour.totalShows ?? eventIds.length} events</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-purple-300" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{getReadinessLabel(tour.readiness)}</Badge>
                        <Badge className={openShifts ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>{filledShifts} filled · {openShifts} open</Badge>
                        {linkedRoles.length ? <Badge className="bg-purple-500/15 text-purple-300">{linkedRoles.length} open role{linkedRoles.length === 1 ? "" : "s"}</Badge> : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </WorkforcePanel>
    </div>
  )
}

function JobSection({ title, description, jobs, queryString, emptyLabel, archived = false, eventNamesById, tourNamesById }: {
  title: string
  description: string
  jobs: HiringJobOverviewItem[]
  queryString: string
  emptyLabel: string
  archived?: boolean
  eventNamesById: Map<string, string>
  tourNamesById: Map<string, string>
}) {
  return (
    <WorkforcePanel>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            {archived ? <Archive className="h-5 w-5 text-slate-400" /> : <BriefcaseBusiness className="h-5 w-5 text-cyan-300" />}{title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {!archived ? <Button size="sm" asChild><Link href={`/admin/dashboard/jobs/new?${queryString}`}>Create job</Link></Button> : null}
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? <p className="text-sm text-slate-400">{emptyLabel}</p> : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            {jobs.map((job) => {
              const positions = job.numberOfPositions ?? 1
              return (
                <div key={job.id} className="border-b border-white/10 p-4 last:border-0">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">{job.title}</h3>
                        <Badge variant="outline">{normalizeStatusLabel(job.status)}</Badge>
                        {job.hasVacancy ? <Badge className="bg-amber-500/15 text-amber-300"><AlertTriangle className="mr-1 h-3 w-3" />Vacancy</Badge> : null}
                      </div>
                      <p className="text-sm text-slate-400">{[job.department, job.position].filter(Boolean).join(" • ") || "Department not set"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{job.totalApplicants} applicants</span><span>{job.pendingApplicants} new</span><span>{job.activeHires}/{positions} active hires</span><span>{job.remainingPositions} remaining</span>
                        {archived ? <span>{job.approvedApplicants} approved</span> : null}
                        {job.eventId ? <span>Event: {job.linkedEvent?.title ?? eventNamesById.get(job.eventId) ?? "Linked event"}</span> : null}
                        {job.tourId ? <span>Tour: {job.linkedTour?.name ?? tourNamesById.get(job.tourId) ?? "Linked tour"}</span> : null}
                        {archived ? <span>Archived {formatDashboardDate(job.archivedAt)}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild><Link href={`/admin/dashboard/applications?job_id=${job.id}&${queryString}`}>View applicants</Link></Button>
                      {job.hasVacancy ? <JobPostingLifecycleActions jobId={job.id} title={job.title} status={job.status ?? "filled"} queryString={queryString} hasVacancy /> : null}
                      <Button variant="outline" size="sm" asChild><Link href={`/admin/dashboard/jobs/${job.id}?${queryString}`}>{archived ? "View history" : "Manage"}</Link></Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </WorkforcePanel>
  )
}
