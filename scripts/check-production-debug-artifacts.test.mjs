import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appFileToRoute,
  isCoveredByProductionDenyRegistry,
  isUnsafeProductionRoute,
  scanProductionDebugSource,
} from './check-production-debug-artifacts.mjs'

test('converts App Router files to request paths', () => {
  assert.equal(appFileToRoute('/repo/app/(shell)/debug/[id]/page.tsx'), '/debug/[id]')
  assert.equal(appFileToRoute('/repo/app/api/test-db/route.ts'), '/api/test-db')
})

test('classifies only diagnostic, test, seed, and migration route segments', () => {
  assert.equal(isUnsafeProductionRoute('/api/debug/profile'), true)
  assert.equal(isUnsafeProductionRoute('/api/marketplace/migrations/backfill'), true)
  assert.equal(isUnsafeProductionRoute('/api/notifications/test'), true)
  assert.equal(isUnsafeProductionRoute('/api/admin/events/setup-completeness'), false)
  assert.equal(isUnsafeProductionRoute('/events/[slug]'), false)
})

test('requires unsafe routes to be covered by the canonical deny registry', () => {
  assert.equal(isCoveredByProductionDenyRegistry('/api/debug/profile'), true)
  assert.equal(isCoveredByProductionDenyRegistry('/api/admin/test'), true)
  assert.equal(isCoveredByProductionDenyRegistry('/api/admin/testing'), false)
})

test('keeps source artifact scanning active', () => {
  assert.deepEqual(scanProductionDebugSource('fetch("http://127.0.0.1:7556/ingest")'), [
    'localhost debug ingest URL',
    '127.0.0.1:7556 debug endpoint',
  ])
})

test('rejects fixed agent debug markers', () => {
  const failures = scanProductionDebugSource(`
    // #region agent log
    fetch("http://127.0.0.1:7556/ingest/run", {
      headers: { "X-Debug-Session-Id": "fixed" },
      body: JSON.stringify({ hypothesisId: "A" })
    })
  `)
  assert.ok(failures.includes('localhost debug ingest URL'))
  assert.ok(failures.includes('agent log region marker'))
  assert.ok(failures.includes('agent hypothesis marker'))
  assert.ok(failures.includes('debug session header'))
})

test('allows ordinary local development URLs and approved timing telemetry', () => {
  assert.deepEqual(
    scanProductionDebugSource(`
      const localOrigin = "http://localhost:3000"
      recordTiming({ route: "/api/feed/posts", elapsedMs: 12 })
    `),
    [],
  )
})
