/**
 * TOUR-209 — Allowlisted portfolio columns for saved views / projection.
 */

export const TOUR_PORTFOLIO_COLUMNS = [
  "name",
  "status",
  "start_date",
  "end_date",
  "owner",
  "lead",
  "tags",
  "updated_at",
  "created_at",
  "event_count",
  "main_artist",
] as const

export type TourPortfolioColumn = (typeof TOUR_PORTFOLIO_COLUMNS)[number]

export const TOUR_PORTFOLIO_DEFAULT_COLUMNS: readonly TourPortfolioColumn[] = [
  "name",
  "status",
  "start_date",
  "end_date",
  "owner",
  "tags",
  "updated_at",
]

const COLUMN_SET = new Set<string>(TOUR_PORTFOLIO_COLUMNS)

export function normalizeTourPortfolioColumns(
  input: unknown,
): TourPortfolioColumn[] {
  if (!Array.isArray(input)) return [...TOUR_PORTFOLIO_DEFAULT_COLUMNS]
  const seen = new Set<TourPortfolioColumn>()
  for (const raw of input) {
    if (typeof raw !== "string") continue
    const key = raw.trim()
    if (!COLUMN_SET.has(key)) continue
    seen.add(key as TourPortfolioColumn)
  }
  if (seen.size === 0) return [...TOUR_PORTFOLIO_DEFAULT_COLUMNS]
  // Name is always required so unauthorized rows can't be inferred as empty slots.
  seen.add("name")
  return TOUR_PORTFOLIO_COLUMNS.filter((column) => seen.has(column))
}

export function projectTourPortfolioRow(
  row: Record<string, unknown>,
  columns: readonly TourPortfolioColumn[],
): Record<string, unknown> {
  const projected: Record<string, unknown> = { id: row.id }
  for (const column of columns) {
    if (column === "owner") {
      projected.owner_user_id = row.owner_user_id ?? null
      continue
    }
    if (column === "lead") {
      projected.lead_user_id = row.lead_user_id ?? null
      continue
    }
    if (column === "tags") {
      projected.tags = Array.isArray(row.tags) ? row.tags : []
      continue
    }
    if (column === "event_count") {
      projected.event_count = Number(row.event_count || 0)
      continue
    }
    if (column === "main_artist") {
      const settings =
        row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
          ? (row.settings as Record<string, unknown>)
          : {}
      projected.main_artist = row.main_artist ?? settings.main_artist ?? null
      continue
    }
    projected[column] = row[column] ?? null
  }
  return projected
}
