/**
 * LOG-101 — Logistics/equipment/catering/site-map org-key contract.
 * Parents keyed in SEC-105; this task scopes children, quarantines unresolved,
 * and verifies counts/consistency.
 */

import { TENANT_KEY_QUARANTINE_REASONS } from "@/lib/admin/tenant-key-quarantine"

export const LOG101_VERIFY_RPC = "admin_verify_logistics_org_keys"

export const LOG101_PARENT_TABLES = [
  "logistics_tasks",
  "site_maps",
  "catering_services",
  "backline_requirements",
  "equipment_reservations",
  "logistics_comms_plans",
  "equipment_setup_workflows",
] as const

export const LOG101_CHILD_TABLES = [
  "logistics_task_equipment",
  "logistics_activity",
  "catering_headcount_snapshots",
  "catering_dietary_summaries",
  "backline_fulfillments",
  "backline_substitution_approvals",
  "equipment_instances",
  "equipment_setup_workflows",
  "equipment_setup_tasks",
  "site_map_elements",
  "glamping_tents",
  "site_map_collaborators",
  "site_map_activity_log",
  "map_layers",
  "map_versions",
  "map_measurements",
  "map_task_assignments",
  "map_issues",
  "logistics_comms_channels",
] as const

export type Log101ChildTable = (typeof LOG101_CHILD_TABLES)[number]
export type Log101ParentTable = (typeof LOG101_PARENT_TABLES)[number]

export interface Log101ParentChildLink {
  childTable: Log101ChildTable
  parentTable: Log101ParentTable | "site_maps" | "logistics_tasks"
  childFk: string
  notes?: string
}

/** Deterministic parent → child backfill map (never invent org_id). */
export const LOG101_PARENT_CHILD_LINKS: Log101ParentChildLink[] = [
  { childTable: "logistics_task_equipment", parentTable: "logistics_tasks", childFk: "task_id" },
  { childTable: "logistics_activity", parentTable: "logistics_tasks", childFk: "task_id" },
  {
    childTable: "catering_headcount_snapshots",
    parentTable: "catering_services",
    childFk: "catering_service_id",
  },
  {
    childTable: "catering_dietary_summaries",
    parentTable: "catering_services",
    childFk: "catering_service_id",
  },
  {
    childTable: "backline_fulfillments",
    parentTable: "backline_requirements",
    childFk: "requirement_id",
  },
  {
    childTable: "backline_substitution_approvals",
    parentTable: "backline_requirements",
    childFk: "requirement_id",
  },
  { childTable: "equipment_instances", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "equipment_setup_workflows", parentTable: "site_maps", childFk: "site_map_id" },
  {
    childTable: "equipment_setup_tasks",
    parentTable: "equipment_setup_workflows",
    childFk: "workflow_id",
  },
  { childTable: "site_map_elements", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "glamping_tents", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "site_map_collaborators", parentTable: "site_maps", childFk: "site_map_id" },
  {
    childTable: "site_map_activity_log",
    parentTable: "site_maps",
    childFk: "site_map_id",
    notes: "Notes use entity_type = note",
  },
  { childTable: "map_layers", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "map_versions", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "map_measurements", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "map_task_assignments", parentTable: "site_maps", childFk: "site_map_id" },
  { childTable: "map_issues", parentTable: "site_maps", childFk: "site_map_id" },
  {
    childTable: "logistics_comms_channels",
    parentTable: "logistics_comms_plans",
    childFk: "plan_id",
  },
]

export const LOG101_QUARANTINE_REASON = TENANT_KEY_QUARANTINE_REASONS.unresolvableAfterBackfill

/** Deferred: no safe parent org without inventing. */
export const LOG101_DEFERRED_TABLES = [
  "equipment_catalog",
  "equipment_assets",
  "rental_clients",
] as const

export function isLog101ChildTable(tableName: string): tableName is Log101ChildTable {
  return (LOG101_CHILD_TABLES as readonly string[]).includes(tableName)
}

export function isLog101ParentTable(tableName: string): tableName is Log101ParentTable {
  return (LOG101_PARENT_TABLES as readonly string[]).includes(tableName)
}

export interface LogisticsOrgKeyVerificationRow {
  table_name: string
  total_rows: number
  keyed_rows: number
  null_org_rows: number
  quarantine_open: number
  parent_mismatch_rows: number
}

export function assertLogisticsOrgKeyVerification(rows: LogisticsOrgKeyVerificationRow[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  const byTable = new Map(rows.map((row) => [row.table_name, row]))

  for (const child of LOG101_CHILD_TABLES) {
    const row = byTable.get(child)
    if (!row) continue
    if (row.null_org_rows !== row.quarantine_open) {
      failures.push(
        `${child}: null_org_rows (${row.null_org_rows}) !== quarantine_open (${row.quarantine_open})`,
      )
    }
    if (row.parent_mismatch_rows > 0)
      failures.push(`${child}: parent_mismatch_rows=${row.parent_mismatch_rows}`)
  }

  for (const parent of ["logistics_tasks", "site_maps"] as const) {
    const row = byTable.get(parent)
    if (!row) continue
    if (row.parent_mismatch_rows > 0)
      failures.push(`${parent}: unexpected parent_mismatch_rows=${row.parent_mismatch_rows}`)
  }

  return { ok: failures.length === 0, failures }
}


type SupabaseLike = { from: (table: string) => any }

export async function resolveOrgIdFromLogisticsParent(args: {
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

export async function withLogisticsParentOrgId<T extends Record<string, unknown>>(args: {
  supabase: SupabaseLike
  parentTable: string
  parentId: string | null | undefined
  payload: T
}): Promise<T & { org_id?: string | null }> {
  if (!args.parentId) return { ...args.payload, org_id: (args.payload.org_id as string | null | undefined) ?? null } as T & { org_id?: string | null }
  const orgId = await resolveOrgIdFromLogisticsParent({
    supabase: args.supabase,
    parentTable: args.parentTable,
    parentId: args.parentId,
  })
  return { ...args.payload, org_id: orgId }
}
