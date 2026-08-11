/**
 * TOUR-208 — Safe draft deletion eligibility.
 *
 * Blocks deletion when published, ticketed, contracted, paid, staffed, or
 * otherwise referenced. Pure builder + async inventory collector.
 */

import { isLegallyRetainedFromSettings } from "@/lib/admin/state-aware-authorization"
import {
  isTourHardDeleteEligible,
  normalizeTourLifecycleState,
} from "@/lib/admin/tour-lifecycle"

export type TourDeleteBlockerId =
  | "state_ineligible"
  | "legal_hold"
  | "published_events"
  | "ticketed"
  | "contracted"
  | "paid"
  | "staffed"
  | "referenced_vendors"
  | "referenced_grants"
  | "referenced_logistics"
  | "referenced_documents"
  | "referenced_duplicate_jobs"
  | "referenced_job_postings"

export interface TourDeleteBlocker {
  id: TourDeleteBlockerId
  label: string
  detail: string
  count?: number
}

export interface TourDeleteReferenceCounts {
  linkedEvents: number
  publishedOrActiveEvents: number
  ticketedEvents: number
  contracts: number
  paidTransactions: number
  settlements: number
  teamMembers: number
  vendors: number
  activeGrants: number
  logisticsTasks: number
  documents: number
  openDuplicateJobs: number
  openJobPostings: number
}

export interface TourDeletePreview {
  tourId: string
  orgId: string
  currentState: string | null
  canDelete: boolean
  blockers: TourDeleteBlocker[]
  willDetachEventLinks: number
  counts: TourDeleteReferenceCounts
  requiresConfirmation: boolean
}

export class TourDeleteEligibilityError extends Error {
  readonly status = 409
  readonly code = "tour_delete_ineligible"
  readonly blockers: TourDeleteBlocker[]

  constructor(message: string, blockers: TourDeleteBlocker[]) {
    super(message)
    this.name = "TourDeleteEligibilityError"
    this.blockers = blockers
  }
}

