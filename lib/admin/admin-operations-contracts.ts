export type AdminEntityType = "tour" | "event"

export type AdminReadinessStatus = "ready" | "needs_attention" | "at_risk" | "blocked"

export type AdminPublicationStatus =
  | "never_published"
  | "published"
  | "changes_pending"
  | "failed"

export interface ReadinessSummaryDTO {
  status: AdminReadinessStatus
  score: number
  blockerCount: number
  warningCount: number
  label: string
}

export interface PublicationSummaryDTO {
  status: AdminPublicationStatus
  label: string
  lastPublishedAt: string | null
  changesPending: boolean
  failureCount: number
}

export interface AttentionIssueDTO {
  id: string
  entityType: AdminEntityType
  entityId: string
  title: string
  severity: "info" | "warning" | "critical"
  dimension: string
  ownerUserId: string | null
  dueAt: string | null
  sourceUrl: string | null
}

export interface AdminListPageDTO<TFilters extends Record<string, unknown> = Record<string, unknown>> {
  totalCount: number
  nextCursor: string | null
  limit: number
  sort: string
  order: "asc" | "desc"
  filters: TFilters
}

export interface AdminOperationsListResponseDTO<
  TItem,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
  TSummary extends Record<string, unknown> = Record<string, unknown>,
> {
  success: boolean
  orgId: string
  items: TItem[]
  page: AdminListPageDTO<TFilters>
  summary: TSummary
  attention: AttentionIssueDTO[]
}

export interface AdminTourSummaryDTO {
  id: string
  org_id: string | null
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  main_artist: string | null
  event_count: number
  completed_events: number
  expected_revenue: number
  expenses: number
  readiness: ReadinessSummaryDTO
  publication: PublicationSummaryDTO
}

export interface AdminEventSummaryDTO {
  id: string
  org_id: string | null
  name: string
  status: string
  event_date: string | null
  event_time: string | null
  venue_id: string | null
  venue_name: string | null
  capacity: number
  tickets_sold: number
  expected_revenue: number
  expenses: number
  tour: { id: string; name: string } | null
  tours: Array<{ id: string; name: string; is_primary?: boolean }>
  readiness: ReadinessSummaryDTO
  publication: PublicationSummaryDTO
}

export function summarizeReadiness(input: unknown): ReadinessSummaryDTO {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const score = typeof record.score === "number" && Number.isFinite(record.score)
    ? Math.max(0, Math.min(100, Math.round(record.score)))
    : 0
  const blockers = Array.isArray(record.blockers) ? record.blockers.length : 0
  const items = Array.isArray(record.items) ? record.items as Array<Record<string, unknown>> : []
  const warningCount = items.filter((item) => {
    const state = String(item.state || "")
    return state === "needs_advance" || state === "in_progress" || state === "missing"
  }).length
  const status: AdminReadinessStatus =
    blockers > 0 ? "blocked" : score >= 85 ? "ready" : score >= 60 ? "at_risk" : "needs_attention"
  return {
    status,
    score,
    blockerCount: blockers,
    warningCount,
    label:
      status === "ready"
        ? "Ready"
        : status === "blocked"
          ? "Blocked"
          : status === "at_risk"
            ? "At Risk"
            : "Needs Attention",
  }
}

export function defaultPublicationSummary(): PublicationSummaryDTO {
  return {
    status: "never_published",
    label: "Never Published",
    lastPublishedAt: null,
    changesPending: false,
    failureCount: 0,
  }
}

export function buildAttentionIssues(args: {
  entityType: AdminEntityType
  entityId: string
  readiness: unknown
  sourceBasePath: string
  limit?: number
}): AttentionIssueDTO[] {
  const record = args.readiness && typeof args.readiness === "object"
    ? args.readiness as Record<string, unknown>
    : {}
  const blockers = Array.isArray(record.blockers) ? record.blockers as Array<Record<string, unknown>> : []
  const items = Array.isArray(record.items) ? record.items as Array<Record<string, unknown>> : []
  const rows = blockers.length > 0
    ? blockers
    : items.filter((item) => ["missing", "blocked", "needs_advance"].includes(String(item.state || "")))

  return rows.slice(0, args.limit ?? 3).map((item, index) => {
    const id = typeof item.id === "string" && item.id ? item.id : `attention-${index}`
    const severity = String(item.state || "") === "blocked" || Boolean(item.blocksPublish)
      ? "critical"
      : "warning"
    return {
      id: `${args.entityType}:${args.entityId}:${id}`,
      entityType: args.entityType,
      entityId: args.entityId,
      title: String(item.label || item.id || "Needs attention"),
      severity,
      dimension: id,
      ownerUserId: null,
      dueAt: null,
      sourceUrl: `${args.sourceBasePath}/${args.entityId}`,
    }
  })
}
