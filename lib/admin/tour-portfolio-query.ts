/**
 * TOUR-104 — Tour portfolio query contract.
 *
 * Cursor pagination, filter grammar, sort allowlist, stable counts,
 * search normalization, and org authorization boundaries.
 */

import { z } from "zod"

import { TOUR_LIFECYCLE_STATES } from "@/lib/admin/tour-lifecycle"

export const TOUR_PORTFOLIO_SORT_FIELDS = [
  "start_date",
  "end_date",
  "name",
  "status",
  "updated_at",
  "created_at",
] as const

export type TourPortfolioSortField = (typeof TOUR_PORTFOLIO_SORT_FIELDS)[number]

export const TOUR_PORTFOLIO_DEFAULT_LIMIT = 50
export const TOUR_PORTFOLIO_MAX_LIMIT = 100

const statusSchema = z.enum(TOUR_LIFECYCLE_STATES)

export const tourPortfolioQuerySchema = z.object({
  /** Comma-separated lifecycle statuses, or "all". */
  status: z.string().optional().nullable(),
  /** Free-text search over name / artist. */
  q: z.string().optional().nullable(),
  sort: z.enum(TOUR_PORTFOLIO_SORT_FIELDS).optional().default("start_date"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  limit: z.coerce.number().int().min(1).max(TOUR_PORTFOLIO_MAX_LIMIT).optional().default(TOUR_PORTFOLIO_DEFAULT_LIMIT),
  cursor: z.string().optional().nullable(),
  /** ISO date lower bound on start_date (inclusive). */
  start_from: z.string().optional().nullable(),
  /** ISO date upper bound on start_date (inclusive). */
  start_to: z.string().optional().nullable(),
  /** TOUR-209 — comma-separated tag slugs or ids. */
  tag: z.string().optional().nullable(),
  /** TOUR-209 — owner user id. */
  owner: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  /** TOUR-209 — lead user id. */
  lead: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable().optional(),
  ),
})

export type TourPortfolioQueryInput = z.input<typeof tourPortfolioQuerySchema>
export type TourPortfolioQuery = z.output<typeof tourPortfolioQuerySchema>

export interface TourPortfolioCursor {
  sort: TourPortfolioSortField
  order: "asc" | "desc"
  sortValue: string | null
  id: string
}

export interface TourPortfolioRow {
  id: string
  org_id: string | null
  name?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  updated_at?: string | null
  created_at?: string | null
  main_artist?: string | null
  artist?: string | null
  settings?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface TourPortfolioPage {
  items: TourPortfolioRow[]
  totalCount: number
  nextCursor: string | null
  limit: number
  sort: TourPortfolioSortField
  order: "asc" | "desc"
  filters: {
    status: string[] | "all"
    q: string
    start_from: string | null
    start_to: string | null
    tag: string[]
    owner: string | null
    lead: string | null
  }
}

export class TourPortfolioQueryError extends Error {
  readonly status = 400
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "TourPortfolioQueryError"
    this.code = code
  }
}

/** Collapse whitespace, trim, lowercase for stable search matching. */
export function normalizeTourSearch(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()
}

export function parseTourPortfolioStatuses(
  raw: string | null | undefined,
): string[] | "all" {
  if (!raw || raw === "all") return "all"
  const parts = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (parts.length === 0) return "all"
  const invalid = parts.filter((part) => !TOUR_LIFECYCLE_STATES.includes(part as (typeof TOUR_LIFECYCLE_STATES)[number]))
  if (invalid.length > 0) {
    throw new TourPortfolioQueryError(
      "invalid_status_filter",
      `Unsupported status filter: ${invalid.join(", ")}`,
    )
  }
  return [...new Set(parts)]
}

export function encodeTourPortfolioCursor(cursor: TourPortfolioCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
}

