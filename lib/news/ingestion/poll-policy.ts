export type NewsSourcePriority = 1 | 2 | 3

export interface NextNewsPollInput {
  sourceId: string
  priority: NewsSourcePriority
  failedAttempts: number
  previousSucceeded: boolean
  now: Date
  retryAfterSeconds?: number
}

const BASE_INTERVAL_MINUTES: Record<NewsSourcePriority, number> = {
  1: 15,
  2: 30,
  3: 60
}

/**
 * Deterministic schedule policy. A separately secured scheduler applies it
 * to approved source records; it does not fetch URLs or create jobs itself.
 */
export function nextNewsPollAt(input: NextNewsPollInput): string {
  const nowMs = input.now.getTime()
  if (!Number.isFinite(nowMs) || !input.sourceId || ![1, 2, 3].includes(input.priority)) {
    throw new Error('Invalid news polling configuration')
  }
  const failures = Math.max(0, Math.min(8, Math.floor(input.failedAttempts)))
  const base = BASE_INTERVAL_MINUTES[input.priority] * 60_000
  const delay = input.previousSucceeded ? base : Math.min(6 * 60 * 60_000, base * (2 ** failures))

  // Stable per-source jitter avoids synchronized hot-source request bursts.
  let seed = 0
  for (const char of input.sourceId) {
    seed = ((seed * 31) + char.charCodeAt(0)) >>> 0
  }
  const jitter = 0.95 + (seed % 101) / 1000 // 0.95 .. 1.05
  let milliseconds = Math.round(delay * jitter)
  if (!input.previousSucceeded && input.retryAfterSeconds != null &&
      Number.isFinite(input.retryAfterSeconds) && input.retryAfterSeconds > 0) {
    milliseconds = Math.max(milliseconds,
      Math.min(24 * 60 * 60_000, input.retryAfterSeconds * 1000))
  }
  return new Date(nowMs + milliseconds).toISOString()
}