export function buildTourDeletePreview(args: {
  tourId: string
  orgId: string
  status: string | null | undefined
  settings?: Record<string, unknown> | null
  counts: TourDeleteReferenceCounts
}): TourDeletePreview {
  const currentState = normalizeTourLifecycleState(args.status)
  const blockers: TourDeleteBlocker[] = []

  if (!isTourHardDeleteEligible(args.status)) {
    blockers.push({
      id: "state_ineligible",
      label: "Lifecycle state",
      detail: `Hard delete is only allowed for unreferenced drafts (current: ${currentState || "unknown"}).`,
    })
  }

  if (isLegallyRetainedFromSettings(args.settings || {})) {
    blockers.push({
      id: "legal_hold",
      label: "Legal hold",
      detail: "Legally retained tours cannot be permanently deleted.",
    })
  }

  if (args.counts.publishedOrActiveEvents > 0) {
    blockers.push({
      id: "published_events",
      label: "Published or active stops",
      detail: "Linked events that are published/confirmed/active/settled block hard delete.",
      count: args.counts.publishedOrActiveEvents,
    })
  }

  if (args.counts.ticketedEvents > 0) {
    blockers.push({
      id: "ticketed",
      label: "Ticketed stops",
      detail: "Events with tickets sold cannot be removed via tour hard delete.",
      count: args.counts.ticketedEvents,
    })
  }

  if (args.counts.contracts > 0) {
    blockers.push({
      id: "contracted",
      label: "Contracts",
      detail: "Contracted tours must be retained; archive instead of delete.",
      count: args.counts.contracts,
    })
  }

  if (args.counts.paidTransactions > 0 || args.counts.settlements > 0) {
    blockers.push({
      id: "paid",
      label: "Paid / settled finances",
      detail: "Paid transactions or settlements block permanent deletion.",
      count: args.counts.paidTransactions + args.counts.settlements,
    })
  }

  if (args.counts.teamMembers > 0) {
    blockers.push({
      id: "staffed",
      label: "Staffed team",
      detail: "Team assignments must be cleared before hard delete.",
      count: args.counts.teamMembers,
    })
  }

  if (args.counts.vendors > 0) {
    blockers.push({
      id: "referenced_vendors",
      label: "Vendor links",
      detail: "Vendor associations reference this tour.",
      count: args.counts.vendors,
    })
  }

  if (args.counts.activeGrants > 0) {
    blockers.push({
      id: "referenced_grants",
      label: "Active grants",
      detail: "Revoke delegated grants before hard delete.",
      count: args.counts.activeGrants,
    })
  }

  if (args.counts.logisticsTasks > 0) {
    blockers.push({
      id: "referenced_logistics",
      label: "Logistics tasks",
      detail: "Logistics records reference this tour.",
      count: args.counts.logisticsTasks,
    })
  }

  if (args.counts.documents > 0) {
    blockers.push({
      id: "referenced_documents",
      label: "Documents",
      detail: "Document links reference this tour.",
      count: args.counts.documents,
    })
  }

  if (args.counts.openDuplicateJobs > 0) {
    blockers.push({
      id: "referenced_duplicate_jobs",
      label: "Duplication jobs",
      detail: "In-flight duplication jobs reference this tour.",
      count: args.counts.openDuplicateJobs,
    })
  }

  if (args.counts.openJobPostings > 0) {
    blockers.push({
      id: "referenced_job_postings",
      label: "Job postings",
      detail: "Open job postings reference this tour.",
      count: args.counts.openJobPostings,
    })
  }

  const canDelete = blockers.length === 0
  return {
    tourId: args.tourId,
    orgId: args.orgId,
    currentState,
    canDelete,
    blockers,
    willDetachEventLinks: args.counts.linkedEvents,
    counts: args.counts,
    requiresConfirmation: canDelete,
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

export async function collectTourDeleteReferenceCounts(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
}): Promise<TourDeleteReferenceCounts> {
  let linkedEvents = 0
  let publishedOrActiveEvents = 0
  let ticketedEvents = 0

  {
    const { data, error } = await args.supabase
      .from("tour_events")
      .select("event_id, events_v2:event_id(id, status, tickets_sold)")
      .eq("tour_id", args.tourId)
      .limit(500)
    if (!error && Array.isArray(data)) {
      linkedEvents = data.length
      for (const link of data) {
        const ev = (link.events_v2 || {}) as Record<string, unknown>
        const status = String(ev.status || "")
        const tickets = Number(ev.tickets_sold || 0)
        if (
          status === "published"
          || status === "confirmed"
          || status === "active"
          || status === "in_progress"
          || status === "settled"
          || status === "completed"
        ) {
          publishedOrActiveEvents += 1
        }
        if (tickets > 0) ticketedEvents += 1
      }
    }
  }

  const contracts = await safeCount(args.supabase, "contracts", (q) =>
    q.eq("tour_id", args.tourId),
  )

  let paidTransactions = 0
  {
    const { data, error } = await args.supabase
      .from("financial_transactions")
      .select("id, payment_status")
      .eq("tour_id", args.tourId)
      .eq("org_id", args.orgId)
      .limit(500)
    if (!error && Array.isArray(data)) {
      paidTransactions = data.filter(
        (row: { payment_status?: string }) =>
          row.payment_status === "paid" || row.payment_status === "settled",
      ).length
    }
  }

  const settlements = await safeCount(args.supabase, "settlements", (q) =>
    q.eq("tour_id", args.tourId),
  )

  const teamMembers = await safeCount(args.supabase, "tour_team_members", (q) =>
    q.eq("tour_id", args.tourId),
  )

  const vendors = await safeCount(args.supabase, "tour_vendors", (q) =>
    q.eq("tour_id", args.tourId),
  )

  const activeGrants = await safeCount(args.supabase, "entity_grants", (q) =>
    q
      .eq("org_id", args.orgId)
      .eq("resource_type", "tour")
      .eq("resource_id", args.tourId)
      .eq("status", "active"),
  )

  const logisticsTasks = await safeCount(args.supabase, "logistics_tasks", (q) =>
    q.eq("tour_id", args.tourId),
  )

  let documents = 0
  for (const table of ["tour_documents", "documents"]) {
    const n = await safeCount(args.supabase, table, (q) => q.eq("tour_id", args.tourId))
    if (n > 0) {
      documents = n
      break
    }
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

  return {
    linkedEvents,
    publishedOrActiveEvents,
    ticketedEvents,
    contracts,
    paidTransactions,
    settlements,
    teamMembers,
    vendors,
    activeGrants,
    logisticsTasks,
    documents,
    openDuplicateJobs,
    openJobPostings,
  }
}

export async function createTourDeletePreview(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
}): Promise<TourDeletePreview> {
  const counts = await collectTourDeleteReferenceCounts({
    supabase: args.supabase,
    tourId: args.tourId,
    orgId: args.orgId,
  })
  const settings =
    args.tour.settings && typeof args.tour.settings === "object" && !Array.isArray(args.tour.settings)
      ? (args.tour.settings as Record<string, unknown>)
      : {}
  return buildTourDeletePreview({
    tourId: args.tourId,
    orgId: args.orgId,
    status: typeof args.tour.status === "string" ? args.tour.status : null,
    settings,
    counts,
  })
}

export async function assertTourHardDeleteEligible(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
}): Promise<TourDeletePreview> {
  const preview = await createTourDeletePreview(args)
  if (!preview.canDelete) {
    throw new TourDeleteEligibilityError(
      "Tour is not eligible for hard delete.",
      preview.blockers,
    )
  }
  return preview
}
