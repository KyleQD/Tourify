/**
 * TRAVEL-101 — Travel/lodging/transport org-key contract.
 *
 * Parents were keyed in SEC-105; this task scopes children + timeline,
 * quarantines unresolved rows, and verifies counts/consistency.
 */

import { TENANT_KEY_QUARANTINE_REASONS } from "@/lib/admin/tenant-key-quarantine"

export const TRAVEL101_VERIFY_RPC = "admin_verify_travel_org_keys"

export const TRAVEL101_PARENT_TABLES = [
  "travel_groups",
  "flight_coordination",
  "ground_transportation_coordination",
  "lodging_bookings",
  "rental_agreements",
] as const

export const TRAVEL101_CHILD_TABLES = [
  "travel_group_members",
  "flight_passenger_assignments",
  "transportation_passenger_assignments",
  "hotel_room_assignments",
  "lodging_guest_assignments",
  "lodging_payments",
  "lodging_calendar_events",
  "travel_coordination_timeline",
  "rental_agreement_items",
  "rental_payments",
] as const

export type Travel101ChildTable = (typeof TRAVEL101_CHILD_TABLES)[number]
export type Travel101ParentTable = (typeof TRAVEL101_PARENT_TABLES)[number]

export interface Travel101ParentChildLink {
  childTable: Travel101ChildTable
  parentTable: Travel101ParentTable | "tours" | "events_v2" | "travel_groups"
  childFk: string
  notes?: string
}

/** Deterministic parent → child backfill map (never invent org_id). */
export const TRAVEL101_PARENT_CHILD_LINKS: Travel101ParentChildLink[] = [
  { childTable: "travel_group_members", parentTable: "travel_groups", childFk: "group_id" },
  { childTable: "flight_passenger_assignments", parentTable: "flight_coordination", childFk: "flight_id" },
  {
    childTable: "transportation_passenger_assignments",
    parentTable: "ground_transportation_coordination",
    childFk: "transportation_id",
  },
  { childTable: "hotel_room_assignments", parentTable: "lodging_bookings", childFk: "lodging_booking_id" },
  { childTable: "lodging_guest_assignments", parentTable: "lodging_bookings", childFk: "booking_id" },
  { childTable: "lodging_payments", parentTable: "lodging_bookings", childFk: "booking_id" },
  { childTable: "lodging_calendar_events", parentTable: "lodging_bookings", childFk: "booking_id" },
  {
    childTable: "travel_coordination_timeline",
    parentTable: "travel_groups",
    childFk: "group_id",
    notes: "Also backfills from tours/events_v2 when group_id is null",
  },
  { childTable: "rental_agreement_items", parentTable: "rental_agreements", childFk: "rental_agreement_id" },
  { childTable: "rental_payments", parentTable: "rental_agreements", childFk: "rental_agreement_id" },
]

export const TRAVEL101_QUARANTINE_REASON = TENANT_KEY_QUARANTINE_REASONS.unresolvableAfterBackfill

export function isTravel101ChildTable(tableName: string): tableName is Travel101ChildTable {
  return (TRAVEL101_CHILD_TABLES as readonly string[]).includes(tableName)
}

export function isTravel101ParentTable(tableName: string): tableName is Travel101ParentTable {
  return (TRAVEL101_PARENT_TABLES as readonly string[]).includes(tableName)
}

export interface TravelOrgKeyVerificationRow {
  table_name: string
  total_rows: number
  keyed_rows: number
  null_org_rows: number
  quarantine_open: number
  parent_mismatch_rows: number
}

/**
 * Pure consistency checks for verification rows (AC: counts + referential consistency).
 * null_org_rows should equal quarantine_open for TRAVEL-101 child tables after migration.
 */
export function assertTravelOrgKeyVerification(rows: TravelOrgKeyVerificationRow[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  const byTable = new Map(rows.map((row) => [row.table_name, row]))

  for (const child of TRAVEL101_CHILD_TABLES) {
    const row = byTable.get(child)
    if (!row) continue
    if (row.null_org_rows !== row.quarantine_open) {
      failures.push(
        `${child}: null_org_rows (${row.null_org_rows}) !== quarantine_open (${row.quarantine_open})`,
      )
    }
    if (row.parent_mismatch_rows > 0) {
      failures.push(`${child}: parent_mismatch_rows=${row.parent_mismatch_rows}`)
    }
  }

  for (const parent of ["travel_groups", "flight_coordination", "ground_transportation_coordination", "lodging_bookings"] as const) {
    const row = byTable.get(parent)
    if (!row) continue
    if (row.parent_mismatch_rows > 0)
      failures.push(`${parent}: unexpected parent_mismatch_rows=${row.parent_mismatch_rows}`)
  }

  return { ok: failures.length === 0, failures }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

/** Resolve org_id from a parent row; returns null when unresolved (never invent). */
export async function resolveOrgIdFromParent(args: {
  supabase: SupabaseLike
  parentTable: string
  parentId: string
}): Promise<string | null> {
  if (!args.parentId?.trim()) return null
  const { data, error } = await args.supabase
    .from(args.parentTable)
    .select("org_id")
    .eq("id", args.parentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return typeof data?.org_id === "string" && data.org_id ? data.org_id : null
}

/** Stamp child payload with parent org_id when resolvable. */
export async function withParentOrgId<T extends Record<string, unknown>>(args: {
  supabase: SupabaseLike
  parentTable: string
  parentId: string | null | undefined
  payload: T
}): Promise<T & { org_id?: string | null }> {
  if (!args.parentId) return { ...args.payload, org_id: (args.payload.org_id as string | null | undefined) ?? null } as T & { org_id?: string | null }
  const orgId = await resolveOrgIdFromParent({
    supabase: args.supabase,
    parentTable: args.parentTable,
    parentId: args.parentId,
  })
  return { ...args.payload, org_id: orgId }
}

/** Resolve org from tour → event → travel group (first non-null wins; never invent). */
export async function resolveTravelScopeOrgId(args: {
  supabase: SupabaseLike
  tourId?: string | null
  eventId?: string | null
  groupId?: string | null
}): Promise<string | null> {
  if (args.groupId) {
    const fromGroup = await resolveOrgIdFromParent({
      supabase: args.supabase,
      parentTable: "travel_groups",
      parentId: args.groupId,
    })
    if (fromGroup) return fromGroup
  }
  if (args.tourId) {
    const fromTour = await resolveOrgIdFromParent({
      supabase: args.supabase,
      parentTable: "tours",
      parentId: args.tourId,
    })
    if (fromTour) return fromTour
  }
  if (args.eventId) {
    const fromEvent = await resolveOrgIdFromParent({
      supabase: args.supabase,
      parentTable: "events_v2",
      parentId: args.eventId,
    })
    if (fromEvent) return fromEvent
  }
  return null
}
