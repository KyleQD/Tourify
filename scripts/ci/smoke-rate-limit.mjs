#!/usr/bin/env node

if (process.env.RATE_LIMIT_SMOKE !== "1") {
  console.error("Rate-limit smoke is opt-in. Set RATE_LIMIT_SMOKE=1 after configuring a local Upstash-compatible target.")
  process.exit(1)
}
if (process.env.RATE_LIMIT_ENFORCE !== "true") {
  console.error("Rate-limit smoke requires RATE_LIMIT_ENFORCE=true.")
  process.exit(1)
}
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error("Rate-limit smoke requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.")
  process.exit(1)
}

const baseUrl = new URL(process.env.LOCAL_READINESS_URL ?? "http://127.0.0.1:3000")
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(baseUrl.hostname)) {
  console.error("Rate-limit smoke only permits local targets.")
  process.exit(1)
}

const endpoint = new URL("/api/search?q=local-rate-limit-probe", baseUrl)
let sawRateLimit = false
for (let count = 0; count < 61; count += 1) {
  const response = await fetch(endpoint, { headers: { "x-forwarded-for": "127.0.0.42" } })
  if (response.status === 429) {
    sawRateLimit = true
    break
  }
}

if (!sawRateLimit) {
  console.error("Rate-limit smoke did not observe a 429 from /api/search after 61 requests.")
  process.exitCode = 1
} else {
  console.log("Rate-limit smoke passed: /api/search returned 429 for the local probe identity.")
}
