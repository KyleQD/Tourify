/**
 * TOUR-207 — Archive impact preview.
 *
 * Identifies shares, jobs, and upcoming work before archive. Legal/financial
 * records are listed as preserved (never revoked/deleted by archive).
 */

import { isLegallyRetainedFromSettings } from "@/lib/admin/state-aware-authorization"
import { normalizeTourLifecycleState } from "@/lib/admin/tour-lifecycle"

export type TourArchiveImpactSeverity = "info" | "warning" | "blocking"

export interface TourArchiveImpactItem {
  id: string
  category: "shares" | "jobs" | "upcoming_work" | "preserved" | "blocker"
  severity: TourArchiveImpactSeverity
  label: string
  detail: string
  count?: number
  willRevoke?: boolean
  willPreserve?: boolean
}

export interface TourArchiveImpactCounts {
  activeGrants: number
  publicationShareTokens: number
  hasCalendarToken: boolean
  hasShareToken: boolean
  openDuplicateJobs: number
  openJobPostings: number
  upcomingEvents: number
  openLogisticsTasks: number
  financeTransactions: number
  settlements: number
  contracts: number
}

export interface TourArchivePreview {
  tourId: string
  orgId: string
  currentState: string | null
  canArchive: boolean
  blockers: TourArchiveImpactItem[]
  shares: TourArchiveImpactItem[]
  jobs: TourArchiveImpactItem[]
  upcomingWork: TourArchiveImpactItem[]
  preserved: TourArchiveImpactItem[]
  counts: TourArchiveImpactCounts
  requiresConfirmation: boolean
}

