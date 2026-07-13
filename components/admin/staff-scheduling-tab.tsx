"use client"

import { useCallback, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CalendarRange,
  ClipboardList,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  LayoutTemplate,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useMultiAccount } from "@/hooks/use-multi-account"
import {
  hiringEntityFromAccount,
  isHiringEntityShape,
} from "@/lib/hiring/hiring-entity-from-account"
import type { HiringEntity } from "@/types/hiring-entity"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { ScrollArea, ScrollBar } from "@/components/admin/scheduling/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/scheduling/ui/select"
import {
  SchedulingProvider,
  useScheduling,
  type SchedulingView,
} from "@/components/admin/scheduling/scheduling-context"
import type { SchedulingMode } from "@/components/admin/scheduling/use-scheduling-data"
import { AssignStaffSheet } from "@/components/admin/scheduling/scheduling-assign-staff-sheet"
import { CreateTemplateSheet } from "@/components/admin/scheduling/scheduling-create-template-sheet"
import { EditShiftSheet } from "@/components/admin/scheduling/scheduling-edit-shift-sheet"
import { PublishModal } from "@/components/admin/scheduling/scheduling-publish-modal"
import { ResolveConflictSheet } from "@/components/admin/scheduling/scheduling-resolve-conflict-sheet"
import { ShiftDetailsSheet } from "@/components/admin/scheduling/scheduling-shift-details-sheet"
import { StaffProfileSheet } from "@/components/admin/scheduling/scheduling-staff-profile-sheet"
import { AvailabilityView } from "@/components/admin/scheduling/views/availability-view"
import { BoardView } from "@/components/admin/scheduling/views/board-view"
import { ConflictsView } from "@/components/admin/scheduling/views/conflicts-view"
import { CreateView } from "@/components/admin/scheduling/views/create-view"
import { ManagementView } from "@/components/admin/scheduling/views/management-view"
import { OpenShiftsView } from "@/components/admin/scheduling/views/open-shifts-view"
import { PublishView } from "@/components/admin/scheduling/views/publish-view"
import { StaffView } from "@/components/admin/scheduling/views/staff-view"
import { TemplatesView } from "@/components/admin/scheduling/views/templates-view"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"

interface NavItem {
  value: SchedulingView
  label: string
  icon: LucideIcon
  badge?: number
  badgeTone?: "purple" | "amber" | "red"
}

const NAV: NavItem[] = [
  { value: "board", label: "Schedule Board", icon: LayoutGrid },
  { value: "create", label: "Create Shift", icon: Plus },
  { value: "management", label: "Shift Management", icon: ClipboardList },
  { value: "staff", label: "Staff & Crew", icon: Users },
  { value: "availability", label: "Availability", icon: Clock },
  { value: "open", label: "Open Shifts", icon: UserPlus, badgeTone: "amber" },
  {
    value: "conflicts",
    label: "Conflicts",
    icon: TriangleAlert,
    badgeTone: "red",
  },
  { value: "publish", label: "Publish", icon: Send },
  { value: "templates", label: "Templates", icon: LayoutTemplate },
]

const VIEW_META: Record<SchedulingView, { title: string; description: string }> = {
  board: {
    title: "Scheduling & Shifts",
    description: "Manage staff coverage, shift assignments, and crew availability.",
  },
  create: { title: "Create Shift", description: "Build a new shift and assign crew before publishing." },
  management: { title: "Shift Management", description: "Search, sort, and bulk-manage every shift." },
  staff: { title: "Staff & Crew", description: "Your event workforce, credentials, and reliability." },
  availability: { title: "Availability", description: "Weekly availability grid across the crew." },
  open: { title: "Open Shifts", description: "Unfilled roles that still need coverage." },
  conflicts: { title: "Conflicts & Warnings", description: "Everything to resolve before publishing." },
  publish: { title: "Publish Schedule", description: "Review pending changes and notify your crew." },
  templates: { title: "Shift Templates", description: "Reusable presets for recurring roles." },
}

function resolveInitialMode(value: string | null, hasEmployer: boolean): SchedulingMode {
  if (value === "demo" || value === "live") return value
  return hasEmployer ? "live" : "demo"
}

function employerScopeParams(employer: HiringEntity): Record<string, string | null> {
  return {
    entity_type: employer.entityType,
    entity_id: employer.entityId,
    display_name: employer.displayName,
  }
}

