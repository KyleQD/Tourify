/**
 * WORK-411 — Labor cost forecast (pure).
 *
 * Computes a tour/event-scoped workforce budget forecast from:
 *   - A rate card per person/role (base rate, OT multiplier, per diem)
 *   - Planned shift windows (estimated hours)
 *   - Premium flags (overtime, travel, holiday)
 *   - Committed vs actual amounts (actual from approved time sheets)
 *
 * Access control principle (referenced in spec):
 *   - Rate card and individual line-item amounts are behind `finance` capability.
 *   - Summary totals (committed/forecast/actual) are accessible to workforce managers.
 *   - This module is pure — callers must enforce capability before passing rate data.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Rate card
// ---------------------------------------------------------------------------

export type EmploymentCategory = "employee" | "contractor" | "volunteer"

export interface RateCard {
  person_id: string
  role_label: string
  department: string
  employment_category: EmploymentCategory
  /** Base hourly rate (null = volunteer / rate not yet set). */
  base_rate_per_hour: number | null
  currency: string
  /** Overtime multiplier (e.g. 1.5 for US OT). Null = no OT multiplier. */
  overtime_multiplier: number | null
  /** Daily per diem amount. Null = not applicable. */
  per_diem_daily: number | null
  /** Explicit travel day rate override. Null = falls back to base rate × hours. */
  travel_day_rate: number | null
}

// ---------------------------------------------------------------------------
// Shift cost input
// ---------------------------------------------------------------------------

export type ShiftCostFlag = "overtime" | "travel_day" | "holiday_premium" | "call_back"

export interface ShiftCostInput {
  shift_id: string
  person_id: string
  date: string
  /** Duration in hours (may be fractional). */
  estimated_hours: number
  /** Actual hours from approved time sheet. Null = not yet recorded. */
  actual_hours: number | null
  flags: ShiftCostFlag[]
  /** When true, per diem is included for this date. */
  includes_per_diem: boolean
}

// ---------------------------------------------------------------------------
// Line-item output
// ---------------------------------------------------------------------------

