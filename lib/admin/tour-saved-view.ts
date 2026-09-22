/**
 * TOUR-209 — Validated personal/organization tour portfolio saved views.
 *
 * Filters/columns are revalidated on save and apply. Views never store
 * unauthorized tour names or counts — only filter grammar + column keys.
 */

import { z } from "zod"

import {
  TOUR_PORTFOLIO_SORT_FIELDS,
  parseTourPortfolioQuery,
  parseTourPortfolioStatuses,
  type TourPortfolioQuery,
} from "@/lib/admin/tour-portfolio-query"
import {
  normalizeTourPortfolioColumns,
  type TourPortfolioColumn,
} from "@/lib/admin/tour-portfolio-columns"

export const TOUR_SAVED_VIEW_SCOPES = ["personal", "organization"] as const
export type TourSavedViewScope = (typeof TOUR_SAVED_VIEW_SCOPES)[number]

const uuidSchema = z.string().uuid()

/** Persisted filter subset — must stay compatible with portfolio query grammar. */
export const tourSavedViewFiltersSchema = z.object({
  status: z.string().optional().nullable(),
  q: z.string().max(200).optional().nullable(),
  sort: z.enum(TOUR_PORTFOLIO_SORT_FIELDS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  start_from: z.string().optional().nullable(),
  start_to: z.string().optional().nullable(),
  tag: z.string().max(500).optional().nullable(),
  owner: z.union([uuidSchema, z.literal("")]).optional().nullable(),
  lead: z.union([uuidSchema, z.literal("")]).optional().nullable(),
})

export type TourSavedViewFilters = z.output<typeof tourSavedViewFiltersSchema>

export interface TourSavedViewRecord {
  id: string
  org_id: string
  scope: TourSavedViewScope
  owner_user_id: string | null
  name: string
  filters: TourSavedViewFilters
  columns: TourPortfolioColumn[]
  is_default: boolean
  created_by: string | null
  updated_by: string | null
  created_at?: string
  updated_at?: string
}

export class TourSavedViewError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = "TourSavedViewError"
    this.code = code
    this.status = status
  }
}

export function validateTourSavedViewFilters(input: unknown): TourSavedViewFilters {
  const parsed = tourSavedViewFiltersSchema.safeParse(input ?? {})
  if (!parsed.success) {
    throw new TourSavedViewError(
      "invalid_view_filters",
      parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid view filters.",
    )
  }
  // Reuse portfolio grammar for status (rejects unknown lifecycle values).
  try {
    parseTourPortfolioStatuses(parsed.data.status)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid status filter."
    throw new TourSavedViewError("invalid_view_filters", message)
  }
  return parsed.data
}

export function validateTourSavedViewPayload(args: {
  name: unknown
  scope: unknown
  filters: unknown
  columns: unknown
  is_default?: unknown
}): {
  name: string
  scope: TourSavedViewScope
  filters: TourSavedViewFilters
  columns: TourPortfolioColumn[]
  is_default: boolean
} {
  const name = typeof args.name === "string" ? args.name.trim() : ""
  if (!name || name.length > 120) {
    throw new TourSavedViewError("invalid_view_name", "View name must be 1–120 characters.")
  }
  if (args.scope !== "personal" && args.scope !== "organization") {
    throw new TourSavedViewError("invalid_view_scope", "Scope must be personal or organization.")
  }
  const filters = validateTourSavedViewFilters(args.filters)
  const columns = normalizeTourPortfolioColumns(args.columns)
  return {
    name,
    scope: args.scope,
    filters,
    columns,
    is_default: args.is_default === true,
  }
}

/** Convert a saved view into a portfolio query (revalidated). */
export function portfolioQueryFromSavedView(args: {
  filters: TourSavedViewFilters
  limit?: number
  cursor?: string | null
}): TourPortfolioQuery {
  return parseTourPortfolioQuery({
    status: args.filters.status,
    q: args.filters.q,
    sort: args.filters.sort,
    order: args.filters.order,
    start_from: args.filters.start_from,
    start_to: args.filters.start_to,
    tag: args.filters.tag,
    owner: args.filters.owner,
    lead: args.filters.lead,
    limit: args.limit,
    cursor: args.cursor,
  })
}

export function presentTourSavedView(row: Record<string, unknown>): TourSavedViewRecord {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    scope: row.scope === "organization" ? "organization" : "personal",
    owner_user_id: row.owner_user_id ? String(row.owner_user_id) : null,
    name: String(row.name || ""),
    filters: validateTourSavedViewFilters(row.filters),
    columns: normalizeTourPortfolioColumns(row.columns),
    is_default: Boolean(row.is_default),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  }
}
