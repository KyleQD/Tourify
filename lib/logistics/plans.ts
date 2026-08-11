import { readTourPlan, type TourPlanView } from "@/lib/admin/tour-plan.service"
import {
  buildLogisticsReadiness,
  countsFromStatuses,
  type DimensionCounts,
  type LogisticsDimension,
  type LogisticsReadinessDimension,
} from "@/lib/logistics/readiness"

type SupabaseLike = { from: (table: string) => any }

export type LogisticsPlanLifecycle = "draft" | "active" | "ready" | "published" | "archived"
export type LogisticsIssueSeverity = "info" | "warning" | "blocking"
export type LogisticsDaySheetState = "missing" | "draft" | "published" | "stale" | "not_applicable"

export interface LogisticsDomainRollup {
  id: LogisticsDimension
  label: string
  targetTab: string
  state: LogisticsReadinessDimension["state"]
  total: number
  completed: number
  issues: number
}

export interface LogisticsDaySheetSummary {
  state: LogisticsDaySheetState
  label: string
  href: string | null
  updatedAt: string | null
  distributedAt: string | null
  version: number | null
}

export interface LogisticsPlanIssue {
  id: string
  code: string
  title: string
  detail: string | null
  severity: LogisticsIssueSeverity
  status: "open" | "waived" | "resolved"
  tourStopId: string | null
  eventId: string | null
  targetTab: string
  targetHref: string
  affectedAudience: string
  assignedTo: string | null
}

export interface LogisticsPlanStopSummary {
  tourStopId: string | null
  eventId: string | null
  ordinal: number
  name: string
  venue: string | null
  date: string | null
  time: string | null
  market: string | null
  status: string
  issueCount: number
  blockingIssueCount: number
  taskCount: number
  overrideCount: number
  assignedPeopleCount: number
  pendingAcknowledgementCount: number
  domainRollups: LogisticsDomainRollup[]
  daySheet: LogisticsDaySheetSummary
  targetHref: string
}

export interface LogisticsPlanSummary {
  tourId: string
  orgId: string
  tourVersionId: string | null
  tourPlanVersion: number
  operationsVersion: number
  lifecycle: LogisticsPlanLifecycle
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  stops: LogisticsPlanStopSummary[]
  readiness: LogisticsReadinessDimension[]
  issues: LogisticsPlanIssue[]
  counts: {
    stops: number
    tasks: number
    overrides: number
    openIssues: number
    blockingIssues: number
    staleDaySheets: number
    missingDaySheets: number
    pendingAcknowledgements: number
    assignedPeople: number
  }
  lastHydratedAt: string | null
  latestActivityAt: string | null
}

export interface LogisticsHydrationPreview {
  tourId: string
  tourVersionId: string | null
  operationsVersion: number
  counts: {
    sourceStops: number
    syncedStops: number
    overriddenFields: number
    sourceMissing: number
    conflicts: number
  }
  sourceMissingStopIds: string[]
  conflicts: Array<{ tourStopId: string; fieldKey: string; sourceValue: unknown; overrideValue: unknown }>
}

interface CanonicalStopRow {
  id: string
  ordinal: number
  event_id: string | null
  tour_version_id: string | null
}

function isMissingSchema(error: any): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

function asLifecycle(value: unknown): LogisticsPlanLifecycle {
  return value === "active" || value === "ready" || value === "published" || value === "archived"
    ? value
    : "draft"
}

function taskDimension(type: unknown): keyof ReturnType<typeof emptyDimensions> {
  const value = String(type || "").toLowerCase()
  if (value.includes("transport")) return "transport"
  if (value.includes("flight") || value.includes("travel") || value.includes("lodging") || value.includes("hotel")) return "travel"
  if (value.includes("equipment")) return "equipment"
  if (value.includes("backline")) return "backline"
  if (value.includes("catering") || value.includes("hospitality")) return "catering"
  if (value.includes("communication") || value.includes("comms")) return "comms"
  if (value.includes("site") || value.includes("map")) return "siteMap"
  return "transport"
}