export function decodeTourPortfolioCursor(
  raw: string | null | undefined,
  expectedSort: TourPortfolioSortField,
  expectedOrder: "asc" | "desc",
): TourPortfolioCursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as TourPortfolioCursor
    if (!parsed?.id || !parsed.sort) {
      throw new Error("incomplete")
    }
    if (parsed.sort !== expectedSort || parsed.order !== expectedOrder) {
      throw new TourPortfolioQueryError(
        "cursor_sort_mismatch",
        "Cursor sort/order does not match the current query.",
      )
    }
    return {
      sort: parsed.sort,
      order: parsed.order,
      sortValue: parsed.sortValue ?? null,
      id: String(parsed.id),
    }
  } catch (error) {
    if (error instanceof TourPortfolioQueryError) throw error
    throw new TourPortfolioQueryError("invalid_cursor", "Cursor is invalid or corrupted.")
  }
}

export function parseTourPortfolioQuery(
  input: TourPortfolioQueryInput | URLSearchParams,
): TourPortfolioQuery {
  const raw =
    input instanceof URLSearchParams
      ? {
          status: input.get("status"),
          q: input.get("q"),
          sort: input.get("sort") || undefined,
          order: input.get("order") || undefined,
          limit: input.get("limit") || undefined,
          cursor: input.get("cursor"),
          start_from: input.get("start_from"),
          start_to: input.get("start_to"),
          tag: input.get("tag"),
          owner: input.get("owner") || undefined,
          lead: input.get("lead") || undefined,
        }
      : input

  const parsed = tourPortfolioQuerySchema.safeParse(raw)
  if (!parsed.success) {
    throw new TourPortfolioQueryError(
      "invalid_query",
      parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid portfolio query.",
    )
  }
  // Validate status grammar early (schema allows free string for comma lists).
  parseTourPortfolioStatuses(parsed.data.status)
  return parsed.data
}

function readSortValue(row: TourPortfolioRow, sort: TourPortfolioSortField): string | null {
  const value = row[sort]
  if (value == null || value === "") return null
  return String(value)
}

function compareNullableStrings(
  left: string | null,
  right: string | null,
  order: "asc" | "desc",
): number {
  if (left == null && right == null) return 0
  // nulls last for asc, nulls first for desc (stable portfolio convention)
  if (left == null) return order === "asc" ? 1 : -1
  if (right == null) return order === "asc" ? -1 : 1
  const cmp = left.localeCompare(right, "en", { numeric: true, sensitivity: "base" })
  return order === "asc" ? cmp : -cmp
}

function isAfterCursor(
  row: TourPortfolioRow,
  cursor: TourPortfolioCursor,
): boolean {
  const rowValue = readSortValue(row, cursor.sort)
  const valueCmp = compareNullableStrings(rowValue, cursor.sortValue, cursor.order)
  if (valueCmp !== 0) {
    // After cursor means further along the sort direction.
    return cursor.order === "asc" ? valueCmp > 0 : valueCmp > 0
  }
  return row.id > cursor.id
}

function matchesSearch(row: TourPortfolioRow, normalizedQ: string): boolean {
  if (!normalizedQ) return true
  const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
  const artistFromSettings =
    typeof settings.main_artist === "string" ? settings.main_artist : ""
  const haystack = normalizeTourSearch(
    [row.name, row.main_artist, row.artist, artistFromSettings].filter(Boolean).join(" "),
  )
  return haystack.includes(normalizedQ)
}

function matchesDateBounds(
  row: TourPortfolioRow,
  startFrom: string | null,
  startTo: string | null,
): boolean {
  const start = row.start_date ? String(row.start_date).slice(0, 10) : null
  if (startFrom) {
    if (!start || start < startFrom.slice(0, 10)) return false
  }
  if (startTo) {
    if (!start || start > startTo.slice(0, 10)) return false
  }
  return true
}

export function parseTourPortfolioTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  return [...new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean))]
}

