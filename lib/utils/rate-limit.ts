import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitConfig {
  namespace: string
  limit: number
  windowSec: number
}

interface RateLimitResult {
  success: boolean
  remaining?: number
  reset?: number
}

let redis: Redis | undefined
let warnedUnconfigured = false

function getRedis() {
  if (redis) return redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return undefined
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return redis
}

/**
 * Whether distributed rate limiting is actually active. When Upstash env vars
 * are absent the limiter degrades to allow-all; `RATE_LIMIT_ENFORCE=true`
 * flips that degradation to fail-closed (deny) for environments that must not
 * run unprotected.
 */
export function isRateLimitingActive(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Best-effort client identity for rate-limit keys: forwarded IP when present,
 * else 'unknown-client'. Not an anti-spoof guarantee — good enough for
 * coarse abuse control behind standard proxies.
 */
export function clientKeyFromRequest(request: { headers: { get(name: string): string | null } }): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown-client'
}

export function createRateLimiter({ namespace, limit, windowSec }: RateLimitConfig) {
  return {
    async check(key: string) {
      const redisClient = getRedis()
      if (!redisClient) {
        // Explicit degradation: never silent in production.
        if (!warnedUnconfigured) {
          warnedUnconfigured = true
          if (process.env.NODE_ENV === 'production') {
            console.warn(
              '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN are not set — rate limiting is INACTIVE ' +
              '(all requests allowed). Set RATE_LIMIT_ENFORCE=true to deny instead.',
            )
          }
        }
        if (process.env.RATE_LIMIT_ENFORCE === 'true') {
          return { success: false, remaining: 0, reset: undefined } as RateLimitResult
        }
        return { success: true, remaining: undefined, reset: undefined } as RateLimitResult
      }
      const rl = new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: namespace })
      const res = await rl.limit(key)
      return { success: res.success, remaining: res.remaining, reset: res.reset } as RateLimitResult
    }
  }
}