const DIMENSION_META: Record<LogisticsDimension, { label: string; tab: string }> = {
  transport: { label: "Transport", tab: "transportation" },
  travel: { label: "Travel / Lodging", tab: "accommodations" },
  equipment: { label: "Equipment", tab: "equipment" },
  backline: { label: "Backline", tab: "backline" },
  catering: { label: "Catering", tab: "catering" },
  comms: { label: "Comms", tab: "communication" },
  site_map: { label: "Site Map", tab: "site-maps" },
}

function toDimensionId(key: keyof ReturnType<typeof emptyDimensions>): LogisticsDimension {
  return key === "siteMap" ? "site_map" : key
}

function dimensionFromText(...values: unknown[]): LogisticsDimension {
  const haystack = values.map((value) => String(value || "").toLowerCase()).join(" ")
  if (haystack.includes("transport") || haystack.includes("pickup") || haystack.includes("driver")) return "transport"
  if (haystack.includes("flight") || haystack.includes("travel") || haystack.includes("lodging") || haystack.includes("hotel") || haystack.includes("room")) return "travel"
  if (haystack.includes("equipment") || haystack.includes("asset") || haystack.includes("rental")) return "equipment"
  if (haystack.includes("backline") || haystack.includes("gear")) return "backline"
  if (haystack.includes("catering") || haystack.includes("hospitality") || haystack.includes("meal")) return "catering"
  if (haystack.includes("site") || haystack.includes("map") || haystack.includes("zone")) return "site_map"
  if (haystack.includes("day_sheet") || haystack.includes("day sheet") || haystack.includes("publish")) return "comms"
  return "comms"
}

function logisticHref(args: {
  tourId: string
  eventId?: string | null
  tab?: string | null
  stopId?: string | null
  issueId?: string | null
  panel?: string | null
}) {
  const params = new URLSearchParams()
  params.set("tourId", args.tourId)
  if (args.eventId) params.set("eventId", args.eventId)
  if (args.tab) params.set("tab", args.tab)
  if (args.stopId) params.set("stopId", args.stopId)
  if (args.issueId) params.set("issueId", args.issueId)
  if (args.panel) params.set("panel", args.panel)
  return `/admin/dashboard/logistics?${params.toString()}`
}

function emptyDimensions() {
  return {
    transport: [] as string[],
    travel: [] as string[],
    equipment: [] as string[],
    backline: [] as string[],
    catering: [] as string[],
    comms: [] as string[],
    siteMap: [] as string[],
  }
}

async function loadCanonicalStops(args: { supabase: SupabaseLike; tourId: string }): Promise<CanonicalStopRow[]> {
  const { data, error } = await args.supabase
    .from("tour_stops")
    .select("id, ordinal, event_id, tour_version_id")
    .eq("tour_id", args.tourId)
    .eq("status", "active")
    .order("ordinal", { ascending: true })
  if (error) {
    if (isMissingSchema(error)) return []
    throw new Error(error.message)
  }
  return (data || []) as CanonicalStopRow[]
}