export function buildTourArchivePreview(args: {
  tourId: string
  orgId: string
  status: string | null | undefined
  settings?: Record<string, unknown> | null
  counts: TourArchiveImpactCounts
}): TourArchivePreview {
  const currentState = normalizeTourLifecycleState(args.status)
  const blockers: TourArchiveImpactItem[] = []
  const shares: TourArchiveImpactItem[] = []
  const jobs: TourArchiveImpactItem[] = []
  const upcomingWork: TourArchiveImpactItem[] = []
  const preserved: TourArchiveImpactItem[] = []

  const legallyRetained = isLegallyRetainedFromSettings(args.settings || {})
  if (legallyRetained) {
    blockers.push({
      id: "legal_hold",
      category: "blocker",
      severity: "blocking",
      label: "Legal hold",
      detail: "Legally retained tours cannot be archived until retention is released.",
    })
  }

  const archiveEligible =
    currentState === "completed"
    || currentState === "settled"
    || currentState === "cancelled"

  if (!archiveEligible) {
    blockers.push({
      id: "state_ineligible",
      category: "blocker",
      severity: "blocking",
      label: "Lifecycle state",
      detail: `Archive requires completed, settled, or cancelled (current: ${currentState || "unknown"}).`,
    })
  }

  if (args.counts.activeGrants > 0) {
    shares.push({
      id: "entity_grants",
      category: "shares",
      severity: "warning",
      label: "Delegated entity grants",
      detail: "Active tour grants will be revoked on archive.",
      count: args.counts.activeGrants,
      willRevoke: true,
    })
  }

  if (args.counts.publicationShareTokens > 0) {
    shares.push({
      id: "publication_share_tokens",
      category: "shares",
      severity: "warning",
      label: "Publication share tokens",
      detail: "Eligible share tokens will be revoked on archive.",
      count: args.counts.publicationShareTokens,
      willRevoke: true,
    })
  }

  if (args.counts.hasCalendarToken) {
    shares.push({
      id: "calendar_token",
      category: "shares",
      severity: "warning",
      label: "Calendar feed token",
      detail: "Calendar token will be cleared on archive.",
      count: 1,
      willRevoke: true,
    })
  }

  if (args.counts.hasShareToken) {
    shares.push({
      id: "share_token",
      category: "shares",
      severity: "warning",
      label: "Tour share token",
      detail: "Settings share token will be cleared on archive.",
      count: 1,
      willRevoke: true,
    })
  }

  if (args.counts.openDuplicateJobs > 0) {
    jobs.push({
      id: "duplicate_jobs",
      category: "jobs",
      severity: "warning",
      label: "In-flight duplication jobs",
      detail: "Queued/running duplicate jobs remain attached to the source tour (read-only after archive).",
      count: args.counts.openDuplicateJobs,
    })
  }

  if (args.counts.openJobPostings > 0) {
    jobs.push({
      id: "job_postings",
      category: "jobs",
      severity: "warning",
      label: "Open job postings",
      detail: "Open hiring postings stay linked; archive does not delete staffing records.",
      count: args.counts.openJobPostings,
    })
  }

  if (args.counts.upcomingEvents > 0) {
    upcomingWork.push({
      id: "upcoming_events",
      category: "upcoming_work",
      severity: "warning",
      label: "Upcoming stops",
      detail: "Future or open events remain on the tour in read-only form.",
      count: args.counts.upcomingEvents,
    })
  }

  if (args.counts.openLogisticsTasks > 0) {
    upcomingWork.push({
      id: "open_logistics",
      category: "upcoming_work",
      severity: "info",
      label: "Open logistics tasks",
      detail: "Open logistics work is preserved and becomes read-only with the tour.",
      count: args.counts.openLogisticsTasks,
    })
  }

  if (args.counts.financeTransactions > 0) {
    preserved.push({
      id: "finance_transactions",
      category: "preserved",
      severity: "info",
      label: "Financial transactions",
      detail: "Ledger rows are preserved; archive never deletes financial history.",
      count: args.counts.financeTransactions,
      willPreserve: true,
    })
  }

  if (args.counts.settlements > 0) {
    preserved.push({
      id: "settlements",
      category: "preserved",
      severity: "info",
      label: "Settlements",
      detail: "Settlement records are preserved for legal/financial retention.",
      count: args.counts.settlements,
      willPreserve: true,
    })
  }

  if (args.counts.contracts > 0) {
    preserved.push({
      id: "contracts",
      category: "preserved",
      severity: "info",
      label: "Contracts",
      detail: "Contract records are preserved; archive does not revoke legal instruments.",
      count: args.counts.contracts,
      willPreserve: true,
    })
  }

  const canArchive = blockers.length === 0
  return {
    tourId: args.tourId,
    orgId: args.orgId,
    currentState,
    canArchive,
    blockers,
    shares,
    jobs,
    upcomingWork,
    preserved,
    counts: args.counts,
    requiresConfirmation: canArchive && (shares.length > 0 || jobs.length > 0 || upcomingWork.length > 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

async function safeCount(
  supabase: SupabaseLike,
  table: string,
  apply: (query: any) => any,
): Promise<number> {
  try {
    let query = supabase.from(table).select("id", { count: "exact", head: true })
    query = apply(query)
    const { count, error } = await query
    if (error) return 0
    return typeof count === "number" ? count : 0
  } catch {
    return 0
  }
}

export async function collectTourArchiveImpactCounts(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
}): Promise<TourArchiveImpactCounts> {
  const settings =
    args.tour.settings && typeof args.tour.settings === "object" && !Array.isArray(args.tour.settings)
      ? (args.tour.settings as Record<string, unknown>)
      : {}

  const activeGrants = await safeCount(args.supabase, "entity_grants", (q) =>
    q
      .eq("org_id", args.orgId)
      .eq("resource_type", "tour")
      .eq("resource_id", args.tourId)
      .eq("status", "active"),
  )

  let pubTokens = await safeCount(args.supabase, "admin_publication_share_tokens", (q) =>
    q.eq("org_id", args.orgId).is("revoked_at", null).eq("aggregate_id", args.tourId),
  )
  if (pubTokens === 0) {
    pubTokens = await safeCount(args.supabase, "admin_publication_share_tokens", (q) =>
      q.eq("org_id", args.orgId).is("revoked_at", null).eq("tour_id", args.tourId),
    )
  }

  const openDuplicateJobs = await safeCount(args.supabase, "tour_duplicate_jobs", (q) =>
    q
      .eq("org_id", args.orgId)
      .eq("source_tour_id", args.tourId)
      .in("status", ["queued", "running", "paused"]),
  )

  const openJobPostings = await safeCount(args.supabase, "job_postings", (q) =>
    q.eq("tour_id", args.tourId).in("status", ["open", "published", "active"]),
  )

  let upcomingEvents = 0
  {
    const { data, error } = await args.supabase
      .from("tour_events")
      .select("event_id, events_v2:event_id(id, start_at, status)")
      .eq("tour_id", args.tourId)
      .limit(500)
    if (!error && Array.isArray(data)) {
      const now = Date.now()
      upcomingEvents = data.filter((link: Record<string, unknown>) => {
        const ev = (link.events_v2 || {}) as Record<string, unknown>
        const start = ev.start_at ? Date.parse(String(ev.start_at)) : NaN
        const status = String(ev.status || "")
        if (status === "cancelled" || status === "completed") return false
        if (!Number.isFinite(start)) return true
        return start >= now
      }).length
    }
  }

  const openLogisticsTasks = await safeCount(args.supabase, "logistics_tasks", (q) =>
    q.eq("tour_id", args.tourId).neq("status", "completed").neq("status", "cancelled"),
  )

  const financeTransactions = await safeCount(args.supabase, "financial_transactions", (q) =>
    q.eq("tour_id", args.tourId).eq("org_id", args.orgId),
  )

  const settlements = await safeCount(args.supabase, "settlements", (q) =>
    q.eq("tour_id", args.tourId),
  )

  const contracts = await safeCount(args.supabase, "contracts", (q) =>
    q.eq("tour_id", args.tourId),
  )

  return {
    activeGrants,
    publicationShareTokens: pubTokens,
    hasCalendarToken: Boolean(args.tour.calendar_token),
    hasShareToken: Boolean(settings.share_token || args.tour.share_token),
    openDuplicateJobs,
    openJobPostings,
    upcomingEvents,
    openLogisticsTasks,
    financeTransactions,
    settlements,
    contracts,
  }
}

export async function createTourArchivePreview(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
}): Promise<TourArchivePreview> {
  const counts = await collectTourArchiveImpactCounts(args)
  const settings =
    args.tour.settings && typeof args.tour.settings === "object" && !Array.isArray(args.tour.settings)
      ? (args.tour.settings as Record<string, unknown>)
      : {}
  return buildTourArchivePreview({
    tourId: args.tourId,
    orgId: args.orgId,
    status: typeof args.tour.status === "string" ? args.tour.status : null,
    settings,
    counts,
  })
}
