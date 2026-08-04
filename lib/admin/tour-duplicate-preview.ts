/**
 * TOUR-205 — Deep-duplicate preview (selectable clone plan).
 *
 * Preview only — execution is TOUR-206. Classifies each selected domain into
 * copies, links, exclusions, and conflicts without mutating data.
 */

export const TOUR_DUPLICATE_DOMAINS = [
  "metadata",
  "events",
  "team_roles",
  "vendors",
  "templates",
  "budgets",
  "documents",
  "logistics_skeletons",
  "permissions",
] as const

export type TourDuplicateDomain = (typeof TOUR_DUPLICATE_DOMAINS)[number]

export type TourDuplicateDisposition = "copy" | "link" | "exclude" | "conflict"

export interface TourDuplicateDomainSelection {
  metadata: boolean
  events: boolean
  team_roles: boolean
  vendors: boolean
  templates: boolean
  budgets: boolean
  documents: boolean
  logistics_skeletons: boolean
  permissions: boolean
}

export interface TourDuplicatePreviewItem {
  domain: TourDuplicateDomain
  disposition: TourDuplicateDisposition
  sourceId: string | null
  label: string
  detail: string
  count?: number
}

export interface TourDuplicatePreview {
  sourceTourId: string
  orgId: string
  proposedName: string
  selection: TourDuplicateDomainSelection
  copies: TourDuplicatePreviewItem[]
  links: TourDuplicatePreviewItem[]
  exclusions: TourDuplicatePreviewItem[]
  conflicts: TourDuplicatePreviewItem[]
  requiresConfirmation: boolean
  /** Opaque plan token for TOUR-206 execute (selection + source snapshot). */
  planToken: string
}

export const DEFAULT_TOUR_DUPLICATE_SELECTION: TourDuplicateDomainSelection = {
  metadata: true,
  events: true,
  team_roles: true,
  vendors: true,
  templates: false,
  budgets: false,
  documents: false,
  logistics_skeletons: true,
  permissions: false,
}

export function normalizeTourDuplicateSelection(
  input: Partial<TourDuplicateDomainSelection> | null | undefined,
): TourDuplicateDomainSelection {
  const base = { ...DEFAULT_TOUR_DUPLICATE_SELECTION }
  if (!input || typeof input !== "object") return base
  for (const domain of TOUR_DUPLICATE_DOMAINS) {
    if (typeof input[domain] === "boolean") base[domain] = input[domain]!
  }
  // Metadata is always required for a tour shell copy.
  base.metadata = true
  return base
}

export interface TourDuplicateInventoryCounts {
  events: number
  teamRoles: number
  vendors: number
  templates: number
  budgetLines: number
  documents: number
  logisticsTasks: number
  permissionGrants: number
  /** Events that cannot be deep-copied (published/ticketed/etc.). */
  protectedEventCount: number
  /** Finance rows that must never be cloned as paid history. */
  paidTransactionCount: number
  hasCalendarToken: boolean
  hasShareTokens: boolean
}

function item(args: {
  domain: TourDuplicateDomain
  disposition: TourDuplicateDisposition
  sourceId?: string | null
  label: string
  detail: string
  count?: number
}): TourDuplicatePreviewItem {
  return {
    domain: args.domain,
    disposition: args.disposition,
    sourceId: args.sourceId ?? null,
    label: args.label,
    detail: args.detail,
    count: args.count,
  }
}

/**
 * Pure preview builder from selection + inventory counts.
 */