function rowTagTokens(row: TourPortfolioRow): string[] {
  const tags = Array.isArray(row.tags) ? row.tags : []
  const tokens: string[] = []
  for (const tag of tags) {
    if (typeof tag === "string") {
      tokens.push(tag.trim().toLowerCase())
      continue
    }
    if (tag && typeof tag === "object") {
      const record = tag as Record<string, unknown>
      if (typeof record.slug === "string") tokens.push(record.slug.trim().toLowerCase())
      if (typeof record.id === "string") tokens.push(record.id.trim().toLowerCase())
      if (typeof record.label === "string") tokens.push(record.label.trim().toLowerCase())
    }
  }
  return tokens
}

function matchesTags(row: TourPortfolioRow, required: string[]): boolean {
  if (required.length === 0) return true
  const tokens = new Set(rowTagTokens(row))
  return required.every((tag) => tokens.has(tag))
}

function matchesOwnerLead(
  row: TourPortfolioRow,
  owner: string | null | undefined,
  lead: string | null | undefined,
): boolean {
  if (owner) {
    if (String(row.owner_user_id || "") !== owner) return false
  }
  if (lead) {
    if (String(row.lead_user_id || "") !== lead) return false
  }
  return true
}

/**
 * Apply portfolio filters/sort/cursor against an org-authorized row set.
 * Callers must already scope rows to the acting organization.
 */
export function applyTourPortfolioQuery(args: {
  rows: TourPortfolioRow[]
  query: TourPortfolioQuery
  /** Acting org — rows with a different org_id are dropped (auth boundary). */
  orgId: string
}): TourPortfolioPage {
  if (!args.orgId) {
    throw new TourPortfolioQueryError("org_required", "Organization is required for portfolio queries.")
  }

  const statuses = parseTourPortfolioStatuses(args.query.status)
  const normalizedQ = normalizeTourSearch(args.query.q)
  const startFrom = args.query.start_from?.trim() || null
  const startTo = args.query.start_to?.trim() || null
  const tags = parseTourPortfolioTags(args.query.tag)
  const owner = args.query.owner?.trim() || null
  const lead = args.query.lead?.trim() || null
  const cursor = decodeTourPortfolioCursor(args.query.cursor, args.query.sort, args.query.order)

  const authorized = args.rows.filter((row) => row.org_id === args.orgId)

  const filtered = authorized.filter((row) => {
    if (statuses !== "all") {
      const status = String(row.status || "").toLowerCase()
      if (!statuses.includes(status)) return false
    }
    if (!matchesSearch(row, normalizedQ)) return false
    if (!matchesDateBounds(row, startFrom, startTo)) return false
    if (!matchesTags(row, tags)) return false
    if (!matchesOwnerLead(row, owner, lead)) return false
    return true
  })

  filtered.sort((left, right) => {
    const cmp = compareNullableStrings(
      readSortValue(left, args.query.sort),
      readSortValue(right, args.query.sort),
      args.query.order,
    )
    if (cmp !== 0) return cmp
    return left.id.localeCompare(right.id)
  })

  const afterCursor = cursor ? filtered.filter((row) => isAfterCursor(row, cursor)) : filtered
  const pageItems = afterCursor.slice(0, args.query.limit)
  const hasMore = afterCursor.length > args.query.limit
  const last = pageItems[pageItems.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeTourPortfolioCursor({
          sort: args.query.sort,
          order: args.query.order,
          sortValue: readSortValue(last, args.query.sort),
          id: last.id,
        })
      : null

  return {
    items: pageItems,
    totalCount: filtered.length,
    nextCursor,
    limit: args.query.limit,
    sort: args.query.sort,
    order: args.query.order,
    filters: {
      status: statuses,
      q: normalizedQ,
      start_from: startFrom,
      start_to: startTo,
      tag: tags,
      owner,
      lead,
    },
  }
}

/** Convenience for URLSearchParams → page over authorized rows. */
export function queryTourPortfolioPage(args: {
  rows: TourPortfolioRow[]
  searchParams: URLSearchParams
  orgId: string
}): TourPortfolioPage {
  const query = parseTourPortfolioQuery(args.searchParams)
  return applyTourPortfolioQuery({ rows: args.rows, query, orgId: args.orgId })
}
