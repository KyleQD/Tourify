#!/usr/bin/env node
// Independent attribution audit for db008_chain_contract_replay.mjs.
//
// The replay attributes every reconstructed column to the migration that created
// it. This script does not trust that attribution: for EVERY contract column it
// re-reads the attributed migration from disk and requires the file to mention
// both the relation and the column. An attribution the source text does not
// support is a replay bug, and this is what catches it.
//
// READ-ONLY.
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.argv[2] || process.cwd()
const REPLAY_DIR = path.join(ROOT, "supabase/tests")
const MIG = path.join(ROOT, "supabase/migrations")

// Re-derive the contract's columns straight from the generated types so this
// script shares no parsing code with the replay.
const gen = readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8")
const contract = new Map()
const REL = /^ {6}"?([A-Za-z0-9_$]+)"?: \{\n {8}Row: \{\n([\s\S]*?)^ {8}\}/gm
let m
while ((m = REL.exec(gen)) !== null) {
  const cols = []
  for (const line of m[2].split("\n")) {
    const c = /^\s+"?([A-Za-z0-9_$]+)"?:\s*(.+?)\s*$/.exec(line)
    if (c) cols.push(c[1].toLowerCase())
  }
  contract.set(m[1].toLowerCase(), cols)
}

// The replay writes its reconstruction next to its report. Run it once if the
// sidecar is not already present.
const { execFileSync } = await import("node:child_process")
const base = path.join(REPLAY_DIR, ".attribution-audit.json")
execFileSync("node", [path.join(REPLAY_DIR, "db008_chain_contract_replay.mjs"), ROOT, base], { stdio: "ignore" })
const chain = JSON.parse(readFileSync(base.replace(/\.json$/, "") + ".chain-columns.json", "utf8"))
const report = JSON.parse(readFileSync(base, "utf8"))
// View relations carry no column replay; the replay proves their surface by
// literal name occurrence in the defining migration instead. Read that verdict
// rather than re-deriving it, so this script stays an independent check of the
// TABLE attribution only.
const views = new Set(report.viewRelationsWithoutColumnReplay || [])

const cache = new Map()
const text = (file) => {
  if (!cache.has(file)) cache.set(file, readFileSync(path.join(MIG, file), "utf8"))
  return cache.get(file)
}
const files = new Set(readdirSync(MIG).filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n)))

let checked = 0
const unverified = []
const unsupported = []
for (const [rel, cols] of contract) {
  const live = chain[rel]
  if (!live) {
    if (views.has(rel)) continue // covered by the replay's view name-occurrence surface
    unverified.push(`${rel}: relation absent from the reconstruction`)
    continue
  }
  for (const c of cols) {
    const src = live[c]
    if (!src) { unverified.push(`${rel}.${c}: no chain provenance`); continue }
    checked++
    const file = src.replace(/ \(dynamic-ddl supplement\)$/, "")
    if (!files.has(file)) { unsupported.push(`${rel}.${c}: attributed to a file that is not an active migration (${src})`); continue }
    const t = text(file)
    const colRx = new RegExp(`\\b${c}\\b`, "i")
    const relRx = new RegExp(`\\b${rel}\\b`, "i")
    if (!colRx.test(t) || !relRx.test(t)) unsupported.push(`${rel}.${c}: ${file} does not mention both the relation and the column`)
  }
}

console.log(`contract columns checked: ${checked} (table relations)`)
console.log(`view relations covered by the replay's name-occurrence surface: ${views.size}`)
console.log(`no chain provenance: ${unverified.length}`)
for (const u of unverified.slice(0, 20)) console.log(`  ${u}`)
console.log(`attribution unsupported by the cited file: ${unsupported.length}`)
for (const u of unsupported.slice(0, 20)) console.log(`  ${u}`)
process.exit(unverified.length + unsupported.length === 0 ? 0 : 1)
