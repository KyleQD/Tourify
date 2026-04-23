/** Calendar date helpers for staff shift day/week views (YYYY-MM-DD). */

export type StaffShiftRangeMode = "day" | "week"

export function addDaysIso(isoDate: string, delta: number): string {
  const parts = isoDate.split("-").map((x) => parseInt(x, 10))
  const y = parts[0]
  const mo = parts[1]
  const da = parts[2]
  if (!y || !mo || !da || parts.length !== 3) throw new Error(`Invalid YYYY-MM-DD: ${isoDate}`)
  const d = new Date(Date.UTC(y, mo - 1, da))
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function shiftRangeFromAnchor(
  mode: StaffShiftRangeMode,
  anchorIsoDate: string
): { dateFrom: string; dateTo: string; navStepDays: number } {
  const navStepDays = mode === "week" ? 7 : 1
  if (mode === "day") return { dateFrom: anchorIsoDate, dateTo: anchorIsoDate, navStepDays }
  return {
    dateFrom: anchorIsoDate,
    dateTo: addDaysIso(anchorIsoDate, 6),
    navStepDays,
  }
}