export function buildTourDuplicatePreview(args: {
  sourceTourId: string
  orgId: string
  sourceName: string
  proposedName?: string | null
  selection: Partial<TourDuplicateDomainSelection> | null | undefined
  inventory: TourDuplicateInventoryCounts
}): TourDuplicatePreview {
  const selection = normalizeTourDuplicateSelection(args.selection)
  const proposedName =
    (args.proposedName && args.proposedName.trim())
    || `${args.sourceName || "Tour"} (Copy)`

  const copies: TourDuplicatePreviewItem[] = []
  const links: TourDuplicatePreviewItem[] = []
  const exclusions: TourDuplicatePreviewItem[] = []
  const conflicts: TourDuplicatePreviewItem[] = []

  // Metadata always copies as a new tour shell; tokens/identities are regenerated later (TOUR-206).
  copies.push(
    item({
      domain: "metadata",
      disposition: "copy",
      sourceId: args.sourceTourId,
      label: "Tour metadata",
      detail: "Name, dates, description, budget fields, and settings (new identity/tokens on execute)",
      count: 1,
    }),
  )
  if (args.inventory.hasCalendarToken || args.inventory.hasShareTokens) {
    exclusions.push(
      item({
        domain: "metadata",
        disposition: "exclude",
        sourceId: args.sourceTourId,
        label: "Feed and share tokens",
        detail: "Calendar/share tokens are never copied; new tokens are generated on execute",
      }),
    )
  }

  if (selection.events) {
    const copyable = Math.max(0, args.inventory.events - args.inventory.protectedEventCount)
    if (copyable > 0) {
      copies.push(
        item({
          domain: "events",
          disposition: "copy",
          label: "Stops / events",
          detail: "Clone event shells and tour_events links with new event IDs",
          count: copyable,
        }),
      )
    }
    if (args.inventory.protectedEventCount > 0) {
      conflicts.push(
        item({
          domain: "events",
          disposition: "conflict",
          label: "Protected stops",
          detail: "Published, ticketed, or settled stops cannot be deep-copied; link or exclude on execute",
          count: args.inventory.protectedEventCount,
        }),
      )
      links.push(
        item({
          domain: "events",
          disposition: "link",
          label: "Protected stops (link option)",
          detail: "May remain linked to the source event identity instead of cloning",
          count: args.inventory.protectedEventCount,
        }),
      )
    }
    if (args.inventory.events === 0) {
      exclusions.push(
        item({
          domain: "events",
          disposition: "exclude",
          label: "Stops / events",
          detail: "Source tour has no stops to copy",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "events",
        disposition: "exclude",
        label: "Stops / events",
        detail: "Not selected in clone plan",
        count: args.inventory.events,
      }),
    )
  }

  if (selection.team_roles) {
    if (args.inventory.teamRoles > 0) {
      copies.push(
        item({
          domain: "team_roles",
          disposition: "copy",
          label: "Team roles",
          detail: "Copy role assignments as pending invites (no traveler PII duplication)",
          count: args.inventory.teamRoles,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "team_roles",
          disposition: "exclude",
          label: "Team roles",
          detail: "No team members on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "team_roles",
        disposition: "exclude",
        label: "Team roles",
        detail: "Not selected in clone plan",
        count: args.inventory.teamRoles,
      }),
    )
  }

  if (selection.vendors) {
    if (args.inventory.vendors > 0) {
      copies.push(
        item({
          domain: "vendors",
          disposition: "copy",
          label: "Vendor links",
          detail: "Copy vendor associations; contracts/invoices stay with source",
          count: args.inventory.vendors,
        }),
      )
      links.push(
        item({
          domain: "vendors",
          disposition: "link",
          label: "Vendor directory records",
          detail: "Org vendor master records remain shared links, not duplicated",
          count: args.inventory.vendors,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "vendors",
          disposition: "exclude",
          label: "Vendors",
          detail: "No vendors on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "vendors",
        disposition: "exclude",
        label: "Vendors",
        detail: "Not selected in clone plan",
        count: args.inventory.vendors,
      }),
    )
  }

  if (selection.templates) {
    if (args.inventory.templates > 0) {
      copies.push(
        item({
          domain: "templates",
          disposition: "copy",
          label: "Templates",
          detail: "Clone tour-scoped template bindings",
          count: args.inventory.templates,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "templates",
          disposition: "exclude",
          label: "Templates",
          detail: "No tour-scoped templates found (org library templates remain linked)",
          count: 0,
        }),
      )
      links.push(
        item({
          domain: "templates",
          disposition: "link",
          label: "Organization template library",
          detail: "Org templates are referenced, not copied",
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "templates",
        disposition: "exclude",
        label: "Templates",
        detail: "Not selected in clone plan",
        count: args.inventory.templates,
      }),
    )
  }

  if (selection.budgets) {
    const skeletonLines = Math.max(0, args.inventory.budgetLines - args.inventory.paidTransactionCount)
    if (skeletonLines > 0) {
      copies.push(
        item({
          domain: "budgets",
          disposition: "copy",
          label: "Budget skeleton",
          detail: "Copy categories/planned amounts as draft lines (no payments)",
          count: skeletonLines,
        }),
      )
    }
    if (args.inventory.paidTransactionCount > 0) {
      conflicts.push(
        item({
          domain: "budgets",
          disposition: "conflict",
          label: "Paid / settled transactions",
          detail: "Paid history is never duplicated; excluded from clone",
          count: args.inventory.paidTransactionCount,
        }),
      )
      exclusions.push(
        item({
          domain: "budgets",
          disposition: "exclude",
          label: "Paid transaction history",
          detail: "Financial ledger rows stay on the source tour",
          count: args.inventory.paidTransactionCount,
        }),
      )
    }
    if (args.inventory.budgetLines === 0) {
      exclusions.push(
        item({
          domain: "budgets",
          disposition: "exclude",
          label: "Budgets",
          detail: "No budget lines on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "budgets",
        disposition: "exclude",
        label: "Budgets",
        detail: "Not selected in clone plan",
        count: args.inventory.budgetLines,
      }),
    )
  }

  if (selection.documents) {
    if (args.inventory.documents > 0) {
      copies.push(
        item({
          domain: "documents",
          disposition: "copy",
          label: "Document references",
          detail: "Clone document links; binary assets stay shared until re-upload",
          count: args.inventory.documents,
        }),
      )
      links.push(
        item({
          domain: "documents",
          disposition: "link",
          label: "Document storage objects",
          detail: "Storage blobs are linked, not byte-copied in preview",
          count: args.inventory.documents,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "documents",
          disposition: "exclude",
          label: "Documents",
          detail: "No documents on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "documents",
        disposition: "exclude",
        label: "Documents",
        detail: "Not selected in clone plan",
        count: args.inventory.documents,
      }),
    )
  }

  if (selection.logistics_skeletons) {
    if (args.inventory.logisticsTasks > 0) {
      copies.push(
        item({
          domain: "logistics_skeletons",
          disposition: "copy",
          label: "Logistics skeletons",
          detail: "Copy task types/titles without traveler PII or booking confirmations",
          count: args.inventory.logisticsTasks,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "logistics_skeletons",
          disposition: "exclude",
          label: "Logistics skeletons",
          detail: "No logistics tasks on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "logistics_skeletons",
        disposition: "exclude",
        label: "Logistics skeletons",
        detail: "Not selected in clone plan",
        count: args.inventory.logisticsTasks,
      }),
    )
  }

  if (selection.permissions) {
    if (args.inventory.permissionGrants > 0) {
      copies.push(
        item({
          domain: "permissions",
          disposition: "copy",
          label: "Permission grants",
          detail: "Re-create eligible role grants on the new tour (delegated grants re-evaluated)",
          count: args.inventory.permissionGrants,
        }),
      )
    } else {
      exclusions.push(
        item({
          domain: "permissions",
          disposition: "exclude",
          label: "Permissions",
          detail: "No copyable grants on source tour",
          count: 0,
        }),
      )
    }
  } else {
    exclusions.push(
      item({
        domain: "permissions",
        disposition: "exclude",
        label: "Permissions",
        detail: "Not selected — new tour inherits creator org role only",
        count: args.inventory.permissionGrants,
      }),
    )
  }

  const planToken = encodeTourDuplicatePlanToken({
    v: 1,
    sourceTourId: args.sourceTourId,
    orgId: args.orgId,
    selection,
    proposedName,
  })

  return {
    sourceTourId: args.sourceTourId,
    orgId: args.orgId,
    proposedName,
    selection,
    copies,
    links,
    exclusions,
    conflicts,
    requiresConfirmation: conflicts.length > 0 || copies.length > 1,
    planToken,
  }
}

export interface TourDuplicatePlanTokenPayload {
  v: 1
  sourceTourId: string
  orgId: string
  selection: TourDuplicateDomainSelection
  proposedName: string
}

export function encodeTourDuplicatePlanToken(payload: TourDuplicatePlanTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export function decodeTourDuplicatePlanToken(token: string): TourDuplicatePlanTokenPayload {
  if (!token || typeof token !== "string") throw new Error("Missing duplicate plan token")
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"))
  } catch {
    throw new Error("Invalid duplicate plan token")
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid duplicate plan token payload")
  const row = parsed as Record<string, unknown>
  if (row.v !== 1) throw new Error("Unsupported duplicate plan token version")
  if (typeof row.sourceTourId !== "string" || !row.sourceTourId)
    throw new Error("Plan token missing sourceTourId")
  if (typeof row.orgId !== "string" || !row.orgId) throw new Error("Plan token missing orgId")
  if (typeof row.proposedName !== "string" || !row.proposedName.trim())
    throw new Error("Plan token missing proposedName")
  return {
    v: 1,
    sourceTourId: row.sourceTourId,
    orgId: row.orgId,
    selection: normalizeTourDuplicateSelection(
      row.selection as Partial<TourDuplicateDomainSelection> | undefined,
    ),
    proposedName: row.proposedName.trim(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

async function countRows(
  supabase: SupabaseLike,
  table: string,
  tourId: string,
  orgId?: string,
): Promise<number> {
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("tour_id", tourId)
  if (orgId) query = query.eq("org_id", orgId)
  const { count, error } = await query
  if (error) {
    if (error.code === "42P01" || error.code === "42703") return 0
    return 0
  }
  return typeof count === "number" ? count : 0
}

export async function collectTourDuplicateInventory(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
}): Promise<TourDuplicateInventoryCounts> {
  const events = await countRows(args.supabase, "tour_events", args.tourId)
  const teamRoles = await countRows(args.supabase, "tour_team_members", args.tourId)
  const vendors = await countRows(args.supabase, "tour_vendors", args.tourId)
  const logisticsTasks = await countRows(args.supabase, "logistics_tasks", args.tourId)

  let budgetLines = 0
  let paidTransactionCount = 0
  {
    const { data, error } = await args.supabase
      .from("financial_transactions")
      .select("id, payment_status")
      .eq("tour_id", args.tourId)
      .eq("org_id", args.orgId)
      .limit(500)
    if (!error && Array.isArray(data)) {
      budgetLines = data.length
      paidTransactionCount = data.filter(
        (row: { payment_status?: string }) =>
          row.payment_status === "paid" || row.payment_status === "settled",
      ).length
    }
  }

  let protectedEventCount = 0
  {
    const { data, error } = await args.supabase
      .from("tour_events")
      .select("event_id, events_v2:event_id(status, tickets_sold)")
      .eq("tour_id", args.tourId)
      .limit(500)
    if (!error && Array.isArray(data)) {
      protectedEventCount = data.filter((link: Record<string, unknown>) => {
        const ev = (link.events_v2 || {}) as Record<string, unknown>
        const status = String(ev.status || "")
        const tickets = Number(ev.tickets_sold || 0)
        return (
          tickets > 0
          || status === "published"
          || status === "confirmed"
          || status === "completed"
          || status === "settled"
        )
      }).length
    }
  }

  let documents = 0
  for (const table of ["tour_documents", "documents"]) {
    const n = await countRows(args.supabase, table, args.tourId)
    if (n > 0) {
      documents = n
      break
    }
  }

  let templates = 0
  for (const table of ["tour_templates", "job_templates"]) {
    const n = await countRows(args.supabase, table, args.tourId)
    if (n > 0) {
      templates = n
      break
    }
  }

  let permissionGrants = 0
  for (const table of ["entity_grants", "tour_admin_grants"]) {
    let query = args.supabase
      .from(table)
      .select("id", { count: "exact", head: true })
    if (table === "entity_grants") {
      query = query.eq("entity_type", "tour").eq("entity_id", args.tourId)
    } else {
      query = query.eq("tour_id", args.tourId)
    }
    const { count, error } = await query
    if (!error && typeof count === "number" && count > 0) {
      permissionGrants = count
      break
    }
  }

  return {
    events,
    teamRoles,
    vendors,
    templates,
    budgetLines,
    documents,
    logisticsTasks,
    permissionGrants,
    protectedEventCount,
    paidTransactionCount,
    hasCalendarToken: Boolean(args.tour.calendar_token),
    hasShareTokens: Boolean(
      args.tour.share_token
      || (args.tour.settings
        && typeof args.tour.settings === "object"
        && !Array.isArray(args.tour.settings)
        && (args.tour.settings as Record<string, unknown>).share_token),
    ),
  }
}

export async function createTourDuplicatePreview(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  tour: Record<string, unknown>
  selection?: Partial<TourDuplicateDomainSelection> | null
  proposedName?: string | null
}): Promise<TourDuplicatePreview> {
  const inventory = await collectTourDuplicateInventory({
    supabase: args.supabase,
    tourId: args.tourId,
    orgId: args.orgId,
    tour: args.tour,
  })
  return buildTourDuplicatePreview({
    sourceTourId: args.tourId,
    orgId: args.orgId,
    sourceName: typeof args.tour.name === "string" ? args.tour.name : "Tour",
    proposedName: args.proposedName,
    selection: args.selection,
    inventory,
  })
}
