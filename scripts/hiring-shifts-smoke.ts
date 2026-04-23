/**
 * HTTP smoke checks for unified jobs + venue staffing shifts.
 *
 * Usage:
 *   npx tsx scripts/hiring-shifts-smoke.ts
 *
 * Env:
 *   HIRING_SMOKE_BASE_URL   — default http://127.0.0.1:3000
 *   HIRING_SMOKE_COOKIE     — optional full Cookie header (session) for authenticated routes
 *   HIRING_SMOKE_VENUE_ID   — optional UUID; with cookie, GET /api/admin/staffing/shifts is tested
 *
 * Without cookie: only public-ish GET /api/jobs?merge=1 runs (session optional for that route).
 * With cookie + venue id: shifts list is requested for the given window (today → +7d UTC).
 */

import assert from "node:assert/strict"
import { addDaysIso } from "../lib/venue/staff-shift-date-range"

const base = (process.env.HIRING_SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "")
const cookie = process.env.HIRING_SMOKE_COOKIE?.trim()
const venueId = process.env.HIRING_SMOKE_VENUE_ID?.trim()

function headers(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" }
  if (cookie) h.Cookie = cookie
  return h
}

async function main() {
  const jobsUrl = `${base}/api/jobs?merge=1&per_page=5`
  let jobsRes: Response
  try {
    jobsRes = await fetch(jobsUrl, { headers: headers() })
  } catch (e) {
    console.error("[fail] Could not reach", jobsUrl)
    console.error("        Start the app (e.g. npm run dev) or set HIRING_SMOKE_BASE_URL.", e)
    process.exit(1)
  }
  const jobsJson = (await jobsRes.json()) as { success?: boolean; error?: string; data?: { unified?: unknown[] } }
  assert.equal(jobsRes.status, 200, `GET /api/jobs expected 200, got ${jobsRes.status}`)
  assert.equal(jobsJson.success, true, jobsJson.error || "GET /api/jobs?merge=1 should return success")
  console.log("[ok] GET /api/jobs?merge=1", { unifiedCount: jobsJson.data?.unified?.length ?? 0 })

  if (!cookie || !venueId) {
    console.log("[skip] HIRING_SMOKE_COOKIE + HIRING_SMOKE_VENUE_ID not both set — skipping shifts GET")
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const to = addDaysIso(today, 7)
  const shiftsUrl = `${base}/api/admin/staffing/shifts?venueId=${encodeURIComponent(venueId)}&date_from=${today}&date_to=${to}`
  const shiftsRes = await fetch(shiftsUrl, { headers: headers() })
  const shiftsText = await shiftsRes.text()
  let shiftsJson: { error?: string; data?: unknown[] }
  try {
    shiftsJson = JSON.parse(shiftsText) as { error?: string; data?: unknown[] }
  } catch {
    assert.fail(`Shifts response not JSON (status ${shiftsRes.status}): ${shiftsText.slice(0, 200)}`)
  }

  if (shiftsRes.status === 403) {
    console.log("[warn] GET /api/admin/staffing/shifts returned 403 (user may lack EDIT_EVENT_LOGISTICS on venue):", shiftsJson.error)
    return
  }

  assert.equal(shiftsRes.status, 200, `GET shifts expected 200 or 403, got ${shiftsRes.status}: ${shiftsJson.error}`)
  assert.ok(Array.isArray(shiftsJson.data), "shifts payload should include data array")
  console.log("[ok] GET /api/admin/staffing/shifts", { rows: shiftsJson.data?.length ?? 0 })
}

main().catch((e) => {
  console.error("[fail]", e)
  process.exit(1)
})
