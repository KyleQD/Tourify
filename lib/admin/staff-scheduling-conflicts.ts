/**
 * Derived scheduling conflicts — detects double-bookings directly from
 * staff_shifts rows. This replaces the never-migrated `assignment_conflicts`
 * table with conflicts computed from real scheduling data.
 *
 * A double-booking = same staff member, same shift_date, overlapping
 * [start_time, end_time) windows, on shifts that are not cancelled.
 */

export interface StaffShiftConflictRow {
  id: string
  staff_member_id: string | null
  shift_date: string | null
  start_time: string | null
  end_time: string | null
  role_assignment?: string | null
  status?: string | null
}

export interface DerivedSchedulingConflict {
  /** Stable composite id: conflict:{shiftA}:{shiftB} */
  id: string
  shiftId: string | null
  otherShiftId: string | null
  personId: string | null
  conflictType: "double_booking"
  severity: "warning" | "critical"
  description: string
  status: "open"
}

/** Parse "HH:MM" / "HH:MM:SS" into minutes since midnight. */
function timeToMinutes(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") return null
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 47 || minutes > 59) return null
  return hours * 60 + minutes
}

function windowOf(shift: StaffShiftConflictRow): { start: number; end: number } | null {
  const start = timeToMinutes(shift.start_time)
  if (start === null) return null
  let end = timeToMinutes(shift.end_time)
  if (end === null) end = start + 60 // unknown end — assume a 1h block
  if (end <= start) end += 24 * 60 // overnight shift crosses midnight
  return { start, end }
}

function formatTime(value: string | null | undefined): string {
  return typeof value === "string" && value.length >= 5 ? value.slice(0, 5) : "TBD"
}

/**
 * Detect double-bookings across a set of shifts.
 * Severity is "critical" when both shifts start at the same time (full
 * collision) and "warning" for partial overlaps.
 */
export function detectDoubleBookings(shifts: StaffShiftConflictRow[]): DerivedSchedulingConflict[] {
  const conflicts: DerivedSchedulingConflict[] = []
  const seen = new Set<string>()

  const workable = shifts.filter((shift) => {
    if (!shift.staff_member_id || !shift.shift_date) return false
    const status = typeof shift.status === "string" ? shift.status.toLowerCase() : ""
    return status !== "cancelled" && status !== "canceled"
  })

  const byMemberDay = new Map<string, StaffShiftConflictRow[]>()
  for (const shift of workable) {
    const key = `${shift.staff_member_id}:${shift.shift_date}`
    const bucket = byMemberDay.get(key)
    if (bucket) bucket.push(shift)
    else byMemberDay.set(key, [shift])
  }

  for (const bucket of byMemberDay.values()) {
    if (bucket.length < 2) continue
    const windows = bucket
      .map((shift) => ({ shift, window: windowOf(shift) }))
      .filter((entry): entry is { shift: StaffShiftConflictRow; window: { start: number; end: number } } => entry.window !== null)
      .sort((a, b) => a.window.start - b.window.start)

    for (let i = 0; i < windows.length; i += 1) {
      for (let j = i + 1; j < windows.length; j += 1) {
        const a = windows[i]
        const b = windows[j]
        if (b.window.start >= a.window.end) break // sorted — no further overlaps with a
        const pairKey = [a.shift.id, b.shift.id].sort().join(":")
        if (seen.has(pairKey)) continue
        seen.add(pairKey)

        const sameStart = a.window.start === b.window.start
        const roleA = a.shift.role_assignment || "Shift"
        const roleB = b.shift.role_assignment || "Shift"
        conflicts.push({
          id: `conflict:${pairKey}`,
          shiftId: a.shift.id,
          otherShiftId: b.shift.id,
          personId: a.shift.staff_member_id,
          conflictType: "double_booking",
          severity: sameStart ? "critical" : "warning",
          description:
            `Double-booked on ${a.shift.shift_date}: ` +
            `${roleA} ${formatTime(a.shift.start_time)}–${formatTime(a.shift.end_time)} overlaps ` +
            `${roleB} ${formatTime(b.shift.start_time)}–${formatTime(b.shift.end_time)}.`,
          status: "open",
        })
      }
    }
  }

  return conflicts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1))
}
