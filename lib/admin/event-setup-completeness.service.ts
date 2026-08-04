/**
 * EVENT-202 — Load live child counts and build setup completeness for an event.
 * Per-domain count failures surface as status `unknown` (not empty/ready).
 */

import "server-only"

import {
  buildEventSetupChecklist,
  type EventSetupChecklist,
  type EventSetupDomain,
  type EventSetupDependencyKey,
} from "@/lib/admin/event-setup-checklist"
import { requireEventAccess } from "@/lib/admin/event-access.service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

async function countRows(args: {
  supabase: SupabaseLike
  table: string
  eventId: string
  orgId?: string | null
}): Promise<{ count: number; error: string | null }> {
  try {
    let query = args.supabase
      .from(args.table)
      .select("id", { count: "exact", head: true })
      .eq("event_id", args.eventId)
    if (args.orgId) query = query.eq("org_id", args.orgId)
    const { count, error } = await query
    if (error) {
      // Missing relation is not a dependency failure — treat as zero rows.
      if (error.code === "42P01") return { count: 0, error: null }
      return { count: 0, error: error.message || `Failed to count ${args.table}` }
    }
    return { count: typeof count === "number" ? count : 0, error: null }
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error ? error.message : `Failed to count ${args.table}`,
    }
  }
}

export async function evaluateEventSetupCompleteness(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId: string
}): Promise<EventSetupChecklist> {
  await requireEventAccess({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    orgId: args.orgId,
  })

  const { data: event, error } = await args.supabase
    .from("events_v2")
    .select("id, org_id, title, start_at, venue_id, capacity, settings")
    .eq("id", args.eventId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!event) throw new Error("Event not found.")

  const dependencyErrors: Partial<Record<EventSetupDependencyKey, string>> = {}
  // Venue identity is on the event row; if the row loaded, venue dep is evaluable.
  // Schedule similarly comes from start_at / settings — no extra query.

  const [staffing, ticketing, advance, logistics, finance] = await Promise.all([
    countRows({ supabase: args.supabase, table: "staff_shifts", eventId: args.eventId, orgId: args.orgId }),
    countRows({ supabase: args.supabase, table: "ticket_types", eventId: args.eventId }),
    countRows({ supabase: args.supabase, table: "event_advances", eventId: args.eventId, orgId: args.orgId }),
    countRows({ supabase: args.supabase, table: "event_operational_tasks", eventId: args.eventId, orgId: args.orgId }),
    countRows({ supabase: args.supabase, table: "financial_transactions", eventId: args.eventId, orgId: args.orgId }),
  ])

  // Fallback logistics table name used in some paths.
  let logisticsCount = logistics.count
  let logisticsError = logistics.error
  if (logistics.error && /relation|does not exist|42P01/i.test(logistics.error)) {
    const alt = await countRows({
      supabase: args.supabase,
      table: "logistics_tasks",
      eventId: args.eventId,
      orgId: args.orgId,
    })
    logisticsCount = alt.count
    logisticsError = alt.error
  }

  // Fallback advance docs.
  let advanceCount = advance.count
  let advanceError = advance.error
  if (advance.error) {
    const alt = await countRows({
      supabase: args.supabase,
      table: "advancing_documents",
      eventId: args.eventId,
    })
    if (!alt.error) {
      advanceCount = alt.count
      advanceError = null
    }
  }

  const countErrors: Partial<Record<EventSetupDomain, string>> = {}
  if (staffing.error) countErrors.staffing = staffing.error
  if (ticketing.error) countErrors.ticketing = ticketing.error
  if (advanceError) countErrors.advance = advanceError
  if (logisticsError) countErrors.logistics = logisticsError
  if (finance.error) countErrors.finance = finance.error

  return buildEventSetupChecklist({
    eventId: args.eventId,
    event: event as Record<string, unknown>,
    counts: {
      staffShifts: staffing.count,
      ticketTypes: ticketing.count,
      advancingDocuments: advanceCount,
      logisticsTasks: logisticsCount,
      financeRecords: finance.count,
    },
    countErrors,
    dependencyErrors,
  })
}
