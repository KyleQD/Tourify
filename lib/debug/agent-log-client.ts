'use client'

/** Debug session NDJSON — Cursor ingest + optional file append via API. */
export function sendAgentLog(event: {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  runId?: string
}) {
  const payload = {
    sessionId: '958246',
    timestamp: Date.now(),
    ...event,
  }
  const body = JSON.stringify(payload)

  // Runtime evidence when file ingest is unavailable (paste from console).
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[TourifyDebug958246]', payload)
  }

  fetch('http://127.0.0.1:7556/ingest/15f15573-361b-4909-ba46-1f6afc0001bf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '958246' },
    body,
  }).catch(() => {})

  // Same-origin: server appends only in dev (or AGENT_DEBUG_FILE_LOG=1); prod returns 204 without writing.
  fetch('/api/debug/agent-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {})
}
