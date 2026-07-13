export type ReadinessState = "missing" | "needs_advance" | "in_progress" | "ready" | "blocked" | "settled"

export interface ReadinessItem {
  id: string
  label: string
  state: ReadinessState
  blocksPublish?: boolean
  detail?: string
}

export interface BuilderConflict {
  id: string
  severity: "info" | "warning" | "critical"
  label: string
  detail: string
}

export interface BuilderReadinessSummary {
  score: number
  items: ReadinessItem[]
  blockers: ReadinessItem[]
  conflicts: BuilderConflict[]
}

export interface EventReadinessInput {
  title?: string | null
  date?: string | null
  time?: string | null
  start_at?: string | null
  venue_name?: string | null
  venue_id?: string | null
  venue_account_id?: string | null
  capacity?: string | number | null
  tour_ids?: string[]
  primary_tour_id?: string | null
  technical_rider?: string | null
  hospitality_rider?: string | null
  security_notes?: string | null
  promoter_contact?: unknown
  load_in_time?: string | null
  sound_check_time?: string | null
  settlement_terms?: string | null
  ticket_price?: string | number | null
  expected_revenue?: string | number | null
  expected_expenses?: string | number | null
  team_count?: number
  staff_count?: number
  vendor_count?: number
  advance_status?: string | null
  has_logistics?: boolean
  has_site_map?: boolean
  has_documents?: boolean
  has_comms?: boolean
  day_sheet_notes?: string | null
}

export interface TourReadinessInput {
  name?: string | null
  main_artist?: string | null
  artist_account_id?: string | null
  start_date?: string | null
  end_date?: string | null
  events?: Array<{
    id?: string
    name?: string | null
    venue?: string | null
    venue_name?: string | null
    date?: string | null
    event_date?: string | null
    time?: string | null
    market?: string | null
    leg_name?: string | null
    advance_status?: string | null
  }>
  route?: Array<{
    city?: string | null
    venue?: string | null
    date?: string | null
  }>
  transportation?: Record<string, unknown>
  accommodation?: Record<string, unknown>
  equipment?: Array<Record<string, unknown>>
  crew_count?: number
  budget?: string | number | null
}

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value) && value > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  return Boolean(value)
}

function readinessScore(items: ReadinessItem[]): number {
  if (items.length === 0) return 0
  const weights: Record<ReadinessState, number> = {
    missing: 0,
    blocked: 0,
    needs_advance: 0.35,
    in_progress: 0.65,
    ready: 1,
    settled: 1,
  }
  const total = items.reduce((sum, item) => sum + weights[item.state], 0)
  return Math.round((total / items.length) * 100)
}

function summarize(items: ReadinessItem[], conflicts: BuilderConflict[]): BuilderReadinessSummary {
  return {
    score: readinessScore(items),
    items,
    blockers: items.filter((item) => item.blocksPublish && (item.state === "missing" || item.state === "blocked")),
    conflicts,
  }
}

