/**
 * TRANS-306 — Actual mileage, cost, and issue tracking (pure).
 *
 * After a vehicle movement completes, operational actuals are recorded:
 *  - Actual mileage driven
 *  - Fuel and toll costs
 *  - Delay incidents
 *  - Damage/issue reports
 *  - Vendor performance notes
 *
 * These actuals feed finance (TRANS-306 → FIN-5xx) and vendor performance.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VehicleIssueType =
  | "delay"
  | "mechanical"
  | "accident"
  | "damage"
  | "vendor_issue"
  | "route_deviation"
  | "other"

export type VehicleIssueSeverity = "minor" | "moderate" | "major"

export interface VehicleIssueReport {
  issue_id: string
  movement_id: string
  issue_type: VehicleIssueType
  severity: VehicleIssueSeverity
  description: string
  reported_at: string
  reported_by: string
  /** True when this issue needs vendor follow-up. */
  requires_vendor_follow_up: boolean
  resolved_at?: string | null
  resolution_notes?: string | null
}

export interface FuelRecord {
  amount_litres: number | null
  amount_gallons: number | null
  cost: number
  currency: string
  fueled_at: string
  location_label?: string | null
}

export interface TollRecord {
  cost: number
  currency: string
  location_label?: string | null
  paid_at?: string | null
}

export interface VehicleMovementActuals {
  movement_id: string
  /** Odometer start (km). Null if not recorded. */
  odometer_start_km?: number | null
  /** Odometer end (km). */
  odometer_end_km?: number | null
  /** Total driven distance. */
  actual_distance_km?: number | null
  fuel_records: FuelRecord[]
  toll_records: TollRecord[]
  issue_reports: VehicleIssueReport[]
  /** Total fuel cost (computed). */
  total_fuel_cost?: number | null
  /** Total toll cost (computed). */
  total_toll_cost?: number | null
  /** Finance billing reference. */
  finance_ref?: string | null
  recorded_by: string
  recorded_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function computeActualDistance(actuals: VehicleMovementActuals): number | null {
  if (actuals.actual_distance_km != null) return actuals.actual_distance_km
  if (actuals.odometer_start_km != null && actuals.odometer_end_km != null) {
    return actuals.odometer_end_km - actuals.odometer_start_km
  }
  return null
}

export function computeTotalFuelCost(actuals: VehicleMovementActuals): number {
  return actuals.fuel_records.reduce((sum, f) => sum + f.cost, 0)
}

export function computeTotalTollCost(actuals: VehicleMovementActuals): number {
  return actuals.toll_records.reduce((sum, t) => sum + t.cost, 0)
}

export function hasUnresolvedIssues(actuals: VehicleMovementActuals): boolean {
  return actuals.issue_reports.some((i) => !i.resolved_at)
}

export function vendorFollowUpRequired(actuals: VehicleMovementActuals): boolean {
  return actuals.issue_reports.some((i) => i.requires_vendor_follow_up && !i.resolved_at)
}

/**
 * Build a finance summary line for this movement's actuals.
 */
export function buildActualsFinanceSummary(actuals: VehicleMovementActuals): {
  distance_km: number | null
  fuel_cost: number
  toll_cost: number
  total_cost: number
  has_issues: boolean
  finance_ref: string | null
} {
  const fuel = computeTotalFuelCost(actuals)
  const toll = computeTotalTollCost(actuals)
  return {
    distance_km: computeActualDistance(actuals),
    fuel_cost: fuel,
    toll_cost: toll,
    total_cost: fuel + toll,
    has_issues: hasUnresolvedIssues(actuals),
    finance_ref: actuals.finance_ref ?? null,
  }
}
