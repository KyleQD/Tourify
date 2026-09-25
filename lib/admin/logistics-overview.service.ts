import "server-only"

import {
  logisticsOverviewHref,
  type AdminLogisticsOverview,
  type LogisticsAttentionItem,
  type LogisticsAttentionSeverity,
  type LogisticsEventRow,
  type LogisticsOverviewDomain,
  type LogisticsOverviewQuery,
  type LogisticsReadiness,
  type LogisticsSourceHealth,
  type LogisticsTimelineItem,
  type LogisticsTourRow,
} from "@/lib/admin/logistics-overview"
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from "@/lib/admin/resolve-authorized-org"

type SupabaseLike = { from: (table: string) => any }
type Row = Record<string, any>

interface SourceResult<T> {
  data: T
  health: LogisticsSourceHealth
}

async function readSource<T>(
  domain: LogisticsOverviewDomain,
  fallback: T,
  request: PromiseLike<{ data?: T | null; error?: { message?: string } | null }>,
  generatedAt: string,
): Promise<SourceResult<T>> {
  try {
    const result = await request
    if (result.error) {
      return {
        data: fallback,
        health: {
          domain,
          status: "unavailable",
          generatedAt,
          warning: result.error.message || `${domain} is unavailable.`,
        },
      }
    }
    return { data: result.data ?? fallback, health: { domain, status: "ready", generatedAt } }
  } catch (error) {
    return {
      data: fallback,
      health: {
        domain,
        status: "unavailable",
        generatedAt,
        warning: error instanceof Error ? error.message : `${domain} is unavailable.`,
      },
    }
  }
}

function impossible(query: any, column = "id") {
  return query.eq(column, "00000000-0000-0000-0000-000000000000")
}

function inScope(query: any, column: string, ids: string[]) {
  return ids.length > 0 ? query.in(column, ids) : impossible(query, column)
}

function normalizedStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

function isClosedTask(value: unknown): boolean {
  return ["completed", "cancelled", "canceled", "skipped"].includes(normalizedStatus(value))
}

function severityForTask(task: Row, now: number): LogisticsAttentionSeverity {
  const dueAt = task.due_date ? Date.parse(String(task.due_date)) : Number.NaN
  if (normalizedStatus(task.status) === "blocked") return "critical"
  if (Number.isFinite(dueAt) && dueAt < now) return normalizedStatus(task.priority) === "urgent" ? "critical" : "high"
  if (["urgent", "critical"].includes(normalizedStatus(task.priority))) return "high"
  if (normalizedStatus(task.priority) === "high") return "medium"
  return "low"
}

function taskDomain(task: Row): LogisticsOverviewDomain {
  const value = normalizedStatus(task.type)
  if (value.includes("travel")) return "travel"
  if (value.includes("lodg") || value.includes("hotel")) return "lodging"
  if (value.includes("transport")) return "transport"
  if (value.includes("equipment") || value.includes("rental")) return "equipment"
  if (value.includes("backline")) return "backline"
  if (value.includes("catering") || value.includes("meal")) return "catering"
  if (value.includes("staff")) return "staffing"
  if (value.includes("document") || value.includes("day_sheet")) return "documents"
  if (value.includes("map")) return "site_maps"
  if (value.includes("comm")) return "communications"
  return "tasks"
}

function taskRemediationHref(task: Row, domain: LogisticsOverviewDomain): string {
  const scope = {
    tourId: task.tour_id ? String(task.tour_id) : null,
    eventId: task.event_id ? String(task.event_id) : null,
  }
  if (domain === "transport") return logisticsOverviewHref({ ...scope, tab: "travel", panel: "ground" })
  if (domain === "travel") return logisticsOverviewHref({ ...scope, tab: "travel", panel: "air-travelers" })
  if (domain === "lodging" || domain === "documents") {
    return logisticsOverviewHref({ ...scope, tab: "travel", panel: "lodging-documents" })
  }
  if (["equipment", "backline", "catering"].includes(domain)) {
    return logisticsOverviewHref({ ...scope, tab: "production", panel: domain })
  }
  if (domain === "communications") return logisticsOverviewHref({ ...scope, tab: "communications" })
  if (domain === "site_maps") return logisticsOverviewHref({ ...scope, tab: "maps" })
  return logisticsOverviewHref({ ...scope, tab: "overview" })
}

