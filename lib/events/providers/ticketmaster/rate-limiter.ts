/**
 * lib/events/providers/ticketmaster/rate-limiter.ts
 *
 * Conservative shared rate limiter. Token bucket in-process; a persisted
 * daily budget (via event_sync_runs telemetry upstream) guards the quota
 * across invocations. A reserve is always kept for user-triggered work.
 */

export interface RateLimiterOptions {
  /** Sustained requests per second. Default 4 — conservative until the
   *  actual key allowance and response headers are confirmed. */
  requestsPerSecond?: number
  /** Burst capacity. */
  burst?: number
  /** Daily request budget; null = unlimited. */
  dailyBudget?: number | null
  /** Requests per day reserved for user-triggered searches. */
  dailyReserve?: number
  now?: () => number
}

export class TicketmasterRateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly perSecond: number
  private readonly burst: number
  private readonly dailyBudget: number | null
  private readonly dailyReserve: number
  private dayKey: string
  private usedToday = 0
  private readonly now: () => number

  constructor(options: RateLimiterOptions = {}) {
    this.perSecond = options.requestsPerSecond ?? 4
    this.burst = options.burst ?? this.perSecond
    this.dailyBudget = options.dailyBudget ?? null
    this.dailyReserve = options.dailyReserve ?? 500
    this.now = options.now ?? Date.now
    this.tokens = this.burst
    this.lastRefill = this.now()
    this.dayKey = this.currentDayKey()
  }

  /** Milliseconds until a request may proceed; 0 = immediately, -1 = daily budget exhausted. */
  acquire(): number {
    this.refill()
    this.rolloverDayIfNeeded()
    if (this.dailyBudget !== null && this.usedToday >= this.dailyBudget - this.dailyReserve) {
      return -1
    }
    if (this.tokens >= 1) {
      this.tokens -= 1
      this.usedToday += 1
      return 0
    }
    return Math.ceil((1 - this.tokens) / this.perSecond * 1000)
  }

  get remainingToday(): number | null {
    if (this.dailyBudget === null) return null
    this.rolloverDayIfNeeded()
    return Math.max(0, this.dailyBudget - this.dailyReserve - this.usedToday)
  }

  private refill(): void {
    const now = this.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.perSecond)
    this.lastRefill = now
  }

  private currentDayKey(): string {
    return new Date(this.now()).toISOString().slice(0, 10)
  }

  private rolloverDayIfNeeded(): void {
    const key = this.currentDayKey()
    if (key !== this.dayKey) {
      this.dayKey = key
      this.usedToday = 0
    }
  }
}
