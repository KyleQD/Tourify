/**
 * World preview smoke suite (P1-T07).
 * Usage: node scripts/world/preview-smoke.mjs [base_url]
 * Exits non-zero on any failure; writes JSON results to stdout and
 * world-preview-smoke-results.json for CI artifacts.
 */
const base = process.argv[2] ?? "http://127.0.0.1:3311"
const results = []
let failed = false

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function attempt(path) {
  const res = await fetch(base + path)
  const body = await res.text()
  return { res, body }
}

async function check(name, path, { status = 200, contains = [], attempts = 3, backoffMs = 8000 }) {
  let ok = false
  let detail = ""
  // Dev servers compile routes lazily; retry until warm before failing.
  for (let i = 0; i < attempts; i += 1) {
    try {
      const { res, body } = await attempt(path)
      const statusOk = res.status === status
      const contentOk = contains.every((needle) => body.includes(needle))
      ok = statusOk && contentOk
      if (ok || res.status < 500) {
        detail = `status=${res.status} expected=${status} content=${contains.map((n) => body.includes(n)).join(",")}`
        break
      }
      detail = `status=${res.status}`
    } catch (error) {
      detail = `fetch failed: ${error.message}`
    }
    if (i < attempts - 1) await sleep(backoffMs)
  }
  if (!ok) failed = true
  results.push({ name, path, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`)
}

await check("Discover renders", "/discover", { status: 200 })
await check(
  "Globe page + deep link",
  "/discover/world?place=detroit",
  { status: 200, contains: ["Explore the planet", "WORLD OF MUSIC"] },
)
{
  const res = await fetch(base + "/api/world/globe")
  const body = await res.json().catch(() => null)
  const keys = body?.places?.map((p) => p.key) ?? []
  const ok =
    res.status === 200 &&
    body?.schemaVersion === "world-globe-v0.1" &&
    ["detroit", "kingston", "lagos", "london", "tokyo"].every((k) => keys.includes(k))
  results.push({ name: "Globe API index", path: "/api/world/globe", ok, detail: `keys=${keys.join(",")}` })
  console.log(`${ok ? "PASS" : "FAIL"} Globe API index keys=${keys.join(",")}`)
  if (!ok) failed = true
}
await check("Pilot place profile", "/internal/world/pilot/detroit", {
  status: 200,
  contains: ["Detroit"],
})
await check("Review console gate (unauthenticated)", "/internal/world/console", {
  status: 200,
  contains: ["Sign in required"],
})

const summary = JSON.stringify({ base, failed, results }, null, 2)
console.log(summary)
const fs = await import("node:fs")
fs.writeFileSync("world-preview-smoke-results.json", summary)
process.exit(failed ? 1 : 0)