async function loadPlanState(args: { supabase: SupabaseLike; tourId: string }) {
  const { data, error } = await args.supabase
    .from("logistics_plan_state")
    .select("tour_id, hydrated_tour_version_id, lifecycle, operations_version, hydrated_at")
    .eq("tour_id", args.tourId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as {
    tour_id: string
    hydrated_tour_version_id: string | null
    lifecycle: string
    operations_version: number
    hydrated_at: string | null
  } | null
}

async function loadPlanInputs(args: { supabase: SupabaseLike; userId: string; orgId: string; tourId: string }) {
  const [plan, canonicalStops, state, tasksResult, issuesResult, overridesResult, ackResult] = await Promise.all([
    readTourPlan(args),
    loadCanonicalStops(args),
    loadPlanState(args),
    args.supabase.from("logistics_tasks").select("id, type, status, event_id, assigned_to_user_id, updated_at, due_date").eq("tour_id", args.tourId),
    args.supabase
      .from("logistics_issues")
      .select("id, code, title, detail, severity, status, tour_stop_id, event_id, assigned_to, updated_at, created_at")
      .eq("org_id", args.orgId)
      .eq("tour_id", args.tourId)
      .order("created_at", { ascending: false }),
    args.supabase
      .from("logistics_stop_overrides")
      .select("tour_stop_id, field_key, value, source_value, sync_status, updated_at")
      .eq("org_id", args.orgId)
      .eq("tour_id", args.tourId),
    args.supabase
      .from("logistics_acknowledgements")
      .select("event_id, status, user_id, updated_at")
      .eq("org_id", args.orgId)
      .eq("tour_id", args.tourId),
  ])
  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (issuesResult.error) throw new Error(issuesResult.error.message)
  if (overridesResult.error) throw new Error(overridesResult.error.message)
  if (ackResult.error && !isMissingSchema(ackResult.error)) throw new Error(ackResult.error.message)
  const eventIds = Array.from(new Set(plan.stops.map((stop) => stop.event_id).filter(Boolean).map(String)))
  const daySheets = await loadDaySheets({ supabase: args.supabase, eventIds })
  return {
    plan,
    canonicalStops,
    state,
    tasks: tasksResult.data || [],
    issues: issuesResult.data || [],
    overrides: overridesResult.data || [],
    acknowledgements: ackResult.error && isMissingSchema(ackResult.error) ? [] : ackResult.data || [],
    daySheets,
  }
}

async function loadDaySheets(args: { supabase: SupabaseLike; eventIds: string[] }) {
  if (args.eventIds.length === 0) return []
  const query = args.supabase
    .from("day_sheets")
    .select("event_id, updated_at, distributed_at, version, status")
  const result = typeof query.in === "function"
    ? await query.in("event_id", args.eventIds)
    : await query
  if (result.error) {
    if (isMissingSchema(result.error)) return []
    throw new Error(result.error.message)
  }
  return result.data || []
}

function latestIso(values: Array<unknown>): string | null {
  let latest = 0
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(String(value))
    if (Number.isFinite(time) && time > latest) latest = time
  }
  return latest ? new Date(latest).toISOString() : null
}

function buildDaySheetState(args: {
  tourId: string
  eventId: string | null
  daySheet: any | undefined
  materialUpdatedAt: string | null
}): LogisticsDaySheetSummary {
  if (!args.eventId) {
    return { state: "not_applicable", label: "No event", href: null, updatedAt: null, distributedAt: null, version: null }
  }
  const href = `/admin/dashboard/events/${args.eventId}/day-sheet?tourId=${encodeURIComponent(args.tourId)}`
  if (!args.daySheet) {
    return { state: "missing", label: "Needs day sheet", href, updatedAt: null, distributedAt: null, version: null }
  }
  const updatedAt = args.daySheet.updated_at ? String(args.daySheet.updated_at) : null
  const distributedAt = args.daySheet.distributed_at ? String(args.daySheet.distributed_at) : null
  const isStale = Boolean(
    updatedAt &&
    args.materialUpdatedAt &&
    Date.parse(args.materialUpdatedAt) > Date.parse(updatedAt),
  )
  if (isStale) {
    return { state: "stale", label: "Day sheet stale", href, updatedAt, distributedAt, version: Number(args.daySheet.version || 0) || null }
  }
  if (distributedAt) {
    return { state: "published", label: "Distributed", href, updatedAt, distributedAt, version: Number(args.daySheet.version || 0) || null }
  }
  return { state: "draft", label: "Draft ready", href, updatedAt, distributedAt, version: Number(args.daySheet.version || 0) || null }
}

function rollupFromCounts(args: {
  id: LogisticsDimension
  counts: DimensionCounts
  issueCount: number
}): LogisticsDomainRollup {
  const state =
    args.counts.total === 0 && args.issueCount === 0
      ? "missing"
      : args.issueCount > 0
        ? "at_risk"
        : args.counts.completed >= args.counts.total && args.counts.total > 0
          ? "ready"
          : args.counts.confirmed > 0 || args.counts.completed > 0
            ? "in_progress"
            : "not_started"
  const meta = DIMENSION_META[args.id]
  return {
    id: args.id,
    label: meta.label,
    targetTab: meta.tab,
    state,
    total: args.counts.total,
    completed: args.counts.completed,
    issues: args.issueCount,
  }
}