export function StaffSchedulingTab(props: { employer?: unknown }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { currentAccount } = useMultiAccount()

  const propEmployer = isHiringEntityShape(props.employer) ? props.employer : null
  const hydratedEmployer = useMemo(
    () => propEmployer ?? hiringEntityFromAccount(currentAccount),
    [currentAccount, propEmployer],
  )

  const initialEventId = searchParams.get("event_id") || searchParams.get("eventId")
  const initialVenueId = searchParams.get("venue_id") || searchParams.get("venueId")
  const hasEmployer = Boolean(hydratedEmployer)
  const initialMode = resolveInitialMode(searchParams.get("scheduling_mode"), hasEmployer)

  // Keep URL scoped to the acting org/venue/artist so refresh stays in Live.
  useEffect(() => {
    if (!hydratedEmployer) return
    const entityType = searchParams.get("entity_type")
    const entityId = searchParams.get("entity_id")
    if (entityType === hydratedEmployer.entityType && entityId === hydratedEmployer.entityId) return

    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "scheduling")
    params.set("entity_type", hydratedEmployer.entityType)
    params.set("entity_id", hydratedEmployer.entityId)
    params.set("display_name", hydratedEmployer.displayName)
    if (hydratedEmployer.entityType === "venue" && !params.get("venue_id"))
      params.set("venue_id", hydratedEmployer.entityId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [hydratedEmployer, pathname, router, searchParams])

  return (
    <SchedulingProvider
      key={hydratedEmployer ? `${hydratedEmployer.entityType}:${hydratedEmployer.entityId}` : "no-employer"}
      employer={hydratedEmployer}
      initialEventId={initialEventId}
      initialVenueId={initialVenueId}
      initialMode={initialMode}
    >
      <div className="staff-scheduling-prototype">
        <SchedulingWorkspace employer={hydratedEmployer} />
      </div>
    </SchedulingProvider>
  )
}

function SchedulingWorkspace({ employer }: { employer: HiringEntity | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, view, setView, goToCreate, openPublish } = useScheduling()
  const meta = VIEW_META[view]
  const isDemo = data.mode === "demo"
  const isOrgEmployer = employer?.entityType === "organization" || employer?.entityType === "artist"
  const criticalConflicts = data.conflicts.filter((c) => c.severity === "critical").length
  const openShiftCount = data.openShifts.length
  const weekEnd = new Date(data.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = `${data.weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  const nav = NAV.map((item) =>
    item.value === "open"
      ? { ...item, badge: openShiftCount }
      : item.value === "conflicts"
        ? { ...item, badge: criticalConflicts }
        : item,
  )

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || value === "all") params.delete(key)
        else params.set(key, value)
      }
      if (!params.get("tab")) params.set("tab", "scheduling")
      // Never drop org/artist identity when setting venue/event scope
      if (employer) {
        params.set("entity_type", employer.entityType)
        params.set("entity_id", employer.entityId)
        params.set("display_name", employer.displayName)
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [employer, pathname, router, searchParams],
  )

  function handleModeChange(next: SchedulingMode) {
    data.setMode(next)
    const patch: Record<string, string | null> = { scheduling_mode: next }
    if (next === "live" && employer) Object.assign(patch, employerScopeParams(employer))
    replaceParams(patch)
  }

  function handleStartLive() {
    data.setMode("live")
    const patch: Record<string, string | null> = { scheduling_mode: "live" }
    if (employer) Object.assign(patch, employerScopeParams(employer))
    replaceParams(patch)
  }

  function handleEventChange(value: string | null) {
    const next = value ?? "all"
    data.setEventId(next)
    const event = data.events.find((candidate) => candidate.id === next)
    replaceParams({
      event_id: next === "all" ? null : next,
      venue_id: event?.venueId ?? data.venueId,
      tour_id: event?.tourId ?? searchParams.get("tour_id"),
    })
  }

  function handleVenueChange(value: string | null) {
    if (!value) return
    data.setVenueId(value)
    replaceParams({ venue_id: value })
  }

  const liveActionsDisabled = isDemo || data.needsEmployer || data.needsVenue

  return (
    <div className="flex flex-col gap-5">
      {isDemo ? (
        <div className="flex flex-col gap-3 rounded-xl border border-neon-amber/40 bg-neon-amber/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neon-amber/20 text-neon-amber">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Demo preview</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re viewing sample data. Switch to Live to assign your roster to real events
                {employer ? ` for ${employer.displayName}` : ""}.
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartLive}
            className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
          >
            Start with real staff
          </Button>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-neon-purple/15 text-neon-purple ring-1 ring-neon-purple/30">
              <CalendarRange className="size-4" />
            </span>
            <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground">
              {meta.title}
            </h1>
            {employer && !isDemo ? (
              <Badge variant="outline" className="border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
                {employer.displayName}
              </Badge>
            ) : null}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">{meta.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/40 p-0.5">
              <button
                type="button"
                onClick={() => handleModeChange("demo")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isDemo ? "bg-neon-amber/20 text-neon-amber" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Demo preview
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("live")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  !isDemo ? "bg-neon-purple/20 text-neon-purple" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Live schedule
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/40 p-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous week"
                onClick={() => {
                  const next = new Date(data.weekStart)
                  next.setDate(next.getDate() - 7)
                  data.setWeekStart(next)
                }}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-36 px-1.5 text-center text-xs font-medium text-foreground">
                {weekLabel}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next week"
                onClick={() => {
                  const next = new Date(data.weekStart)
                  next.setDate(next.getDate() + 7)
                  data.setWeekStart(next)
                }}
              >
                <ChevronRight />
              </Button>
            </div>

            <Select value={data.eventId} onValueChange={handleEventChange}>
              <SelectTrigger size="sm" className="min-w-44">
                <SelectValue placeholder="Event">
                  {(selected: string) =>
                    selected === "all"
                      ? "All Events"
                      : data.events.find((event) => event.id === selected)?.name ?? "Event"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Events</SelectItem>
                  {data.events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {!isDemo && data.venues.length > 0 ? (
              <Select value={data.venueId ?? undefined} onValueChange={handleVenueChange}>
                <SelectTrigger size="sm" className="min-w-40">
                  <SelectValue placeholder="Venue">
                    {() => data.venues.find((venue) => venue.id === data.venueId)?.name ?? "Select venue"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data.venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3" />
                          {venue.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh schedule"
              disabled={isDemo}
              onClick={() => void data.reload()}
            >
              <RefreshCw className={data.loading ? "animate-spin" : undefined} />
            </Button>

            {isDemo ? (
              <Badge variant="outline" className="border-neon-amber/40 bg-neon-amber/10 text-neon-amber">
                Demo preview
              </Badge>
            ) : null}
            {data.needsVenue ? (
              <Badge variant="outline" className="border-neon-amber/40 bg-neon-amber/10 text-neon-amber">
                Venue required
              </Badge>
            ) : null}
          </div>
          {data.error ? <p className="text-xs text-neon-red">{data.error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("conflicts")}
            className="border-neon-red/40 text-neon-red hover:bg-neon-red/10"
          >
            <TriangleAlert data-icon="inline-start" />
            View Conflicts
            {criticalConflicts > 0 ? (
              <Badge variant="outline" className="ml-1 border-neon-red/40 bg-neon-red/10 text-neon-red">
                {criticalConflicts}
              </Badge>
            ) : null}
          </Button>
          <Button variant="secondary" size="sm" onClick={openPublish} disabled={liveActionsDisabled}>
            <Send data-icon="inline-start" />
            Publish Schedule
          </Button>
          <Button
            size="sm"
            onClick={() => goToCreate()}
            disabled={liveActionsDisabled}
            className="bg-neon-purple text-primary-foreground shadow-[0_0_20px_-6px_var(--color-neon-purple)] hover:bg-neon-purple/85"
          >
            <Plus data-icon="inline-start" />
            Create Shift
          </Button>
        </div>
      </header>

      <div className="border-b border-border/60">
        <ScrollArea className="w-full">
          <nav className="flex items-center gap-1 pb-px" aria-label="Scheduling sections">
            {nav.map((item) => {
              const active = view === item.value
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => (item.value === "create" ? goToCreate() : setView(item.value))}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "text-neon-purple" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.badge ? (
                    <span
                      className={cn(
                        "flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                        item.badgeTone === "red"
                          ? "bg-neon-red/20 text-neon-red"
                          : item.badgeTone === "amber"
                            ? "bg-neon-amber/20 text-neon-amber"
                            : "bg-neon-purple/20 text-neon-purple",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neon-purple" aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </nav>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div>
        {!isDemo && data.needsEmployer ? (
          <HiringMissingScope
            title="Select a hiring account"
            description="Switch your acting account to an Organization or Artist to schedule real staff. You can keep browsing the Demo preview anytime."
          />
        ) : !isDemo && data.needsVenue && view !== "templates" && view !== "staff" ? (
          <div className="rounded-xl border border-neon-amber/40 bg-neon-amber/5 p-8 text-center">
            <h2 className="text-sm font-semibold text-foreground">
              {isOrgEmployer
                ? "Select an event or venue to schedule shifts for this organization"
                : "Pick a venue to schedule"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {isOrgEmployer
                ? `Choose an event with a venue above, or pick a venue from your events to schedule shifts for ${employer?.displayName ?? "this organization"}.`
                : "Choose an event with a venue above, or select a venue from the list to load and assign real roster members."}
            </p>
            {data.venues.length > 0 ? (
              <div className="mx-auto mt-4 max-w-xs">
                <Select value={data.venueId ?? undefined} onValueChange={handleVenueChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data.venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {isOrgEmployer
                  ? "No venues found on your events yet. Open or create an event with a venue, then return here to assign roster members."
                  : "No venues found on your events yet. Open an event with a venue to continue."}
              </p>
            )}
          </div>
        ) : view === "board" ? (
          <BoardView />
        ) : view === "create" ? (
          <CreateView />
        ) : view === "management" ? (
          <ManagementView />
        ) : view === "staff" ? (
          <StaffView />
        ) : view === "availability" ? (
          <AvailabilityView />
        ) : view === "open" ? (
          <OpenShiftsView />
        ) : view === "conflicts" ? (
          <ConflictsView />
        ) : view === "publish" ? (
          <PublishView />
        ) : (
          <TemplatesView />
        )}
      </div>

      <ShiftDetailsSheet />
      <EditShiftSheet />
      <AssignStaffSheet />
      <StaffProfileSheet />
      <ResolveConflictSheet />
      <CreateTemplateSheet />
      <PublishModal />
    </div>
  )
}
