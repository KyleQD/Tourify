/**
 * PLAN-208 — Selectable planner deep-copy: stops/holds/templates/settings
 * with date/timezone shift validation.
 */

export type PlannerCopyMode = "copy" | "link" | "exclude"

export interface PlannerDeepCopySelection {
  stops: PlannerCopyMode
  holds: PlannerCopyMode
  templates: PlannerCopyMode
  settings: PlannerCopyMode
  /** Days to shift local dates on copy (0 = keep). */
  dateShiftDays?: number
  /** When true, require every copied stop to have timezone. */
  requireTimezone?: boolean
}

export interface PlannerDeepCopyStop {
  id: string
  name: string
  local_date?: string | null
  timezone?: string | null
}

export interface PlannerDeepCopyValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
  effective: Required<PlannerDeepCopySelection>
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`)
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date: ${isoDate}`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function validatePlannerDeepCopySelection(args: {
  selection: PlannerDeepCopySelection
  stops: PlannerDeepCopyStop[]
}): PlannerDeepCopyValidation {
  const effective: Required<PlannerDeepCopySelection> = {
    stops: args.selection.stops,
    holds: args.selection.holds,
    templates: args.selection.templates,
    settings: args.selection.settings,
    dateShiftDays: args.selection.dateShiftDays ?? 0,
    requireTimezone: args.selection.requireTimezone ?? true,
  }

  const errors: string[] = []
  const warnings: string[] = []

  if (effective.stops === "exclude" && effective.holds === "copy") {
    errors.push("Cannot copy holds when stops are excluded.")
  }

  if (effective.stops === "link" && effective.dateShiftDays !== 0) {
    errors.push("Date shift is not allowed when stops are linked (not copied).")
  }

  if (effective.stops === "copy") {
    for (const stop of args.stops) {
      if (!stop.local_date) {
        errors.push(`Stop "${stop.name}" is missing a local date for copy.`)
        continue
      }
      try {
        shiftDate(stop.local_date, effective.dateShiftDays)
      } catch {
        errors.push(`Stop "${stop.name}" has an invalid local date.`)
      }
      if (effective.requireTimezone && !stop.timezone) {
        errors.push(`Stop "${stop.name}" is missing a time zone for shifted copy.`)
      }
    }
  }

  if (effective.settings === "link") {
    warnings.push("Settings link keeps live references; prefer copy for isolated duplicates.")
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    effective,
  }
}

export function previewShiftedStopDates(args: {
  stops: PlannerDeepCopyStop[]
  dateShiftDays: number
}): Array<{ id: string; from: string | null; to: string | null }> {
  return args.stops.map((stop) => {
    if (!stop.local_date) return { id: stop.id, from: null, to: null }
    try {
      return {
        id: stop.id,
        from: stop.local_date.slice(0, 10),
        to: shiftDate(stop.local_date, args.dateShiftDays),
      }
    } catch {
      return { id: stop.id, from: stop.local_date, to: null }
    }
  })
}