export async function getLogisticsPlanSummary(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
}): Promise<LogisticsPlanSummary> {
  const { plan, canonicalStops, state, tasks, issues, overrides, acknowledgements, daySheets } = await loadPlanInputs(args)
  const canonicalByOrdinal = new Map(canonicalStops.map((stop) => [stop.ordinal, stop]))
  const issueRows = issues as Array<any>
  const overrideRows = overrides as Array<any>
  const taskRows = tasks as Array<any>
  const ackRows = acknowledgements as Array<any>
  const daySheetRows = daySheets as Array<any>
  const dimensions = emptyDimensions()
  for (const task of taskRows) dimensions[taskDimension(task.type)].push(String(task.status || "draft"))

  const issueByStop = new Map<string, { total: number; blocking: number }>()
  const issueByStopDimension = new Map<string, Map<LogisticsDimension, number>>()
  for (const issue of issueRows) {
    if (!issue.tour_stop_id || issue.status !== "open") continue
    const current = issueByStop.get(String(issue.tour_stop_id)) || { total: 0, blocking: 0 }
    current.total += 1
    if (issue.severity === "blocking") current.blocking += 1
    issueByStop.set(String(issue.tour_stop_id), current)
    const dimension = dimensionFromText(issue.code, issue.title, issue.detail)
    const stopId = String(issue.tour_stop_id)
    const currentDimensions = issueByStopDimension.get(stopId) || new Map<LogisticsDimension, number>()
    currentDimensions.set(dimension, (currentDimensions.get(dimension) || 0) + 1)
    issueByStopDimension.set(stopId, currentDimensions)
  }
  const overridesByStop = new Map<string, number>()
  const overrideUpdatedByStop = new Map<string, string | null>()
  for (const override of overrideRows) {
    const stopId = String(override.tour_stop_id)
    overridesByStop.set(stopId, (overridesByStop.get(stopId) || 0) + 1)
    overrideUpdatedByStop.set(stopId, latestIso([overrideUpdatedByStop.get(stopId), override.updated_at]))
  }
  const tasksByEvent = new Map<string, number>()
  const assignedByEvent = new Map<string, Set<string>>()
  const taskUpdatedByEvent = new Map<string, string | null>()
  const taskStatusesByEventDimension = new Map<string, ReturnType<typeof emptyDimensions>>()
  for (const task of taskRows) {
    if (!task.event_id) continue
    const eventId = String(task.event_id)
    tasksByEvent.set(eventId, (tasksByEvent.get(eventId) || 0) + 1)
    taskUpdatedByEvent.set(eventId, latestIso([taskUpdatedByEvent.get(eventId), task.updated_at]))
    if (task.assigned_to_user_id) {
      const assigned = assignedByEvent.get(eventId) || new Set<string>()
      assigned.add(String(task.assigned_to_user_id))
      assignedByEvent.set(eventId, assigned)
    }
    const eventDimensions = taskStatusesByEventDimension.get(eventId) || emptyDimensions()
    eventDimensions[taskDimension(task.type)].push(String(task.status || "draft"))
    taskStatusesByEventDimension.set(eventId, eventDimensions)
  }
  const pendingAcksByEvent = new Map<string, number>()
  const ackUpdatedByEvent = new Map<string, string | null>()
  const assignedAckPeople = new Set<string>()
  for (const ack of ackRows) {
    if (ack.user_id) assignedAckPeople.add(String(ack.user_id))
    if (!ack.event_id) continue
    const eventId = String(ack.event_id)
    if (ack.status === "pending") pendingAcksByEvent.set(eventId, (pendingAcksByEvent.get(eventId) || 0) + 1)
    ackUpdatedByEvent.set(eventId, latestIso([ackUpdatedByEvent.get(eventId), ack.updated_at]))
  }
  const daySheetsByEvent = new Map(daySheetRows.filter((row) => row.event_id).map((row) => [String(row.event_id), row]))
  const openIssues = issueRows.filter((issue) => issue.status === "open")
  const sourceVersionId = canonicalStops[0]?.tour_version_id || state?.hydrated_tour_version_id || null
  const stops = plan.stops.map((stop) => {
    const canonical = canonicalByOrdinal.get(stop.ordinal)
    const eventId = canonical?.event_id || stop.event_id
    const stopId = canonical?.id || null
    const stopIssues = stopId ? issueByStop.get(stopId) : undefined
    const eventDimensions = eventId ? taskStatusesByEventDimension.get(eventId) || emptyDimensions() : emptyDimensions()
    const domainRollups = Object.entries(eventDimensions).map(([key, statuses]) => {
      const dimensionId = toDimensionId(key as keyof ReturnType<typeof emptyDimensions>)
      return rollupFromCounts({
        id: dimensionId,
        counts: countsFromStatuses(statuses),
        issueCount: stopId ? issueByStopDimension.get(stopId)?.get(dimensionId) || 0 : 0,
      })
    })
    const issueUpdatedAt = latestIso(issueRows
      .filter((issue) => stopId && String(issue.tour_stop_id) === stopId)
      .map((issue) => issue.updated_at || issue.created_at))
    const materialUpdatedAt = latestIso([
      eventId ? taskUpdatedByEvent.get(eventId) : null,
      eventId ? ackUpdatedByEvent.get(eventId) : null,
      stopId ? overrideUpdatedByStop.get(stopId) : null,
      issueUpdatedAt,
    ])
    return {
      tourStopId: stopId,
      eventId,
      ordinal: stop.ordinal,
      name: stop.name,
      venue: stop.venue,
      date: stop.date,
      time: stop.time,
      market: stop.market,
      status: stop.advance_status,
      issueCount: stopIssues?.total || 0,
      blockingIssueCount: stopIssues?.blocking || 0,
      taskCount: eventId ? tasksByEvent.get(eventId) || 0 : 0,
      overrideCount: stopId ? overridesByStop.get(stopId) || 0 : 0,
      assignedPeopleCount: eventId ? assignedByEvent.get(eventId)?.size || 0 : 0,
      pendingAcknowledgementCount: eventId ? pendingAcksByEvent.get(eventId) || 0 : 0,
      domainRollups,
      daySheet: buildDaySheetState({
        tourId: args.tourId,
        eventId,
        daySheet: eventId ? daySheetsByEvent.get(eventId) : undefined,
        materialUpdatedAt,
      }),
      targetHref: logisticHref({ tourId: args.tourId, eventId, stopId, tab: "overview" }),
    }
  })
  const latestActivityAt = latestIso([
    state?.hydrated_at,
    ...taskRows.map((task) => task.updated_at),
    ...issueRows.map((issue) => issue.updated_at || issue.created_at),
    ...overrideRows.map((override) => override.updated_at),
    ...ackRows.map((ack) => ack.updated_at),
    ...daySheetRows.map((daySheet) => daySheet.updated_at || daySheet.distributed_at),
  ])
  const allAssignedPeople = new Set<string>(assignedAckPeople)
  for (const assigned of assignedByEvent.values()) {
    for (const userId of assigned) allAssignedPeople.add(userId)
  }

  return {
    tourId: plan.tourId,
    orgId: args.orgId,
    tourVersionId: sourceVersionId,
    tourPlanVersion: plan.planVersion,
    operationsVersion: state?.operations_version || 1,
    lifecycle: asLifecycle(state?.lifecycle),
    name: plan.name,
    description: plan.description,
    startDate: plan.start_date,
    endDate: plan.end_date,
    stops,
    readiness: buildLogisticsReadiness({
      transport: countsFromStatuses(dimensions.transport),
      travel: countsFromStatuses(dimensions.travel),
      equipment: countsFromStatuses(dimensions.equipment),
      backline: countsFromStatuses(dimensions.backline),
      catering: countsFromStatuses(dimensions.catering),
      comms: countsFromStatuses(dimensions.comms),
      siteMap: countsFromStatuses(dimensions.siteMap),
    }),
    issues: issueRows.map((issue) => ({
      id: String(issue.id),
      code: String(issue.code),
      title: String(issue.title),
      detail: issue.detail ? String(issue.detail) : null,
      severity: issue.severity as LogisticsIssueSeverity,
      status: issue.status,
      tourStopId: issue.tour_stop_id ? String(issue.tour_stop_id) : null,
      eventId: issue.event_id ? String(issue.event_id) : null,
      targetTab: DIMENSION_META[dimensionFromText(issue.code, issue.title, issue.detail)].tab,
      targetHref: logisticHref({
        tourId: args.tourId,
        eventId: issue.event_id ? String(issue.event_id) : null,
        stopId: issue.tour_stop_id ? String(issue.tour_stop_id) : null,
        issueId: String(issue.id),
        tab: DIMENSION_META[dimensionFromText(issue.code, issue.title, issue.detail)].tab,
      }),
      affectedAudience: issue.assigned_to ? "Assigned owner" : "Tour logistics team",
      assignedTo: issue.assigned_to ? String(issue.assigned_to) : null,
    })),
    counts: {
      stops: plan.stops.length,
      tasks: taskRows.length,
      overrides: overrideRows.length,
      openIssues: openIssues.length,
      blockingIssues: openIssues.filter((issue) => issue.severity === "blocking").length,
      staleDaySheets: stops.filter((stop) => stop.daySheet.state === "stale").length,
      missingDaySheets: stops.filter((stop) => stop.daySheet.state === "missing").length,
      pendingAcknowledgements: stops.reduce((sum, stop) => sum + stop.pendingAcknowledgementCount, 0),
      assignedPeople: allAssignedPeople.size,
    },
    lastHydratedAt: state?.hydrated_at || null,
    latestActivityAt,
  }
}

