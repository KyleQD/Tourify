#!/usr/bin/env node
// Disposition scan for the `local_only_unapplied` marketplace family.
//
// For each archived marketplace migration, extract the surface it would create
// (tables, added columns, functions), then classify each item as
//   chainHasIt        -> a later active migration recreated it; nothing to do
//   liveCodeNeedsIt   -> absent from the chain AND referenced by product code
//                        -> a real gap that blocks a route
//   unreferenced      -> absent from the chain and no live consumer
//
// READ-ONLY. Contacts no database.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"

const ROOT = process.argv[2] || process.cwd()
const ARCHIVE = path.join(ROOT, "supabase/migration-archive/pre-reconciliation-local-only-2026-08-20")
const MIG = path.join(ROOT, "supabase/migrations")

const strip = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").replace(/'(?:''|[^'])*'/g, " ")

const chainFiles = readdirSync(MIG).filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n))
const chainText = chainFiles.map((f) => strip(readFileSync(path.join(MIG, f), "utf8"))).join("\n")
const chainHas = (kind, name) => {
  if (kind === "table") return new RegExp(String.raw`\bcreate\s+(?:unlogged\s+|temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?${name}"?\b`, "i").test(chainText)
  if (kind === "function") return new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?${name}"?\s*\(`, "i").test(chainText)
  return false
}

// A column is only "in the chain" if the chain adds THAT column to THAT table.
// A name-only match is a false negative for the gap: `guest_email` exists in the
// chain on lodging_bookings, which says nothing about marketplace_orders.
const chainColumnIndex = new Map()
{
  const A = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-z_][a-z0-9_$]*)"?\s+(add|drop)\b`, "gi")
  const C = new RegExp(String.raw`\bcreate\s+(?:unlogged\s+|temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:(?:public)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?\s*\(`, "gi")
  for (const sql of chainFiles.map((f) => strip(readFileSync(path.join(MIG, f), "utf8")))) {
    let am
    A.lastIndex = 0
    while ((am = A.exec(sql)) !== null) {
      let depth = 0, end = am.index
      for (; end < sql.length; end++) { const c = sql[end]; if (c === "(") depth++; else if (c === ")") depth--; else if (c === ";" && depth === 0) break }
      const stmt = sql.slice(am.index, end)
      const cols = [...stmt.matchAll(new RegExp(String.raw`\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_$]*)"?\s+\S`, "gi"))].map((x) => x[1].toLowerCase())
      const set = chainColumnIndex.get(am[1].toLowerCase()) || new Set()
      for (const c of cols) set.add(c)
      chainColumnIndex.set(am[1].toLowerCase(), set)
    }
    let cm
    C.lastIndex = 0
    while ((cm = C.exec(sql)) !== null) {
      const open = cm.index + cm[0].length - 1
      let d = 0, close = open
      for (; close < sql.length; close++) { const c = sql[close]; if (c === "(") d++; else if (c === ")") { d--; if (d === 0) break } }
      const body = sql.slice(open + 1, close)
      let dd = 0, cur = ""
      const parts = []
      for (const c of body) { if (c === "(") dd++; if (c === ")") dd--; if (c === "," && dd === 0) { parts.push(cur); cur = ""; continue } cur += c }
      if (cur.trim()) parts.push(cur)
      const set = chainColumnIndex.get(cm[1].toLowerCase()) || new Set()
      for (const part of parts) { const c = /^\s*"?([a-z_][a-z0-9_$]*)"?\s+\S/i.exec(part); if (c && !/^(constraint|primary|foreign|unique|check|exclude|like)$/i.test(c[1])) set.add(c[1].toLowerCase()) }
      chainColumnIndex.set(cm[1].toLowerCase(), set)
    }
  }
}
const chainHasColumn = (table, column) => (chainColumnIndex.get(table) || new Set()).has(column)