function severityRank(value: LogisticsAttentionSeverity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[value]
}

function readinessFor(args: {
  tasks: Row[]
  publishedMap: boolean
  draftMap: boolean
  pendingAcknowledgements: number
  sourceUnavailable: boolean
  uncoveredShifts?: number
}): LogisticsReadiness {
  const open = args.tasks.filter((task) => !isClosedTask(task.status))
  const blocked = open.filter((task) => normalizedStatus(task.status) === "blocked")
  const reasons: string[] = []
  if (blocked.length > 0) reasons.push(`${blocked.length} blocked task${blocked.length === 1 ? "" : "s"}`)
  if (!args.publishedMap) reasons.push(args.draftMap ? "Site map is still a draft" : "Site map is missing")
  if (args.pendingAcknowledgements > 0) {
    reasons.push(`${args.pendingAcknowledgements} acknowledgement${args.pendingAcknowledgements === 1 ? "" : "s"} pending`)
  }
  if (args.uncoveredShifts) {
    reasons.push(`${args.uncoveredShifts} uncovered staffing shift${args.uncoveredShifts === 1 ? "" : "s"}`)
  }
  if (args.sourceUnavailable) reasons.push("One or more readiness sources are unavailable")

  if (blocked.length > 0 || args.uncoveredShifts) return { state: "blocked", percentage: null, reasons }
  if (args.sourceUnavailable) return { state: "in_progress", percentage: null, reasons }
  if (open.length === 0 && args.publishedMap && args.pendingAcknowledgements === 0) {
    return { state: "ready", percentage: 100, reasons: [] }
  }
  if (args.tasks.length === 0 && !args.publishedMap && !args.draftMap && args.pendingAcknowledgements === 0) {
    return { state: "not_started", percentage: 0, reasons }
  }
  const completed = args.tasks.filter((task) => isClosedTask(task.status)).length
  const taskPercent = args.tasks.length > 0 ? completed / args.tasks.length : 0
  const mapPercent = args.publishedMap ? 1 : args.draftMap ? 0.5 : 0
  const ackPercent = args.pendingAcknowledgements === 0 ? 1 : 0
  return {
    state: "in_progress",
    percentage: Math.round(((taskPercent + mapPercent + ackPercent) / 3) * 100),
    reasons,
  }
}

function displayName(profile: Row | undefined): string | null {
  if (!profile) return null
  return String(profile.full_name || profile.username || "").trim() || null
}

function uniqueRows(rows: Row[]): Row[] {
  return Array.from(new Map(rows.map((row) => [String(row.id), row] as const)).values())
}