function sourceValue(stop: LogisticsPlanStopSummary, fieldKey: string): unknown {
  const values: Record<string, unknown> = {
    name: stop.name,
    venue: stop.venue,
    date: stop.date,
    time: stop.time,
    market: stop.market,
  }
  return values[fieldKey]
}

export async function previewLogisticsPlanHydration(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
}): Promise<LogisticsHydrationPreview> {
  const summary = await getLogisticsPlanSummary(args)
  const { data: overrides, error } = await args.supabase
    .from("logistics_stop_overrides")
    .select("tour_stop_id, field_key, value, source_value, sync_status")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
  if (error) throw new Error(error.message)
  const stopById = new Map(summary.stops.filter((stop) => stop.tourStopId).map((stop) => [stop.tourStopId!, stop]))
  const sourceMissingStopIds = Array.from(new Set((overrides || [])
    .map((override: any) => String(override.tour_stop_id))
    .filter((stopId: string) => !stopById.has(stopId))))
  const conflicts = (overrides || []).flatMap((override: any) => {
    const stop = stopById.get(String(override.tour_stop_id))
    if (!stop || override.sync_status !== "overridden") return []
    const currentSourceValue = sourceValue(stop, String(override.field_key))
    if (JSON.stringify(currentSourceValue) === JSON.stringify(override.source_value)) return []
    return [{
      tourStopId: String(override.tour_stop_id),
      fieldKey: String(override.field_key),
      sourceValue: currentSourceValue,
      overrideValue: override.value,
    }]
  })
  return {
    tourId: args.tourId,
    tourVersionId: summary.tourVersionId,
    operationsVersion: summary.operationsVersion,
    counts: {
      sourceStops: summary.stops.length,
      syncedStops: summary.stops.length - sourceMissingStopIds.length,
      overriddenFields: (overrides || []).length,
      sourceMissing: sourceMissingStopIds.length,
      conflicts: conflicts.length,
    },
    sourceMissingStopIds,
    conflicts,
  }
}

