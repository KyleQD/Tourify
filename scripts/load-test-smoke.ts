#!/usr/bin/env npx tsx
/**
 * Lightweight concurrent GET smoke against a public URL (no auth).
 * Use before/after deploys or to sanity-check latency under small parallel load.
 *
 * Usage:
 *   BASE_URL=https://demo.tourify.live CONCURRENCY=20 REQUESTS=200 npx tsx scripts/load-test-smoke.ts
 *
 * Exit 1 if failure rate exceeds MAX_FAILURE_RATE (default 0.05).
 */
import { performance } from "node:perf_hooks"

const baseUrl = (process.env.BASE_URL || process.env.PRODUCTION_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
)
const path = process.env.LOAD_TEST_PATH || "/"
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || "10"))
const totalRequests = Math.max(concurrency, Number(process.env.REQUESTS || "100"))
const maxFailureRate = Number(process.env.MAX_FAILURE_RATE || "0.05")

async function oneRequest(): Promise<boolean> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    return res.ok
  } catch {
    return false
  }
}

let nextRequestId = 0

async function worker(ok: { n: number }, fail: { n: number }) {
  while (true) {
    const id = nextRequestId++
    if (id >= totalRequests) break
    const success = await oneRequest()
    if (success) ok.n++
    else fail.n++
  }
}

async function main() {
  console.log(`Load smoke: ${baseUrl} concurrency=${concurrency} total=${totalRequests}`)
  const t0 = performance.now()
  const ok = { n: 0 }
  const fail = { n: 0 }
  const workers = Array.from({ length: concurrency }, () => worker(ok, fail))
  await Promise.all(workers)
  const ms = performance.now() - t0
  const rate = fail.n / totalRequests
  console.log(`Done in ${ms.toFixed(0)}ms — ok=${ok.n} fail=${fail.n} failureRate=${(rate * 100).toFixed(2)}%`)
  if (rate > maxFailureRate) {
    console.error(`Failure rate ${rate} exceeds max ${maxFailureRate}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
