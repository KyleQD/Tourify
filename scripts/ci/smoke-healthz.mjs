#!/usr/bin/env node

const rawBaseUrl = process.env.LOCAL_READINESS_URL ?? "http://127.0.0.1:3000"
let baseUrl

try {
  baseUrl = new URL(rawBaseUrl)
} catch {
  console.error("LOCAL_READINESS_URL must be an absolute local URL.")
  process.exit(1)
}

const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
if (!localHosts.has(baseUrl.hostname)) {
  console.error("Health smoke only permits localhost, 127.0.0.1, or ::1 targets.")
  process.exit(1)
}

const healthUrl = new URL("/healthz", baseUrl)

try {
  const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.status !== "ok") {
    console.error(`Local health smoke failed: ${healthUrl.pathname} returned HTTP ${response.status}.`)
    process.exitCode = 1
  } else {
    console.log(`Local health smoke passed: ${healthUrl.pathname} returned status ok.`)
  }
} catch (error) {
  console.error(`Local health smoke could not reach ${healthUrl.origin}. Start the local app, then retry.`)
  process.exitCode = 1
}