export function getEventReadiness(input: EventReadinessInput): BuilderReadinessSummary {
  const hasSchedule = filled(input.start_at) || filled(input.date)
  const hasVenueAccount = filled(input.venue_account_id)
  const hasVenue = hasVenueAccount || filled(input.venue_id) || filled(input.venue_name)
  const hasTour = Boolean(input.tour_ids?.length)
  const hasAdvancing = filled(input.technical_rider) || filled(input.hospitality_rider) || filled(input.security_notes)
  const advanceStatus = String(input.advance_status || "").toLowerCase()
  const advanceStarted = ["sent", "in_progress", "review", "ready", "approved", "complete", "completed", "settled"].includes(advanceStatus)
  const hasFinance = filled(input.ticket_price) || filled(input.expected_revenue) || filled(input.settlement_terms)
  const staffCount = input.staff_count ?? 0
  const hasTeam = (input.team_count ?? 0) > 0 || (input.vendor_count ?? 0) > 0 || staffCount > 0
  const items: ReadinessItem[] = [
    {
      id: "basics",
      label: "Event basics",
      state: filled(input.title) ? "ready" : "missing",
      blocksPublish: true,
      detail: "Title appears in schedules, day sheets, and event lists.",
    },
    {
      id: "schedule",
      label: "Schedule",
      state: hasSchedule ? (filled(input.load_in_time) && filled(input.sound_check_time) ? "ready" : "in_progress") : "missing",
      blocksPublish: true,
      detail: "Show date plus day-of timing keeps run-of-show usable.",
    },
    {
      id: "venue",
      label: "Venue account",
      state: hasVenueAccount ? "ready" : "missing",
      blocksPublish: true,
      detail: "Attach a venue profile so advancing, hiring, and contacts resolve to a real account.",
    },
    {
      id: "tour_assignment",
      label: hasTour ? "Tour assignment" : "Standalone event",
      state: hasTour && !filled(input.primary_tour_id) ? "needs_advance" : "ready",
      detail: hasTour ? "Primary tour and route metadata control where the event appears." : "Standalone events can be attached to tours later.",
    },
    {
      id: "advancing",
      label: "Venue advance",
      state: advanceStarted
        ? "in_progress"
        : filled(input.technical_rider) && filled(input.hospitality_rider) && filled(input.security_notes)
          ? "ready"
          : hasAdvancing
            ? "in_progress"
            : "needs_advance",
      blocksPublish: !advanceStarted && !hasAdvancing,
      detail: "Start advancing so venue contacts and production notes are shared.",
    },
    {
      id: "team",
      label: "Staff assignments",
      state: staffCount > 0 ? "ready" : hasTeam ? "in_progress" : "missing",
      blocksPublish: staffCount === 0,
      detail: "At least one staff assignment is required before publish for day-of coverage.",
    },
    {
      id: "logistics",
      label: "Logistics and site map",
      state: input.has_logistics && input.has_site_map ? "ready" : input.has_logistics || input.has_site_map ? "in_progress" : "needs_advance",
      detail: "Travel, lodging, equipment, supplies, documents, and maps are staged for the operations tabs.",
    },
    {
      id: "finance",
      label: "Ticketing and finance",
      state: hasFinance ? "in_progress" : "needs_advance",
      detail: "Ticket price, revenue, expenses, and settlement notes feed finance review.",
    },
    {
      id: "day_sheet",
      label: "Day sheet",
      state: hasSchedule && hasVenue && filled(input.day_sheet_notes) ? "ready" : hasSchedule && hasVenue ? "in_progress" : "missing",
      blocksPublish: false,
      detail: "Day sheet preview uses schedule, venue, contacts, and advancing data.",
    },
    {
      id: "communications",
      label: "Communications",
      state: input.has_comms ? "in_progress" : "needs_advance",
      detail: "Producer handoff can open the event communications hub after save.",
    },
  ]

  const conflicts: BuilderConflict[] = []
  if (hasTour && input.tour_ids && input.tour_ids.length > 1 && !filled(input.primary_tour_id)) {
    conflicts.push({
      id: "primary-tour",
      severity: "warning",
      label: "Primary tour not selected",
      detail: "Choose a primary tour so this event has a default route context.",
    })
  }
  if (filled(input.capacity) && Number(input.capacity) < 0) {
    conflicts.push({
      id: "capacity-negative",
      severity: "critical",
      label: "Capacity is invalid",
      detail: "Capacity must be zero or greater.",
    })
  }
  if (!hasVenueAccount) {
    conflicts.push({
      id: "venue-account",
      severity: "warning",
      label: "Venue account missing",
      detail: "Attach a venue profile so roster and advance notify resolve correctly.",
    })
  }

  return summarize(items, conflicts)
}

