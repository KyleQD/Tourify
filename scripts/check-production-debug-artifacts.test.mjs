import assert from "node:assert/strict"
import test from "node:test"
import { scanProductionDebugSource } from "./check-production-debug-artifacts.mjs"

test("rejects loopback ingest and fixed agent markers", () => {
  const failures = scanProductionDebugSource(`
    // #region agent log
    fetch("http://127.0.0.1:7556/ingest/run", {
      headers: { "X-Debug-Session-Id": "fixed" },
      body: JSON.stringify({ hypothesisId: "A" })
    })
  `)
  assert.ok(failures.includes("localhost debug ingest URL"))
  assert.ok(failures.includes("agent log region marker"))
  assert.ok(failures.includes("agent hypothesis marker"))
  assert.ok(failures.includes("debug session header"))
})

test("allows ordinary local development URLs and approved timing telemetry", () => {
  assert.deepEqual(
    scanProductionDebugSource(`
      const localOrigin = "http://localhost:3000"
      recordTiming({ route: "/api/feed/posts", elapsedMs: 12 })
    `),
    [],
  )
})
