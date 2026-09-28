// ─────────────────────────────────────────────────────────────────────────────
// VEN-113 — canonical shift window math.
//
// staff_shifts stores shift_date (local venue date) + start_time/end_time
// (HH:MM local wall clock). Naive `Date.parse("1970-01-01T"+t+"Z")` math gets
// overnight shifts and DST wrong. This helper resolves both endpoints in the
// VENUE'S timezone via Intl, rolls the end forward when it lands on/before the
// start (overnight), and returns exact UTC instants + minutes.
// ─────────────────────────────────────────────────────────────────────────────

/** Offset (ms) to add to a UTC instant to get the wall clock in `timeZone`. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = dtf.formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0")
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  )
  return asUTC - instant.getTime()
}

/** Convert a wall-clock time in `timeZone` on `year/month/day` to a UTC instant. */
function wallToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // Treat the wall clock as UTC to get a candidate instant, then correct once
  // by the zone's offset at that candidate. If the correction crossed a DST
  // boundary (offset changed), apply the corrected offset instead — this
  // converges for both spring-forward gaps and fall-back overlaps.
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const offset1 = tzOffsetMs(new Date(guess), timeZone)
  const candidate = guess - offset1
  const offset2 = tzOffsetMs(new Date(candidate), timeZone)
  return new Date(guess - offset2)
}

export interface ShiftWindowInput {
  shiftDate: string // yyyy-MM-dd (venue-local)
  startTime: string // HH:MM
  endTime: string // HH:MM
  timeZone?: string // IANA name; defaults to UTC
}

export interface ShiftWindow {
  startsAt: string // ISO
  endsAt: string // ISO
  durationMinutes: number
  crossesMidnight: boolean
}

/**
 * Resolve a shift's real UTC window. Overnight shifts (end ≤ start) roll to
 * the next day. Invalid inputs throw so callers can surface errors instead of
 * silently mis-scheduling.
 */
export function resolveShiftWindow(input: ShiftWindowInput): ShiftWindow {
  const timeZone = input.timeZone || "UTC"
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.shiftDate || "")
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(input.startTime || "")
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(input.endTime || "")

  if (!dateMatch || !timeMatch || !endMatch) {
    throw new Error("shiftDate must be yyyy-MM-dd and times must be HH:MM")
  }

  const [, y, mo, d] = dateMatch
  const sh = Number(timeMatch[1])
  const sm = Number(timeMatch[2])
  const eh = Number(endMatch[1])
  const em = Number(endMatch[2])

  if (sh > 23 || eh > 23 || sm > 59 || em > 59) {
    throw new Error("Times must be valid 24-hour HH:MM values")
  }

  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)

  let startsAt = wallToInstant(year, month, day, sh, sm, timeZone)

  let endDay = day
  let endMonth = month
  let endYear = year
  // Overnight: end wall clock <= start wall clock → next calendar day.
  const crossesMidnight = eh * 60 + em <= sh * 60 + sm
  if (crossesMidnight) {
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    endYear = next.getUTCFullYear()
    endMonth = next.getUTCMonth() + 1
    endDay = next.getUTCDate()
  }

  let endsAt = wallToInstant(endYear, endMonth, endDay, eh, em, timeZone)

  // Guard: after DST fallback an overnight end can still precede start; nudge
  // by one day until strictly ordered (bounded loop for safety).
  let guard = 0
  while (endsAt.getTime() <= startsAt.getTime() && guard < 3) {
    const next = new Date(endsAt.getTime() + 24 * 3600_000)
    endsAt = next
    guard += 1
  }

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes: Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
    crossesMidnight,
  }
}