export async function loadAdminLogisticsOverview(args: {
  userId: string
  orgId: string
  allowedTourIds?: readonly string[]
  query: LogisticsOverviewQuery
}): Promise<AdminLogisticsOverview> {
  const generatedAt = new Date().toISOString()
  const scope = await resolveAuthorizedOrgLogisticsScope({
    userId: args.userId,
    requestedOrgId: args.orgId,
    eventId: args.query.eventId,
    tourId: args.query.tourId,
    allowedTourIds: args.allowedTourIds,
  })
  const supabase = scope.service as SupabaseLike

  const tourEventResult = await readSource<Row[]>(
    "events",
    [],
    inScope(
      supabase.from("tour_events").select("tour_id, event_id, ordinal, advance_status"),
      "tour_id",
      scope.tourIds,
    ),
    generatedAt,
  )
  const tourByEvent = new Map<string, string>()
  for (const row of tourEventResult.data) {
    if (row.event_id && row.tour_id) tourByEvent.set(String(row.event_id), String(row.tour_id))
  }

  let effectiveEventIds = scope.eventIds
  if (args.query.tourId && !args.query.eventId) {
    effectiveEventIds = tourEventResult.data
      .filter((row) => String(row.tour_id) === args.query.tourId)
      .map((row) => String(row.event_id))
      .filter((id) => scope.eventIds.includes(id))
  }

  let eventsRequest = inScope(
    supabase
      .from("events_v2")
      .select("id, title, status, start_at, timezone, venue_id, created_by, updated_at"),
    "id",
    effectiveEventIds,
  )
  if (!args.query.eventId) {
    eventsRequest = eventsRequest
      .gte("start_at", args.query.from)
      .lte("start_at", args.query.to)
  }
  eventsRequest = eventsRequest.order("start_at", { ascending: true }).limit(args.query.limit)

  let toursRequest = inScope(
    supabase
      .from("tours")
      .select("id, name, status, start_date, end_date, created_by, user_id, updated_at"),
    "id",
    scope.tourIds,
  )
  toursRequest = toursRequest.order("start_date", { ascending: true }).limit(args.query.limit)

  let taskRequest = supabase
    .from("logistics_tasks")
    .select("id, title, description, type, status, priority, due_date, event_id, tour_id, assigned_to_user_id, updated_at, source_type, source_id")
    .order("updated_at", { ascending: false })
  taskRequest = applyOrgLogisticsTaskFilter({
    query: taskRequest,
    userId: args.userId,
    eventIds: effectiveEventIds,
    tourIds: scope.tourIds,
    eventId: args.query.eventId,
    tourId: args.query.tourId,
  })

  const mapScopeParts: string[] = []
  if (effectiveEventIds.length > 0) mapScopeParts.push(`event_v2_id.in.(${effectiveEventIds.join(",")})`)
  if (scope.tourIds.length > 0) mapScopeParts.push(`tour_id.in.(${scope.tourIds.join(",")})`)
  let mapsRequest = supabase
    .from("site_maps")
    .select("id, name, status, event_v2_id, tour_id, updated_at")
    .order("updated_at", { ascending: false })
  mapsRequest = mapScopeParts.length > 0 ? mapsRequest.or(mapScopeParts.join(",")) : impossible(mapsRequest)

  let acknowledgementRequest = supabase
    .from("logistics_acknowledgements")
    .select("id, event_id, tour_id, status, updated_at")
    .eq("org_id", scope.orgId)
  if (args.query.eventId) acknowledgementRequest = acknowledgementRequest.eq("event_id", args.query.eventId)
  else if (args.query.tourId) acknowledgementRequest = acknowledgementRequest.eq("tour_id", args.query.tourId)

  const daySheetRequest = inScope(
    supabase.from("day_sheets").select("event_id, updated_at, distributed_at, version"),
    "event_id",
    effectiveEventIds,
  )
  let staffingRequest = supabase
    .from("staff_shifts")
    .select("id, event_id, status, staff_member_id, role_assignment, shift_date, start_time, updated_at")
    .eq("org_id", scope.orgId)
  staffingRequest = inScope(staffingRequest, "event_id", effectiveEventIds)

  const [eventsResult, toursResult, tasksResult, mapsResult, acknowledgementsResult, daySheetsResult, staffingResult] = await Promise.all([
    readSource<Row[]>("events", [], eventsRequest, generatedAt),
    readSource<Row[]>("events", [], toursRequest, generatedAt),
    readSource<Row[]>("tasks", [], taskRequest, generatedAt),
    readSource<Row[]>("site_maps", [], mapsRequest, generatedAt),
    readSource<Row[]>("communications", [], acknowledgementRequest, generatedAt),
    readSource<Row[]>("documents", [], daySheetRequest, generatedAt),
    readSource<Row[]>("staffing", [], staffingRequest, generatedAt),
  ])

  const search = args.query.search.toLowerCase()
  const venueIds = Array.from(new Set(eventsResult.data.map((row) => row.venue_id).filter(Boolean).map(String)))
  const venuesResult = await readSource<Row[]>(
    "events",
    [],
    venueIds.length > 0
      ? supabase.from("venues_v2").select("id, name").in("id", venueIds)
      : impossible(supabase.from("venues_v2").select("id, name")),
    generatedAt,
  )
  const venues = new Map(venuesResult.data.map((venue) => [String(venue.id), venue]))
  const events = eventsResult.data.filter((event) => {
    if (!search) return true
    const venue = venues.get(String(event.venue_id || ""))
    return [event.title, venue?.name]
      .some((value) => String(value || "").toLowerCase().includes(search))
  })
  const tours = toursResult.data.filter((tour) => !search || String(tour.name || "").toLowerCase().includes(search))

  const impairedEventSources = [tourEventResult.health, toursResult.health, venuesResult.health]
    .filter((health) => health.status !== "ready")
  if (impairedEventSources.length > 0 && eventsResult.health.status === "ready") {
    eventsResult.health = {
      domain: "events",
      status: "degraded",
      generatedAt,
      warning: impairedEventSources.map((health) => health.warning).filter(Boolean).join(" ") || "Some event context is unavailable.",
    }
  }

  const ownerIds = Array.from(new Set([
    ...events.map((row) => row.created_by),
    ...tours.flatMap((row) => [row.created_by, row.user_id]),
    ...tasksResult.data.map((row) => row.assigned_to_user_id),
  ].filter((value): value is string => typeof value === "string" && Boolean(value))))
  const profilesResult = await readSource<Row[]>(
    "staffing",
    [],
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ownerIds)
      : impossible(supabase.from("profiles").select("id, full_name, username, avatar_url")),
    generatedAt,
  )
  const profiles = new Map(profilesResult.data.map((profile) => [String(profile.id), profile]))

  const pendingAcknowledgements = acknowledgementsResult.data.filter((row) => normalizedStatus(row.status) === "pending")
  const mapsByEvent = new Map<string, Row[]>()
  const mapsByTour = new Map<string, Row[]>()
  for (const map of mapsResult.data) {
    if (map.event_v2_id) mapsByEvent.set(String(map.event_v2_id), [...(mapsByEvent.get(String(map.event_v2_id)) || []), map])
    if (map.tour_id) mapsByTour.set(String(map.tour_id), [...(mapsByTour.get(String(map.tour_id)) || []), map])
  }

  const tasksByEvent = new Map<string, Row[]>()
  const tasksByTour = new Map<string, Row[]>()
  for (const task of tasksResult.data) {
    if (task.event_id) tasksByEvent.set(String(task.event_id), [...(tasksByEvent.get(String(task.event_id)) || []), task])
    if (task.tour_id) tasksByTour.set(String(task.tour_id), [...(tasksByTour.get(String(task.tour_id)) || []), task])
  }

  const sourceUnavailable = [tasksResult, mapsResult, acknowledgementsResult, staffingResult]
    .some((result) => result.health.status === "unavailable")
  const attention: LogisticsAttentionItem[] = []
  const now = Date.now()
  for (const task of tasksResult.data) {
    if (isClosedTask(task.status)) continue
    const severity = severityForTask(task, now)
    const dueAt = task.due_date ? String(task.due_date) : null
    const isOverdue = dueAt ? Date.parse(dueAt) < now : false
    const isAttention = severity !== "low" || isOverdue || !task.assigned_to_user_id || normalizedStatus(task.status) === "blocked"
    if (!isAttention) continue
    const domain = taskDomain(task)
    attention.push({
      id: `task:${task.id}`,
      severity,
      domain,
      title: String(task.title || "Untitled logistics task"),
      reason: normalizedStatus(task.status) === "blocked"
        ? "Task is blocked"
        : isOverdue
          ? "Task is overdue"
          : !task.assigned_to_user_id
            ? "Task needs an owner"
            : `${String(task.priority || "normal")} priority task`,
      tourId: task.tour_id ? String(task.tour_id) : null,
      eventId: task.event_id ? String(task.event_id) : null,
      stopId: null,
      ownerId: task.assigned_to_user_id ? String(task.assigned_to_user_id) : null,
      ownerName: displayName(profiles.get(String(task.assigned_to_user_id || ""))),
      dueAt,
      updatedAt: task.updated_at ? String(task.updated_at) : null,
      href: taskRemediationHref(task, domain),
    })
  }

  for (const event of events) {
    const eventMaps = mapsByEvent.get(String(event.id)) || []
    if (mapsResult.health.status === "ready" && eventMaps.length === 0) {
      attention.push({
        id: `event:${event.id}:missing-map`,
        severity: "medium",
        domain: "site_maps",
        title: `Create a site map for ${String(event.title || "event")}`,
        reason: "No site map is attached to this event",
        tourId: tourByEvent.get(String(event.id)) || null,
        eventId: String(event.id),
        stopId: null,
        ownerId: event.created_by ? String(event.created_by) : null,
        ownerName: displayName(profiles.get(String(event.created_by || ""))),
        dueAt: event.start_at ? String(event.start_at) : null,
        updatedAt: event.updated_at ? String(event.updated_at) : null,
        href: logisticsOverviewHref({ tab: "maps", eventId: String(event.id), tourId: tourByEvent.get(String(event.id)) }),
      })
    }
  }

  for (const shift of staffingResult.data) {
    if (shift.staff_member_id || ["cancelled", "canceled", "completed"].includes(normalizedStatus(shift.status))) continue
    const dueAt = shift.shift_date
      ? `${String(shift.shift_date)}T${String(shift.start_time || "00:00:00")}`
      : null
    const dueTime = dueAt ? Date.parse(dueAt) : Number.NaN
    const severity: LogisticsAttentionSeverity = Number.isFinite(dueTime) && dueTime < now
      ? "critical"
      : Number.isFinite(dueTime) && dueTime - now <= 24 * 60 * 60 * 1000
        ? "high"
        : "medium"
    const shiftEventId = shift.event_id ? String(shift.event_id) : null
    const shiftTourId = shiftEventId ? tourByEvent.get(shiftEventId) || null : null
    attention.push({
      id: `staff-shift:${shift.id}`,
      severity,
      domain: "staffing",
      title: `Uncovered ${String(shift.role_assignment || "staff")} shift`,
      reason: "No staff member is assigned",
      tourId: shiftTourId,
      eventId: shiftEventId,
      stopId: null,
      ownerId: null,
      ownerName: null,
      dueAt,
      updatedAt: shift.updated_at ? String(shift.updated_at) : null,
      href: shiftEventId
        ? `/admin/dashboard/hiring/scheduling?eventId=${encodeURIComponent(shiftEventId)}`
        : "/admin/dashboard/hiring/scheduling",
    })
  }

  const filteredAttention = attention
    .filter((item) => args.query.domain.length === 0 || args.query.domain.includes(item.domain))
    .filter((item) => args.query.severity.length === 0 || args.query.severity.includes(item.severity))
    .filter((item) => !args.query.ownerId || item.ownerId === args.query.ownerId)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || Date.parse(a.dueAt || "9999") - Date.parse(b.dueAt || "9999"))

  const eventRows: LogisticsEventRow[] = events.map((event) => {
    const eventId = String(event.id)
    const eventTasks = tasksByEvent.get(eventId) || []
    const eventMaps = mapsByEvent.get(eventId) || []
    const eventAcks = pendingAcknowledgements.filter((row) => String(row.event_id || "") === eventId).length
    const readiness = readinessFor({
      tasks: eventTasks,
      publishedMap: eventMaps.some((map) => normalizedStatus(map.status) === "published"),
      draftMap: eventMaps.some((map) => normalizedStatus(map.status) === "draft"),
      pendingAcknowledgements: eventAcks,
      sourceUnavailable,
      uncoveredShifts: staffingResult.data.filter((shift) => (
        String(shift.event_id || "") === eventId
        && !shift.staff_member_id
        && !["cancelled", "canceled", "completed"].includes(normalizedStatus(shift.status))
      )).length,
    })
    const topBlocker = filteredAttention.find((item) => item.eventId === eventId)?.reason || null
    const ownerId = event.created_by ? String(event.created_by) : null
    const tourId = tourByEvent.get(eventId) || null
    const venue = venues.get(String(event.venue_id || ""))
    return {
      id: eventId,
      tourId,
      title: String(event.title || "Untitled event"),
      status: event.status ? String(event.status) : null,
      startAt: event.start_at ? String(event.start_at) : null,
      timezone: event.timezone ? String(event.timezone) : null,
      venueName: venue?.name ? String(venue.name) : null,
      venueLocation: null,
      ownerId,
      ownerName: displayName(profiles.get(ownerId || "")),
      readiness,
      topBlocker,
      updatedAt: event.updated_at ? String(event.updated_at) : null,
      href: logisticsOverviewHref({ tab: "overview", tourId, eventId }),
    }
  })

  const tourRows: LogisticsTourRow[] = tours.map((tour) => {
    const tourId = String(tour.id)
    const tourEventIds = tourEventResult.data.filter((row) => String(row.tour_id) === tourId).map((row) => String(row.event_id))
    const tourTasks = uniqueRows([
      ...(tasksByTour.get(tourId) || []),
      ...tourEventIds.flatMap((eventId) => tasksByEvent.get(eventId) || []),
    ])
    const tourMaps = uniqueRows([
      ...(mapsByTour.get(tourId) || []),
      ...tourEventIds.flatMap((eventId) => mapsByEvent.get(eventId) || []),
    ])
    const tourAcks = pendingAcknowledgements.filter((row) => String(row.tour_id || "") === tourId || tourEventIds.includes(String(row.event_id || ""))).length
    const ownerId = tour.created_by ? String(tour.created_by) : tour.user_id ? String(tour.user_id) : null
    return {
      id: tourId,
      name: String(tour.name || "Untitled tour"),
      status: tour.status ? String(tour.status) : null,
      startDate: tour.start_date ? String(tour.start_date) : null,
      endDate: tour.end_date ? String(tour.end_date) : null,
      ownerId,
      ownerName: displayName(profiles.get(ownerId || "")),
      eventCount: tourEventIds.length,
      attentionCount: filteredAttention.filter((item) => item.tourId === tourId || (item.eventId && tourEventIds.includes(item.eventId))).length,
      readiness: readinessFor({
        tasks: tourTasks,
        publishedMap: tourMaps.some((map) => normalizedStatus(map.status) === "published"),
        draftMap: tourMaps.some((map) => normalizedStatus(map.status) === "draft"),
        pendingAcknowledgements: tourAcks,
        sourceUnavailable,
        uncoveredShifts: staffingResult.data.filter((shift) => (
          tourEventIds.includes(String(shift.event_id || ""))
          && !shift.staff_member_id
          && !["cancelled", "canceled", "completed"].includes(normalizedStatus(shift.status))
        )).length,
      }),
      updatedAt: tour.updated_at ? String(tour.updated_at) : null,
      href: logisticsOverviewHref({ tab: "overview", tourId }),
    }
  })

  const timeline: LogisticsTimelineItem[] = [
    ...eventRows.flatMap((event) => event.startAt ? [{
      id: `event:${event.id}`,
      kind: "event" as const,
      title: event.title,
      occursAt: event.startAt,
      tourId: event.tourId,
      eventId: event.id,
      href: event.href,
    }] : []),
    ...tasksResult.data.flatMap((task) => task.due_date && !isClosedTask(task.status) ? [{
      id: `task:${task.id}`,
      kind: "task" as const,
      title: String(task.title || "Logistics task"),
      occursAt: String(task.due_date),
      tourId: task.tour_id ? String(task.tour_id) : null,
      eventId: task.event_id ? String(task.event_id) : null,
      href: taskRemediationHref(task, taskDomain(task)),
    }] : []),
  ].sort((a, b) => Date.parse(a.occursAt) - Date.parse(b.occursAt)).slice(0, 50)

  const daySheetByEvent = new Map(daySheetsResult.data.map((row) => [String(row.event_id), row]))
  const staleDaySheets = events.filter((event) => {
    const sheet = daySheetByEvent.get(String(event.id))
    return Boolean(sheet?.updated_at && event.updated_at && Date.parse(String(event.updated_at)) > Date.parse(String(sheet.updated_at)))
  }).length
  const overdueTasks = tasksResult.data.filter((task) => !isClosedTask(task.status) && task.due_date && Date.parse(String(task.due_date)) < now).length
  const unassignedTasks = tasksResult.data.filter((task) => !isClosedTask(task.status) && !task.assigned_to_user_id).length
  const eventIdsWithMaps = new Set(mapsResult.data.map((map) => map.event_v2_id).filter(Boolean).map(String))

  const domainCounts = new Map<LogisticsOverviewDomain, number>()
  const severityCounts = new Map<LogisticsAttentionSeverity, number>()
  const ownerCounts = new Map<string, { name: string; count: number }>()
  for (const item of filteredAttention) {
    domainCounts.set(item.domain, (domainCounts.get(item.domain) || 0) + 1)
    severityCounts.set(item.severity, (severityCounts.get(item.severity) || 0) + 1)
    if (item.ownerId) {
      const current = ownerCounts.get(item.ownerId)
      ownerCounts.set(item.ownerId, { name: item.ownerName || "Assigned user", count: (current?.count || 0) + 1 })
    }
  }

  const sources = [
    eventsResult.health,
    toursResult.health,
    tasksResult.health,
    mapsResult.health,
    acknowledgementsResult.health,
    daySheetsResult.health,
    staffingResult.health,
    profilesResult.health,
  ].filter((source, index, all) => all.findIndex((candidate) => candidate.domain === source.domain) === index)

  return {
    organizationId: scope.orgId,
    generatedAt,
    scope: {
      mode: args.query.eventId ? "event" : args.query.tourId ? "tour" : "organization",
      ...(args.query.tourId ? { tourId: args.query.tourId } : {}),
      ...(args.query.eventId ? { eventId: args.query.eventId } : {}),
    },
    summary: {
      activeTours: tourRows.filter((tour) => ["active", "planning"].includes(normalizedStatus(tour.status))).length,
      upcomingEvents: eventRows.length,
      blockers: filteredAttention.filter((item) => item.severity === "critical").length,
      attentionCount: filteredAttention.length,
      overdueTasks,
      unassignedTasks,
      pendingAcknowledgements: pendingAcknowledgements.length,
      missingMaps: mapsResult.health.status === "ready" ? eventRows.filter((event) => !eventIdsWithMaps.has(event.id)).length : 0,
      unpublishedMaps: mapsResult.data.filter((map) => normalizedStatus(map.status) === "draft").length,
      staleDaySheets,
    },
    tours: args.query.attentionOnly ? tourRows.filter((tour) => tour.attentionCount > 0) : tourRows,
    events: args.query.attentionOnly ? eventRows.filter((event) => Boolean(event.topBlocker)) : eventRows,
    attention: filteredAttention,
    timeline,
    facets: {
      domains: Array.from(domainCounts, ([value, count]) => ({ value, count })),
      severities: Array.from(severityCounts, ([value, count]) => ({ value, count })),
      owners: Array.from(ownerCounts, ([id, value]) => ({ id, ...value })),
    },
    sources,
  }
}