const manifest = readFileSync(path.join(ARCHIVE, "MANIFEST.csv"), "utf8").split("\n")
const marketplace = manifest
  .map((l) => l.replace(/\r$/, "").split(",").map((x) => x.trim()))
  .filter((c) => c.length >= 4 && c[1] && c[1].startsWith("marketplace"))
  .map((c) => ({ version: c[0], name: c[1], status: c[2], supersededBy: c[3] || null, file: c[c.length - 1] }))

const CODE_DIRS = ["app", "lib", "components", "hooks", "contexts", "packages"]
function consumers(name) {
  let out = ""
  try {
    out = execFileSync("rg", ["-l", "--no-messages", `-g`, "!.git", "-g", "!*.sql", `-e`, `\\b${name}\\b`, ...CODE_DIRS], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  } catch (e) { out = e.stdout || "" }
  return out.split("\n").filter(Boolean)
}

const items = []
for (const m of marketplace) {

  const p = path.join(ROOT, m.file)
  if (!statSync(p, { throwIfNoEntry: false })) { items.push({ ...m, error: "archive file missing" }); continue }
  const sql = strip(readFileSync(p, "utf8"))
  const tables = [...sql.matchAll(new RegExp(String.raw`\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_$]*)"?\s*\(`, "gi"))].map((x) => x[1].toLowerCase())
  const funcs = [...sql.matchAll(new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][a-z0-9_$]*)"?\s*\(`, "gi"))].map((x) => x[1].toLowerCase())
  const adds = []
  const A = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_$]*)"?\s+add\b`, "gi")
  let am
  while ((am = A.exec(sql)) !== null) {
    let depth = 0, end = am.index
    for (; end < sql.length; end++) { const c = sql[end]; if (c === "(") depth++; else if (c === ")") depth--; else if (c === ";" && depth === 0) break }
    const stmt = sql.slice(am.index, end)
    for (const c of stmt.matchAll(new RegExp(String.raw`\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_$]*)"?\s+\S`, "gi")))
      adds.push({ table: am[1].toLowerCase(), column: c[1].toLowerCase() })
  }
  for (const t of new Set(tables)) {
    const c = consumers(t)
    items.push({ migration: m.version, kind: "table", name: t, chain: chainHas("table", t), consumers: c.length, sample: c.slice(0, 3) })
  }
  for (const f of new Set(funcs)) {
    const c = consumers(f)
    items.push({ migration: m.version, kind: "function", name: f, chain: chainHas("function", f), consumers: c.length, sample: c.slice(0, 3) })
  }
  for (const a of new Set(adds.map((x) => `${x.table}.${x.column}`))) {
    const [table, column] = a.split(".")
    const c = consumers(column)
    items.push({ migration: m.version, kind: "column", name: a, chain: chainHasColumn(table, column), consumers: c.length, sample: c.slice(0, 3) })
  }
}

const blocking = items.filter((i) => !i.chain && i.consumers > 0)
const missingUnreferenced = items.filter((i) => !i.chain && i.consumers === 0)
const present = items.filter((i) => i.chain)

console.log(`archived marketplace migrations: ${marketplace.length} (${marketplace.map((m) => m.version).join(", ")})`)
console.log(`surface items extracted: ${items.length}`)
console.log(`  chain already has it:            ${present.length}`)
console.log(`  chain lacks it, live code needs it (BLOCKING): ${blocking.length}`)
console.log(`  chain lacks it, no live consumer (dead):       ${missingUnreferenced.length}`)
console.log("\nBLOCKING (absent from the active chain, referenced by product code):")
for (const i of blocking.sort((a, b) => a.name.localeCompare(b.name)))
  console.log(`  ${i.kind.padEnd(8)} ${i.name.padEnd(48)} ${String(i.consumers).padStart(3)} consumer(s)  ${i.migration}\n           e.g. ${i.sample.join(", ") || "-"}`)
console.log("\nDEAD (absent from the active chain, no live consumer):")
console.log("  " + missingUnreferenced.map((i) => i.name).join(", "))
