/**
 * Logistics time helpers — prefer timestamptz + optional IANA zone for display.
 */

export interface TimeWindow {
  start: Date
  end: Date
  timeZone?: string | null
}

export function parseLogisticsDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function isValidWindow(start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  return end.getTime() > start.getTime()
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

export function hasInsufficientBuffer(args: {
  earlierEnd: Date | string | null | undefined
  laterStart: Date | string | null | undefined
  requiredMinutes: number
}): boolean {
  const earlier = parseLogisticsDate(args.earlierEnd)
  const later = parseLogisticsDate(args.laterStart)
  if (!earlier || !later) return false
  return minutesBetween(earlier, later) < args.requiredMinutes
}

export function crossesLocalMidnight(start: Date, end: Date, timeZone = 'UTC'): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(start) !== fmt.format(end)
  } catch {
    return start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)
  }
}

export function formatInTimeZone(value: Date | string, timeZone = 'UTC'): string {
  const date = parseLogisticsDate(value)
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}
