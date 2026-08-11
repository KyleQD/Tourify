#!/usr/bin/env node
/**
 * TOUR-103 — Fail CI when app/api/tours route.ts files are missing
 * from lib/admin/legacy-tour-route-inventory.ts, or when write routes lack
 * owner/replacement/flag/retirement fields in the source.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const INVENTORY = path.join(ROOT, "lib/admin/legacy-tour-route-inventory.ts")
const TOURS_API = path.join(ROOT, "app/api/tours")

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name === "route.ts") out.push(full)
  }
  return out
}

function toApiPath(file) {
  const rel = path.relative(path.join(ROOT, "app"), file).replace(/\\/g, "/")
  return "/" + rel.replace(/\/route\.ts$/, "")
}

function main() {
  if (!existsSync(INVENTORY)) {
    console.error("Missing inventory", INVENTORY)
    process.exit(1)
  }

  const src = readFileSync(INVENTORY, "utf8")
  if (!src.includes("LEGACY_TOUR_ROUTE_INVENTORY")) {
    console.error("Inventory missing LEGACY_TOUR_ROUTE_INVENTORY export")
    process.exit(1)
  }

  const routes = walk(TOURS_API).map(toApiPath).sort()
  const missing = []
  for (const apiPath of routes) {
    if (!src.includes(`route: "${apiPath}"`)) missing.push(apiPath)
  }

  const requiredFields = [
    "owner:",
    "replacement:",
    "dataSource:",
    "flag:",
    "retirementMilestone:",
    "FEATURE_LEGACY_TOUR_API_WRITES",
    "TOUR-604",
  ]
  for (const field of requiredFields) {
    if (!src.includes(field)) {
      console.error(`Inventory missing required field/token: ${field}`)
      process.exit(1)
    }
  }

  console.log(`Legacy /api/tours route files on disk: ${routes.length}`)

  if (missing.length > 0) {
    console.error(`Unclassified legacy tour routes (${missing.length}):`)
    for (const r of missing) console.error(" -", r)
    console.error("Add entries to lib/admin/legacy-tour-route-inventory.ts")
    process.exit(1)
  }

  // Every write method family must be classified (no silent undocumented writes).
  const writeMarkers = ['"POST"', '"PUT"', '"PATCH"', '"DELETE"']
  let writeEntries = 0
  for (const line of src.split("\n")) {
    if (line.includes("methods:") && writeMarkers.some((m) => line.includes(m))) {
      writeEntries += 1
    }
  }
  if (writeEntries < 1) {
    console.error("No write-classified routes found — inventory looks empty")
    process.exit(1)
  }

  console.log(`TOUR-103 check OK — ${routes.length} routes inventoried; write entries ~${writeEntries}`)
  process.exit(0)
}

main()