export function getTourReadiness(input: TourReadinessInput): BuilderReadinessSummary {
  const events = input.events ?? []
  const route = input.route ?? []
  const hasDates = filled(input.start_date) && filled(input.end_date)
  const hasHeadlinerAccount = filled(input.artist_account_id)
  const hasHeadliner = hasHeadlinerAccount || filled(input.main_artist)
  const items: ReadinessItem[] = [
    {
      id: "overview",
      label: "Tour overview",
      state: filled(input.name) && hasHeadliner ? (hasHeadlinerAccount ? "ready" : "needs_advance") : "missing",
      blocksPublish: true,
      detail: "Name and headliner account anchor every route, schedule, and day sheet.",
    },
    {
      id: "dates",
      label: "Tour dates",
      state: hasDates ? "ready" : "missing",
      blocksPublish: true,
      detail: "Dates frame routing, conflicts, holds, and calendar spans.",
    },
    {
      id: "events",
      label: "Events and holds",
      state: events.length > 0 ? "in_progress" : "missing",
      blocksPublish: true,
      detail: "Tours need at least one stop, hold, or confirmed show.",
    },
    {
      id: "route",
      label: "Route",
      state: route.length > 0 || events.length > 0 ? "in_progress" : "missing",
      detail: "Routing controls markets, travel days, and conflict checks.",
    },
    {
      id: "advancing",
      label: "Advancing matrix",
      state: events.some((event) => event.advance_status === "ready" || event.advance_status === "settled") ? "in_progress" : "needs_advance",
      detail: "Per-event readiness tracks venue, production, hospitality, security, staffing, docs, and settlement.",
    },
    {
      id: "people",
      label: "People",
      state: (input.crew_count ?? 0) > 0 ? "in_progress" : "needs_advance",
      detail: "Crew, artists, vendors, and permissions drive day-of execution.",
    },
    {
      id: "logistics",
      label: "Logistics",
      state: filled(input.transportation) || filled(input.accommodation) || filled(input.equipment) ? "in_progress" : "needs_advance",
      detail: "Travel, lodging, freight, gear, supplies, and maps live here.",
    },
    {
      id: "finance",
      label: "Finance",
      state: filled(input.budget) ? "in_progress" : "needs_advance",
      detail: "Budget, guarantees, expenses, per diems, and settlements feed profitability.",
    },
  ]

  const conflicts: BuilderConflict[] = []
  if (!hasHeadlinerAccount) {
    conflicts.push({
      id: "headliner-account",
      severity: "warning",
      label: "Headliner account missing",
      detail: "Attach an artist account so tour hiring and party links resolve.",
    })
  }
  if (events.length === 0) {
    conflicts.push({
      id: "no-stops",
      severity: "critical",
      label: "No tour stops",
      detail: "Add or attach at least one show before publishing.",
    })
  }
  if (filled(input.start_date) && filled(input.end_date) && new Date(String(input.end_date)) < new Date(String(input.start_date))) {
    conflicts.push({
      id: "date-order",
      severity: "critical",
      label: "Tour dates are reversed",
      detail: "End date must be after start date.",
    })
  }

  const seenOrdinals = new Set<number>()
  events.forEach((event, index) => {
    const date = event.date ?? event.event_date
    if (hasDates && filled(date)) {
      const eventDate = new Date(String(date))
      if (eventDate < new Date(String(input.start_date)) || eventDate > new Date(String(input.end_date))) {
        conflicts.push({
          id: `event-outside-dates-${event.id ?? index}`,
          severity: "warning",
          label: "Event outside tour dates",
          detail: `${event.name || "A tour event"} falls outside the tour date range.`,
        })
      }
    }
    if (seenOrdinals.has(index)) {
      conflicts.push({
        id: `duplicate-ordinal-${index}`,
        severity: "warning",
        label: "Duplicate route order",
        detail: "Two stops share the same route order.",
      })
    }
    seenOrdinals.add(index)
  })

  return summarize(items, conflicts)
}
