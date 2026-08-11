/**
 * FIN-104 — Organization-scoped finance entity search (tour/event/vendor/category/PO).
 * UI selects from these results; server still validates parents on write.
 */

import { TRANSACTION_CATEGORIES } from "@/lib/admin/finance-command-schemas"

export const FINANCE_SCOPE_KINDS = [
  "tour",
  "event",
  "vendor",
  "category",
  "po",
] as const

export type FinanceScopeKind = (typeof FINANCE_SCOPE_KINDS)[number]

export interface FinanceScopeHit {
  kind: FinanceScopeKind
  id: string
  label: string
  meta?: string | null
  /** For vendor/category, id may equal label (name-keyed). */
  value: string
}

export interface FinanceScopeSearchResult {
  query: string
  hits: FinanceScopeHit[]
  unavailable: Partial<Record<FinanceScopeKind, string>>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

const BUDGET_CATEGORIES = [
  "production",
  "marketing",
  "catering",
  "staff_pay",
  "venue_rental",
  "equipment",
  "travel",
  "other_expense",
] as const

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ")
}

function matchesQuery(label: string, q: string): boolean {
  if (!q) return true
  return label.toLowerCase().includes(q)
}

export function parseFinanceScopeKinds(raw: string | null | undefined): FinanceScopeKind[] {
  if (!raw || !raw.trim()) return [...FINANCE_SCOPE_KINDS]
  const parts = raw.split(",").map((p) => p.trim().toLowerCase())
  const kinds = parts.filter((p): p is FinanceScopeKind =>
    (FINANCE_SCOPE_KINDS as readonly string[]).includes(p),
  )
  return kinds.length > 0 ? kinds : [...FINANCE_SCOPE_KINDS]
}

export function searchFinanceCategories(query: string, limit = 20): FinanceScopeHit[] {
  const q = normalizeQuery(query)
  const labels = new Set<string>([
    ...TRANSACTION_CATEGORIES,
    ...BUDGET_CATEGORIES,
  ])
  return [...labels]
    .filter((label) => matchesQuery(label.replace(/_/g, " "), q) || matchesQuery(label, q))
    .slice(0, limit)
    .map((label) => ({
      kind: "category" as const,
      id: label,
      label: label.replace(/_/g, " "),
      meta: "category",
      value: label,
    }))
}

export async function searchFinanceScope(args: {
  supabase: SupabaseLike
  orgId: string
  query: string
  kinds?: FinanceScopeKind[]
  limit?: number
}): Promise<FinanceScopeSearchResult> {
  const q = normalizeQuery(args.query)
  const kinds = args.kinds?.length ? args.kinds : [...FINANCE_SCOPE_KINDS]
  const limit = Math.min(Math.max(args.limit ?? 12, 1), 40)
  const hits: FinanceScopeHit[] = []
  const unavailable: FinanceScopeSearchResult["unavailable"] = {}

  if (kinds.includes("category"))
    hits.push(...searchFinanceCategories(args.query, limit))

  if (kinds.includes("po")) {
    unavailable.po = "Purchase orders are not available until procurement (FIN-506)."
  }

  if (kinds.includes("tour")) {
    let tourQuery = args.supabase
      .from("tours")
      .select("id,name,status")
      .eq("org_id", args.orgId)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (q) tourQuery = tourQuery.ilike("name", `%${q}%`)

    const { data, error } = await tourQuery
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        hits.push({
          kind: "tour",
          id: String(row.id),
          label: String(row.name || "Untitled tour"),
          meta: row.status ? String(row.status) : null,
          value: String(row.id),
        })
      }
    }
  }

  if (kinds.includes("event")) {
    let eventQuery = args.supabase
      .from("events_v2")
      .select("id,title,status,start_at")
      .eq("org_id", args.orgId)
      .order("start_at", { ascending: false })
      .limit(limit)

    if (q) eventQuery = eventQuery.ilike("title", `%${q}%`)

    const { data, error } = await eventQuery
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        hits.push({
          kind: "event",
          id: String(row.id),
          label: String(row.title || "Untitled event"),
          meta: row.start_at
            ? String(row.start_at).slice(0, 10)
            : row.status
              ? String(row.status)
              : null,
          value: String(row.id),
        })
      }
    }
  }

  if (kinds.includes("vendor")) {
    const vendorNames = new Set<string>()

    let txQuery = args.supabase
      .from("financial_transactions")
      .select("vendor_name")
      .eq("org_id", args.orgId)
      .not("vendor_name", "is", null)
      .limit(200)

    if (q) txQuery = txQuery.ilike("vendor_name", `%${q}%`)

    const { data: txRows } = await txQuery
    for (const row of txRows || []) {
      const name = typeof row.vendor_name === "string" ? row.vendor_name.trim() : ""
      if (name) vendorNames.add(name)
    }

    const { data: tourRows } = await args.supabase
      .from("tours")
      .select("id")
      .eq("org_id", args.orgId)
      .limit(100)

    const tourIds = (tourRows || []).map((t: { id: string }) => t.id)
    if (tourIds.length > 0) {
      let vendorQuery = args.supabase
        .from("tour_vendors")
        .select("id,name,tour_id")
        .in("tour_id", tourIds)
        .limit(100)
      if (q) vendorQuery = vendorQuery.ilike("name", `%${q}%`)
      const { data: vendors } = await vendorQuery
      for (const row of vendors || []) {
        const name = typeof row.name === "string" ? row.name.trim() : ""
        if (name) vendorNames.add(name)
      }
    }

    const sorted = [...vendorNames]
      .filter((name) => matchesQuery(name, q))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit)

    for (const name of sorted) {
      hits.push({
        kind: "vendor",
        id: name,
        label: name,
        meta: "vendor",
        value: name,
      })
    }
  }

  return { query: args.query.trim(), hits, unavailable }
}
