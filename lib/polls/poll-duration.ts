export const POLL_DURATIONS = ['1d', '3d', '7d', '14d'] as const

export type PollDuration = (typeof POLL_DURATIONS)[number]

const DURATION_MS: Record<PollDuration, number> = {
  '1d': 1 * 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
}

export function isPollDuration(value: unknown): value is PollDuration {
  return typeof value === 'string' && (POLL_DURATIONS as readonly string[]).includes(value)
}

export function resolvePollEndsAt(params: {
  duration?: unknown
  from?: Date
}): Date | null {
  const from = params.from || new Date()
  if (!isPollDuration(params.duration)) return null
  return new Date(from.getTime() + DURATION_MS[params.duration])
}

export function normalizePollOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((option) => (typeof option === 'string' ? option.trim() : ''))
    .filter((option) => option.length > 0)
    .slice(0, 4)
}

export function isValidPollOptionCount(options: string[]): boolean {
  return options.length >= 2 && options.length <= 4
}

export function isPollClosed(endsAt: string | Date | null | undefined, now = new Date()): boolean {
  if (!endsAt) return false
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() <= now.getTime()
}