export interface CostLineItem {
  shift_id: string
  person_id: string
  date: string
  employment_category: EmploymentCategory
  currency: string
  /** Estimated labor cost (base + premium + per diem) based on estimated_hours. */
  estimated_labor: number | null
  /** Per diem component of estimated cost. */
  estimated_per_diem: number | null
  /** Committed cost = estimated if assignment confirmed/confirmed; null otherwise. */
  committed: number | null
  /** Actual cost from approved time sheet. Null until actuals are recorded. */
  actual: number | null
  /** Effective rate used (may differ from base due to premiums). */
  effective_rate_per_hour: number | null
  flags: ShiftCostFlag[]
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface LaborCostForecast {
  tour_id: string
  currency: string
  /** Total estimated cost across all line items. Null when any rate is unknown. */
  estimated_total: number | null
  /** Committed total (confirmed line items). Null when any committed rate unknown. */
  committed_total: number | null
  /** Actual total from approved time sheets. Null until actuals are complete. */
  actual_total: number | null
  /** Per-person subtotals (for finance view). */
  by_person: Array<{
    person_id: string
    estimated: number | null
    committed: number | null
    actual: number | null
  }>
  /** Per-department subtotals (for workforce manager view — no rates). */
  by_department: Array<{
    department: string
    headcount: number
    estimated_hours: number
    actual_hours: number | null
  }>
  line_items: CostLineItem[]
}

// ---------------------------------------------------------------------------
// Pure helper
// ---------------------------------------------------------------------------

function applyPremium(
  baseRate: number,
  hours: number,
  flags: ShiftCostFlag[],
  card: RateCard,
): number {
  let rate = baseRate

  if (flags.includes("overtime") && card.overtime_multiplier != null) {
    rate = baseRate * card.overtime_multiplier
  } else if (flags.includes("call_back")) {
    // Call back minimum — 4h at base (convention, not configurable here)
    return Math.max(4, hours) * baseRate
  } else if (flags.includes("travel_day") && card.travel_day_rate != null) {
    // Travel day flat rate overrides hourly
    return card.travel_day_rate
  } else if (flags.includes("holiday_premium") && card.overtime_multiplier != null) {
    rate = baseRate * card.overtime_multiplier
  }

  return rate * hours
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

export function computeLaborCostForecast(args: {
  tour_id: string
  rate_cards: RateCard[]
  shifts: ShiftCostInput[]
  /** Set of shift_ids that have confirmed assignments (used to mark committed). */
  confirmed_shift_ids: Set<string>
  /** Department affiliation per person (person_id → department). */
  person_departments: Map<string, string>
}): LaborCostForecast {
  const { tour_id, rate_cards, shifts, confirmed_shift_ids, person_departments } = args

  const cardMap = new Map(rate_cards.map((c) => [c.person_id, c]))

  const lineItems: CostLineItem[] = []
  let hasUnknownRate = false

  for (const shift of shifts) {
    const card = cardMap.get(shift.person_id)

    if (!card || card.base_rate_per_hour == null) {
      hasUnknownRate = true
      lineItems.push({
        shift_id: shift.shift_id,
        person_id: shift.person_id,
        date: shift.date,
        employment_category: card?.employment_category ?? "contractor",
        currency: card?.currency ?? "USD",
        estimated_labor: null,
        estimated_per_diem: null,
        committed: null,
        actual: null,
        effective_rate_per_hour: null,
        flags: shift.flags,
      })
      continue
    }

    const laborCost = applyPremium(
      card.base_rate_per_hour,
      shift.estimated_hours,
      shift.flags,
      card,
    )
    const perDiem = shift.includes_per_diem && card.per_diem_daily != null
      ? card.per_diem_daily
      : 0

    const estimatedTotal = laborCost + perDiem

    // Actual cost from approved time sheet
    let actual: number | null = null
    if (shift.actual_hours != null) {
      const actualLabor = applyPremium(card.base_rate_per_hour, shift.actual_hours, shift.flags, card)
      actual = actualLabor + perDiem
    }

    const committed = confirmed_shift_ids.has(shift.shift_id) ? estimatedTotal : null

    const effectiveRate =
      shift.flags.includes("travel_day") && card.travel_day_rate != null
        ? null  // flat rate, not per-hour
        : shift.estimated_hours > 0 ? laborCost / shift.estimated_hours : null

    lineItems.push({
      shift_id: shift.shift_id,
      person_id: shift.person_id,
      date: shift.date,
      employment_category: card.employment_category,
      currency: card.currency,
      estimated_labor: laborCost,
      estimated_per_diem: perDiem > 0 ? perDiem : null,
      committed,
      actual,
      effective_rate_per_hour: effectiveRate,
      flags: shift.flags,
    })
  }

  // Determine single currency (first found, or "USD" fallback)
  const currency = rate_cards[0]?.currency ?? "USD"

  // Totals
  const estimatedTotal = hasUnknownRate
    ? null
    : lineItems.reduce<number>((sum, li) => {
        const v = (li.estimated_labor ?? 0) + (li.estimated_per_diem ?? 0)
        return sum + v
      }, 0)

  const committedTotal = lineItems.every((li) => li.committed !== null)
    ? lineItems.reduce<number>((sum, li) => sum + (li.committed ?? 0), 0)
    : lineItems.filter((li) => li.committed != null).reduce<number>(
        (sum, li) => sum + (li.committed ?? 0),
        0,
      )

  const actualTotal = lineItems.some((li) => li.actual !== null)
    ? lineItems.reduce<number>((sum, li) => sum + (li.actual ?? 0), 0)
    : null

  // By-person subtotals
  const personMap = new Map<string, { est: number | null; comm: number | null; actual: number | null }>()
  for (const li of lineItems) {
    const prev = personMap.get(li.person_id) ?? { est: 0, comm: 0, actual: 0 }
    const est = li.estimated_labor != null
      ? (prev.est ?? 0) + li.estimated_labor + (li.estimated_per_diem ?? 0)
      : null
    const comm = li.committed != null ? (prev.comm ?? 0) + li.committed : prev.comm
    const act = li.actual != null ? (prev.actual ?? 0) + li.actual : prev.actual
    personMap.set(li.person_id, { est, comm, actual: act })
  }

  // By-department subtotals (no rates — headcount + hours only)
  const deptMap = new Map<string, { headcount: Set<string>; estHours: number; actualHours: number | null }>()
  for (const shift of shifts) {
    const dept = person_departments.get(shift.person_id) ?? "Unknown"
    const prev = deptMap.get(dept) ?? { headcount: new Set(), estHours: 0, actualHours: 0 }
    prev.headcount.add(shift.person_id)
    prev.estHours += shift.estimated_hours
    if (shift.actual_hours != null) {
      prev.actualHours = (prev.actualHours ?? 0) + shift.actual_hours
    }
    deptMap.set(dept, prev)
  }

  return {
    tour_id,
    currency,
    estimated_total: estimatedTotal,
    committed_total: committedTotal > 0 ? committedTotal : null,
    actual_total: actualTotal,
    by_person: Array.from(personMap.entries()).map(([person_id, v]) => ({
      person_id,
      estimated: v.est,
      committed: v.comm,
      actual: v.actual,
    })),
    by_department: Array.from(deptMap.entries()).map(([department, v]) => ({
      department,
      headcount: v.headcount.size,
      estimated_hours: v.estHours,
      actual_hours: v.actualHours,
    })),
    line_items: lineItems,
  }
}
