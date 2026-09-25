import { z } from "zod"

export const LOGISTICS_OVERVIEW_DOMAINS = [
  "events",
  "tasks",
  "travel",
  "lodging",
  "transport",
  "equipment",
  "backline",
  "catering",
  "staffing",
  "documents",
  "site_maps",
  "communications",
] as const

export type LogisticsOverviewDomain = (typeof LOGISTICS_OVERVIEW_DOMAINS)[number]
export type LogisticsAttentionSeverity = "critical" | "high" | "medium" | "low"
export type LogisticsReadinessState = "not_started" | "in_progress" | "blocked" | "ready"
export type LogisticsSourceStatus = "ready" | "degraded" | "unavailable"

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.string().optional().nullable().transform((raw, context) => {
    if (!raw) return [] as Array<T[number]>
    const parsed = Array.from(new Set(raw.split(",").map((value) => value.trim()).filter(Boolean)))
    const invalid = parsed.filter((value) => !values.includes(value))
    if (invalid.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported values: ${invalid.join(", ")}`,
      })
      return z.NEVER
    }
    return parsed as Array<T[number]>
  })

const logisticsOverviewQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional().nullable(),
  to: z.string().datetime({ offset: true }).optional().nullable(),
  search: z.string().trim().max(120).optional().default(""),
  tourId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  domain: csvEnum(LOGISTICS_OVERVIEW_DOMAINS),
  severity: csvEnum(["critical", "high", "medium", "low"] as const),
  ownerId: z.string().uuid().optional().nullable(),
  attentionOnly: z.enum(["true", "false"]).optional().default("false").transform((value) => value === "true"),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type LogisticsOverviewQuery = z.output<typeof logisticsOverviewQuerySchema>

export function parseLogisticsOverviewQuery(input: URLSearchParams): LogisticsOverviewQuery {
  const now = new Date()
  const defaultFrom = now.toISOString()
  const defaultTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const parsed = logisticsOverviewQuerySchema.safeParse({
    from: input.get("from") || defaultFrom,
    to: input.get("to") || defaultTo,
    search: input.get("search") || "",
    tourId: input.get("tourId") || undefined,
    eventId: input.get("eventId") || undefined,
    domain: input.get("domain"),
    severity: input.get("severity"),
    ownerId: input.get("ownerId") || undefined,
    attentionOnly: input.get("attentionOnly") || undefined,
    cursor: input.get("cursor"),
    limit: input.get("limit") || undefined,
  })
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map((issue) => issue.message).join("; "))
    ;(error as Error & { code?: string; status?: number }).code = "invalid_logistics_overview_query"
    ;(error as Error & { code?: string; status?: number }).status = 400
    throw error
  }
  if (Date.parse(parsed.data.from || "") > Date.parse(parsed.data.to || "")) {
    const error = new Error("The logistics overview start date must be before the end date.")
    ;(error as Error & { code?: string; status?: number }).code = "invalid_date_range"
    ;(error as Error & { code?: string; status?: number }).status = 400
    throw error
  }
  return parsed.data
}

export interface LogisticsReadiness {
  state: LogisticsReadinessState
  percentage: number | null
  reasons: string[]
}

export interface LogisticsTourRow {
  id: string
  name: string
  status: string | null
  startDate: string | null
  endDate: string | null
  ownerId: string | null
  ownerName: string | null
  eventCount: number
  attentionCount: number
  readiness: LogisticsReadiness
  updatedAt: string | null
  href: string
}

export interface LogisticsEventRow {
  id: string
  tourId: string | null
  title: string
  status: string | null
  startAt: string | null
  timezone: string | null
  venueName: string | null
  venueLocation: string | null
  ownerId: string | null
  ownerName: string | null
  readiness: LogisticsReadiness
  topBlocker: string | null
  updatedAt: string | null
  href: string
}

export interface LogisticsAttentionItem {
  id: string
  severity: LogisticsAttentionSeverity
  domain: LogisticsOverviewDomain
  title: string
  reason: string
  tourId: string | null
  eventId: string | null
  stopId: string | null
  ownerId: string | null
  ownerName: string | null
  dueAt: string | null
  updatedAt: string | null
  href: string
}

export interface LogisticsTimelineItem {
  id: string
  kind: "event" | "task"
  title: string
  occursAt: string
  tourId: string | null
  eventId: string | null
  href: string
}

export interface LogisticsSourceHealth {
  domain: LogisticsOverviewDomain
  status: LogisticsSourceStatus
  generatedAt?: string
  warning?: string
}

export interface AdminLogisticsOverview {
  organizationId: string
  generatedAt: string
  scope: {
    mode: "organization" | "tour" | "event"
    tourId?: string
    eventId?: string
  }
  summary: {
    activeTours: number
    upcomingEvents: number
    blockers: number
    attentionCount: number
    overdueTasks: number
    unassignedTasks: number
    pendingAcknowledgements: number
    missingMaps: number
    unpublishedMaps: number
    staleDaySheets: number
  }
  tours: LogisticsTourRow[]
  events: LogisticsEventRow[]
  attention: LogisticsAttentionItem[]
  timeline: LogisticsTimelineItem[]
  facets: {
    domains: Array<{ value: LogisticsOverviewDomain; count: number }>
    severities: Array<{ value: LogisticsAttentionSeverity; count: number }>
    owners: Array<{ id: string; name: string; count: number }>
  }
  sources: LogisticsSourceHealth[]
  nextCursor?: string
}

export function logisticsOverviewHref(args: {
  tab?: "overview" | "travel" | "production" | "communications" | "maps"
  tourId?: string | null
  eventId?: string | null
  panel?: string | null
  recordId?: string | null
  issueId?: string | null
  siteMapId?: string | null
}): string {
  const params = new URLSearchParams()
  params.set("tab", args.tab || "overview")
  if (args.tourId) params.set("tourId", args.tourId)
  if (args.eventId) params.set("eventId", args.eventId)
  if (args.panel) params.set("panel", args.panel)
  if (args.recordId) params.set("recordId", args.recordId)
  if (args.issueId) params.set("issueId", args.issueId)
  if (args.siteMapId) params.set("siteMapId", args.siteMapId)
  return `/admin/dashboard/logistics?${params.toString()}`
}