async function ensurePlanState(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
}) {
  const current = await loadPlanState(args)
  if (current) return current
  const { data, error } = await args.supabase
    .from("logistics_plan_state")
    .insert({ tour_id: args.tourId, org_id: args.orgId, created_by: args.userId, updated_by: args.userId })
    .select("tour_id, hydrated_tour_version_id, lifecycle, operations_version, hydrated_at")
    .single()
  if (!error) return data
  if (error.code !== "23505") throw new Error(error.message)
  const raced = await loadPlanState(args)
  if (!raced) throw new Error("Unable to create logistics plan state.")
  return raced
}

async function recordHydrationRun(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
  preview: LogisticsHydrationPreview
  mode: "preview" | "apply" | "validate"
  expectedOperationsVersion: number | null
}) {
  const { data, error } = await args.supabase
    .from("logistics_hydration_runs")
    .insert({
      org_id: args.orgId,
      tour_id: args.tourId,
      tour_version_id: args.preview.tourVersionId,
      mode: args.mode,
      status: args.preview.counts.conflicts || args.preview.counts.sourceMissing ? "partial" : "completed",
      expected_operations_version: args.expectedOperationsVersion,
      result_counts: args.preview.counts,
      details: { sourceMissingStopIds: args.preview.sourceMissingStopIds, conflicts: args.preview.conflicts },
      triggered_by: args.userId,
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data as { id: string }
}

export async function applyLogisticsPlanHydration(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
  expectedOperationsVersion: number
}): Promise<LogisticsPlanSummary> {
  const preview = await previewLogisticsPlanHydration(args)
  const state = await ensurePlanState(args)
  if (state.operations_version !== args.expectedOperationsVersion) {
    const error = new Error("This logistics plan changed. Refresh before applying hydration.") as Error & { status?: number; code?: string }
    error.status = 409
    error.code = "operations_version_conflict"
    throw error
  }
  const run = await recordHydrationRun({ ...args, preview, mode: "apply", expectedOperationsVersion: args.expectedOperationsVersion })
  const { data: updated, error } = await args.supabase
    .from("logistics_plan_state")
    .update({
      hydrated_tour_version_id: preview.tourVersionId,
      hydrated_at: new Date().toISOString(),
      updated_by: args.userId,
    })
    .eq("tour_id", args.tourId)
    .eq("operations_version", args.expectedOperationsVersion)
    .select("operations_version")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!updated) {
    const conflict = new Error("This logistics plan changed. Refresh before applying hydration.") as Error & { status?: number; code?: string }
    conflict.status = 409
    conflict.code = "operations_version_conflict"
    throw conflict
  }
  if (preview.sourceMissingStopIds.length || preview.conflicts.length) {
    const rows = [
      ...preview.sourceMissingStopIds.map((tourStopId) => ({
        org_id: args.orgId,
        tour_id: args.tourId,
        tour_version_id: preview.tourVersionId,
        tour_stop_id: tourStopId,
        code: "source_missing",
        title: "Source stop needs review",
        detail: "A logistics override is attached to a stop that is no longer in the tour source.",
        severity: "blocking",
        source_type: "hydration",
        source_id: run.id,
      })),
      ...preview.conflicts.map((conflict) => ({
        org_id: args.orgId,
        tour_id: args.tourId,
        tour_version_id: preview.tourVersionId,
        tour_stop_id: conflict.tourStopId,
        code: "source_override_conflict",
        title: "Source change conflicts with an override",
        detail: `The source changed ${conflict.fieldKey}; the manual override was preserved.`,
        severity: "warning",
        source_type: "hydration",
        source_id: run.id,
      })),
    ]
    if (rows.length) {
      const { error: issueError } = await args.supabase.from("logistics_issues").insert(rows)
      if (issueError) throw new Error(issueError.message)
    }
  }
  return getLogisticsPlanSummary(args)
}

