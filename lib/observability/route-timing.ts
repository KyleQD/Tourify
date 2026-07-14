/**
 * Lightweight server-side route timing for performance baselines.
 * Additive only — does not change response bodies or auth behavior.
 */

export interface RouteTimingOptions {
  route: string
  userId?: string | null
  rowCount?: number
  queryCount?: number
  metadata?: Record<string, unknown>
}

function hashUserId(userId: string | null | undefined): string | undefined {
  if (!userId) return undefined
  return `${userId.slice(0, 8)}…`
}

function shouldSample(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const rate = Number(process.env.PERF_LOG_SAMPLE_RATE ?? '0.1')
  if (!Number.isFinite(rate) || rate <= 0) return false
  if (rate >= 1) return true
  return Math.random() < rate
}

export function startRouteTiming(route: string) {
  const started =
    typeof performance !== 'undefined' ? performance.now() : Date.now()

  return function endRouteTiming(options: Omit<RouteTimingOptions, 'route'> = {}) {
    if (!shouldSample()) return

    const durationMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
    )

    console.log('[perf:route]', {
      route,
      durationMs,
      userId: hashUserId(options.userId),
      rowCount: options.rowCount,
      queryCount: options.queryCount,
      ...options.metadata,
    })

    return durationMs
  }
}

export async function withRouteTiming<T>(
  route: string,
  fn: () => Promise<T>,
  options: Omit<RouteTimingOptions, 'route' | 'rowCount'> = {}
): Promise<T> {
  const end = startRouteTiming(route)
  try {
    const result = await fn()
    end(options)
    return result
  } catch (error) {
    end({ ...options, metadata: { ...(options.metadata || {}), error: true } })
    throw error
  }
}
