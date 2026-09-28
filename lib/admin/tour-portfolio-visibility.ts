/**
 * TOUR-209 — Permission-safe portfolio visibility.
 *
 * Portfolio counts/names only include tours the actor may access.
 * Unauthorized tours are dropped silently (no names leaked).
 */

import type { TourPortfolioRow } from "@/lib/admin/tour-portfolio-query"

export interface TourPortfolioVisibilityResult {
  rows: TourPortfolioRow[]
  visibleCount: number
  droppedUnauthorizedCount: number
}

/**
 * Pure filter: keep only rows whose ids are in the accessible set.
 * When accessibleTourIds is null, treat the input as already authorized.
 */
export function filterTourPortfolioByAccess(args: {
  rows: TourPortfolioRow[]
  accessibleTourIds: ReadonlySet<string> | null
}): TourPortfolioVisibilityResult {
  if (!args.accessibleTourIds) {
    return {
      rows: args.rows,
      visibleCount: args.rows.length,
      droppedUnauthorizedCount: 0,
    }
  }

  const rows: TourPortfolioRow[] = []
  let droppedUnauthorizedCount = 0
  for (const row of args.rows) {
    if (args.accessibleTourIds.has(String(row.id))) {
      rows.push(row)
    } else {
      droppedUnauthorizedCount += 1
    }
  }
  return {
    rows,
    visibleCount: rows.length,
    droppedUnauthorizedCount,
  }
}

/**
 * Build accessible tour id set for a collaborator.
 * Org-wide managers see all provided rows; others see owned/assigned/granted only.
 */
export function buildAccessibleTourIdSet(args: {
  rows: TourPortfolioRow[]
  userId: string
  /** When true, actor may see every org tour already in `rows`. */
  canViewAllOrgTours: boolean
  teamTourIds?: readonly string[]
  grantTourIds?: readonly string[]
}): Set<string> {
  if (args.canViewAllOrgTours) {
    return new Set(args.rows.map((row) => String(row.id)))
  }

  const allowed = new Set<string>()
  const team = new Set(args.teamTourIds || [])
  const grants = new Set(args.grantTourIds || [])

  for (const row of args.rows) {
    const id = String(row.id)
    const owner = row.owner_user_id ? String(row.owner_user_id) : null
    const lead = row.lead_user_id ? String(row.lead_user_id) : null
    const createdBy = row.created_by ? String(row.created_by) : null
    const legacyUser = row.user_id ? String(row.user_id) : null
    if (
      owner === args.userId
      || lead === args.userId
      || createdBy === args.userId
      || legacyUser === args.userId
      || team.has(id)
      || grants.has(id)
    ) {
      allowed.add(id)
    }
  }
  return allowed
}

export function actorCanViewAllOrgTours(capabilities: readonly string[]): boolean {
  return (
    capabilities.includes("tour.manage")
    || capabilities.includes("tour.publish")
    || capabilities.includes("tour.archive")
    || capabilities.includes("org.admin")
  )
}