export async function validateLogisticsPlan(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId: string
  expectedOperationsVersion: number
}): Promise<LogisticsPlanSummary> {
  const preview = await previewLogisticsPlanHydration(args)
  const state = await ensurePlanState(args)
  if (state.operations_version !== args.expectedOperationsVersion) {
    const conflict = new Error("This logistics plan changed. Refresh before validating.") as Error & { status?: number; code?: string }
    conflict.status = 409
    conflict.code = "operations_version_conflict"
    throw conflict
  }
  await recordHydrationRun({ ...args, preview, mode: "validate", expectedOperationsVersion: args.expectedOperationsVersion })
  const summary = await getLogisticsPlanSummary(args)
  const rows = summary.stops.flatMap((stop) => {
    if (!stop.tourStopId) return []
    const issues: Array<Record<string, unknown>> = []
    if (!stop.name.trim()) issues.push({ code: "missing_stop_name", title: "Stop name is missing", detail: "Add a name in the tour plan.", severity: "blocking" })
    if (!stop.date) issues.push({ code: "missing_stop_date", title: "Stop date is missing", detail: "Add a local date in the tour plan.", severity: "blocking" })
    return issues.map((issue) => ({
      ...issue,
      org_id: args.orgId,
      tour_id: args.tourId,
      tour_version_id: summary.tourVersionId,
      tour_stop_id: stop.tourStopId,
      source_type: "validation",
    }))
  })
  if (rows.length) {
    const { error } = await args.supabase.from("logistics_issues").insert(rows)
    if (error) throw new Error(error.message)
  }
  return getLogisticsPlanSummary(args)
}

export function summarizeTourForLogisticsPlan(plan: TourPlanView) {
  return {
    tourId: plan.tourId,
    name: plan.name,
    startDate: plan.start_date,
    endDate: plan.end_date,
    stopCount: plan.stops.length,
  }
}
