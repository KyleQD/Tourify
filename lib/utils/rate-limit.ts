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

function getRedis() {
  if (redis) return redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return undefined
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return redis
}

export function createRateLimiter({ namespace, limit, windowSec }: RateLimitConfig) {
  return {
    async check(key: string) {
      const redisClient = getRedis()
      if (!redisClient) return { success: true, remaining: undefined, reset: undefined } as RateLimitResult
      const rl = new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: namespace })
      const res = await rl.limit(key)
      return { success: res.success, remaining: res.remaining, reset: res.reset } as RateLimitResult
    }
  }
}

