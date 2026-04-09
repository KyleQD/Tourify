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

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : undefined

export function createRateLimiter({ namespace, limit, windowSec }: RateLimitConfig) {
  if (!redis) return { check: async () => ({ success: true, remaining: undefined, reset: undefined } as RateLimitResult) }
  const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: namespace })
  return {
    async check(key: string) {
      const res = await rl.limit(key)
      return { success: res.success, remaining: res.remaining, reset: res.reset } as RateLimitResult
    }
  }
}


