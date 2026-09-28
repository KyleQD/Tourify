import { z } from "zod"

export const EVENT_PORTFOLIO_STATUSES = [
  "draft",
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
] as const

export const EVENT_PORTFOLIO_SORT_FIELDS = [
  "start_at",
  "title",
  "status",
  "venue_name",
  "updated_at",
  "created_at",
] as const

export type EventPortfolioStatus = (typeof EVENT_PORTFOLIO_STATUSES)[number]
export type EventPortfolioSortField = (typeof EVENT_PORTFOLIO_SORT_FIELDS)[number]

export const EVENT_PORTFOLIO_DEFAULT_LIMIT = 50
export const EVENT_PORTFOLIO_MAX_LIMIT = 100

export const eventPortfolioQuerySchema = z.object({
  status: z.string().optional().nullable(),
  q: z.string().optional().nullable(),
  sort: z.enum(EVENT_PORTFOLIO_SORT_FIELDS).optional().default("start_at"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  limit: z.coerce.number().int().min(1).max(EVENT_PORTFOLIO_MAX_LIMIT).optional().default(EVENT_PORTFOLIO_DEFAULT_LIMIT),
  cursor: z.string().optional().nullable(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  tour_id: z.preprocess(
    (value) => (value === "" || value === "all" || value == null ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  venue_id: z.preprocess(
    (value) => (value === "" || value === "all" || value == null ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  route: z.enum(["all", "touring", "standalone"]).optional().default("all"),
  readiness: z.enum(["all", "ready", "needs_attention", "at_risk", "blocked"]).optional().default("all"),
})

export type EventPortfolioQueryInput = z.input<typeof eventPortfolioQuerySchema>
export type EventPortfolioQuery = z.output<typeof eventPortfolioQuerySchema>

export interface EventPortfolioCursor {
  sort: EventPortfolioSortField
  order: "asc" | "desc"
  sortValue: string | null
  id: string
}

export interface EventPortfolioRow {
  id: string
  org_id: string | null
  title?: string | null
  name?: string | null
  status?: string | null
  start_at?: string | null
  end_at?: string | null
  venue_id?: string | null
  venue_name?: string | null
  updated_at?: string | null
  created_at?: string | null
  settings?: Record<string, unknown> | null
  tours?: Array<{ id?: string | null; name?: string | null; is_primary?: boolean | null }>
  readiness?: { status?: string | null; score?: number | null } | Record<string, unknown> | null
  [key: string]: unknown
}

export interface EventPortfolioPage {
  items: EventPortfolioRow[]
  totalCount: number
  nextCursor: string | null
  limit: number
  sort: EventPortfolioSortField
  order: "asc" | "desc"
  filters: {
    status: string[] | "all"
    q: string
    date_from: string | null
    date_to: string | null
    tour_id: string | null
    venue_id: string | null
    route: "all" | "touring" | "standalone"
    readiness: "all" | "ready" | "needs_attention" | "at_risk" | "blocked"
  }
}

export class EventPortfolioQueryError extends Error {
  readonly status = 400
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "EventPortfolioQueryError"
    this.code = code
  }
}

export function normalizeEventSearch(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()
}

export function parseEventPortfolioStatuses(raw: string | null | undefined): string[] | "all" {
  if (!raw || raw === "all") return "all"
  const parts = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (parts.length === 0) return "all"
  const invalid = parts.filter((part) => !EVENT_PORTFOLIO_STATUSES.includes(part as EventPortfolioStatus))
  if (invalid.length > 0) {
    throw new EventPortfolioQueryError(
      "invalid_status_filter",
      `Unsupported status filter: ${invalid.join(", ")}`,
    )
  }
  return [...new Set(parts)]
}

export function encodeEventPortfolioCursor(cursor: EventPortfolioCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
}

export function decodeEventPortfolioCursor(
  raw: string | null | undefined,
  expectedSort: EventPortfolioSortField,
  expectedOrder: "asc" | "desc",
): EventPortfolioCursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as EventPortfolioCursor
    if (!parsed?.id || !parsed.sort) throw new Error("incomplete")
    if (parsed.sort !== expectedSort || parsed.order !== expectedOrder) {
      throw new EventPortfolioQueryError(
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
    if (error instanceof EventPortfolioQueryError) throw error
    throw new EventPortfolioQueryError("invalid_cursor", "Cursor is invalid or corrupted.")
  }
}

export function parseEventPortfolioQuery(input: EventPortfolioQueryInput | URLSearchParams): EventPortfolioQuery {
  const raw =
    input instanceof URLSearchParams
      ? {
          status: input.get("status"),
          q: input.get("q"),
          sort: input.get("sort") || undefined,
          order: input.get("order") || undefined,
          limit: input.get("limit") || undefined,
          cursor: input.get("cursor"),
          date_from: input.get("date_from") || input.get("start_from"),
          date_to: input.get("date_to") || input.get("start_to"),
          tour_id: input.get("tour_id") || input.get("tourId") || undefined,
          venue_id: input.get("venue_id") || input.get("venueId") || undefined,
          route: input.get("route") || undefined,
          readiness: input.get("readiness") || undefined,
        }
      : input

  const parsed = eventPortfolioQuerySchema.safeParse(raw)
  if (!parsed.success) {
    throw new EventPortfolioQueryError(
      "invalid_query",
      parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid event portfolio query.",
    )
  }
  parseEventPortfolioStatuses(parsed.data.status)
  return parsed.data
}

function readSortValue(row: EventPortfolioRow, sort: EventPortfolioSortField): string | null {
  if (sort === "venue_name") {
    const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
    const venue = row.venue_name ?? settings.venue_label
    return venue == null || venue === "" ? null : String(venue)
  }
  const value = row[sort]
  if (value == null || value === "") return null
  return String(value)
}

function compareNullableStrings(left: string | null, right: string | null, order: "asc" | "desc"): number {
  if (left == null && right == null) return 0
  if (left == null) return order === "asc" ? 1 : -1
  if (right == null) return order === "asc" ? -1 : 1
  const cmp = left.localeCompare(right, "en", { numeric: true, sensitivity: "base" })
  return order === "asc" ? cmp : -cmp
}

function isAfterCursor(row: EventPortfolioRow, cursor: EventPortfolioCursor): boolean {
  const rowValue = readSortValue(row, cursor.sort)
  const valueCmp = compareNullableStrings(rowValue, cursor.sortValue, cursor.order)
  if (valueCmp !== 0) return valueCmp > 0
  return row.id > cursor.id
}

function matchesSearch(row: EventPortfolioRow, normalizedQ: string): boolean {
  if (!normalizedQ) return true
  const settings = row.settings && typeof row.settings === "object" ? row.settings : {}
  const tourNames = Array.isArray(row.tours)
    ? row.tours.map((tour) => tour.name).filter(Boolean).join(" ")
    : ""
  const haystack = normalizeEventSearch(
    [
      row.title,
      row.name,
      row.venue_name,
      settings.venue_label,
      settings.venue_city,
      settings.venue_state,
      tourNames,
    ].filter(Boolean).join(" "),
  )
  return haystack.includes(normalizedQ)
}

function matchesDateBounds(row: EventPortfolioRow, dateFrom: string | null, dateTo: string | null): boolean {
  const start = row.start_at ? String(row.start_at).slice(0, 10) : null
  if (dateFrom && (!start || start < dateFrom.slice(0, 10))) return false
  if (dateTo && (!start || start > dateTo.slice(0, 10))) return false
  return true
}

function matchesTour(row: EventPortfolioRow, tourId: string | null | undefined): boolean {
  if (!tourId) return true
  return (row.tours || []).some((tour) => tour.id === tourId)
}

function matchesVenue(row: EventPortfolioRow, venueId: string | null | undefined): boolean {
  if (!venueId) return true
  return row.venue_id === venueId
}

function matchesRoute(row: EventPortfolioRow, route: "all" | "touring" | "standalone"): boolean {
  if (route === "all") return true
  const tourCount = row.tours?.length || 0
  return route === "touring" ? tourCount > 0 : tourCount === 0
}

function matchesReadiness(
  row: EventPortfolioRow,
  readiness: "all" | "ready" | "needs_attention" | "at_risk" | "blocked",
): boolean {
  if (readiness === "all") return true
  const status = row.readiness && typeof row.readiness === "object"
    ? String((row.readiness as { status?: unknown }).status || "")
    : ""
  return status === readiness
}

export function applyEventPortfolioQuery(args: {
  rows: EventPortfolioRow[]
  query: EventPortfolioQuery
  orgId: string
}): EventPortfolioPage {
  if (!args.orgId) {
    throw new EventPortfolioQueryError("org_required", "Organization is required for event queries.")
  }

  const statuses = parseEventPortfolioStatuses(args.query.status)
  const normalizedQ = normalizeEventSearch(args.query.q)
  const dateFrom = args.query.date_from?.trim() || null
  const dateTo = args.query.date_to?.trim() || null
  const tourId = args.query.tour_id?.trim() || null
  const venueId = args.query.venue_id?.trim() || null
  const cursor = decodeEventPortfolioCursor(args.query.cursor, args.query.sort, args.query.order)

  const authorized = args.rows.filter((row) => row.org_id === args.orgId)
  const filtered = authorized.filter((row) => {
    if (statuses !== "all" && !statuses.includes(String(row.status || "").toLowerCase())) return false
    if (!matchesSearch(row, normalizedQ)) return false
    if (!matchesDateBounds(row, dateFrom, dateTo)) return false
    if (!matchesTour(row, tourId)) return false
    if (!matchesVenue(row, venueId)) return false
    if (!matchesRoute(row, args.query.route)) return false
    if (!matchesReadiness(row, args.query.readiness)) return false
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
      ? encodeEventPortfolioCursor({
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
      date_from: dateFrom,
      date_to: dateTo,
      tour_id: tourId,
      venue_id: venueId,
      route: args.query.route,
      readiness: args.query.readiness,
    },
  }
}
