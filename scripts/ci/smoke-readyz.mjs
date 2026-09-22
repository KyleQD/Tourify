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
  console.error("Readiness smoke only permits localhost, 127.0.0.1, or ::1 targets.")
  process.exit(1)
}

const readyUrl = new URL("/readyz", baseUrl)

try {
  const response = await fetch(readyUrl, { signal: AbortSignal.timeout(5_000) })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    console.error(`Local readiness smoke failed: ${readyUrl.pathname} returned HTTP ${response.status}.`)
    process.exitCode = 1
  } else if (body?.status === "ready" || body?.status === "degraded") {
    console.log(`Local readiness smoke passed: ${readyUrl.pathname} returned status ${body.status}.`)
  } else {
    console.error(`Local readiness smoke failed: ${readyUrl.pathname} returned an unexpected body.`)
    process.exitCode = 1
  }
} catch (error) {
  console.error(`Local readiness smoke could not reach ${readyUrl.origin}. Start the local app, then retry.`)
  process.exitCode = 1
}