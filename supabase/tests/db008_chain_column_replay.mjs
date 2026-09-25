#!/usr/bin/env node
// Wave 33: reconstruct live COLUMNS per public relation from the active chain
// (CREATE TABLE bodies + ALTER TABLE ... ADD COLUMN, in order), so column-level
// drift can be classified the same way relations are.
//
// READ-ONLY.

import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.argv[2] || process.cwd()
const OUT = process.argv[3] || "chain-columns.json"
const MIG = path.join(ROOT, "supabase/migrations")
const files = readdirSync(MIG).filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n)).sort()

const strip = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, " '")

function sp(raw) {
  const s = (raw || "").trim()
  const p = []
  let i = 0
  while (i < s.length && p.length < 2) {
    if (s[i] === " " || s[i] === ".") { i++; continue }
    if (s[i] === '"') { const e = s.indexOf('"', i + 1); if (e < 0) return null; p.push(s.slice(i + 1, e).toLowerCase()); i = e + 1; continue }
    let j = i
    while (j < s.length && /[a-z0-9_$]/.test(s[j])) j++
    if (j === i) return null
    p.push(s.slice(i, j).toLowerCase())
    i = j
  }
  if (!p.length) return null
  return p.length > 1 ? { schema: p[0], name: p[1] } : { schema: null, name: p[0] }
}

const columns = new Map() // table -> Map(col -> {firstMigration, lastMigration})
const note = (table, col, file) => {
  if (!columns.has(table)) columns.set(table, new Map())
  const m = columns.get(table)
  const prev = m.get(col)
  m.set(col, { firstMigration: prev ? prev.firstMigration : file, lastMigration: file })
}

// Balanced-paren scan for a CREATE TABLE body.
function bodyOf(sql, from) {
  const open = sql.indexOf("(", from)
  if (open < 0) return null
  let d = 0
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(") d++
    else if (sql[i] === ")") { d--; if (d === 0) return sql.slice(open + 1, i) }
  }
  return null
}

const splitTopLevel = (body) => {
  const out = []
  let d = 0
  let cur = ""
  for (const ch of body) {
    if (ch === "(") d++
    if (ch === ")") d--
    if (ch === "," && d === 0) { out.push(cur); cur = ""; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

const CTE = new RegExp(String.raw`\bcreate\s+(?:global\s+temporary\s+|local\s+temporary\s+|unlogged\s+|temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?\s*\(`, "gi")
const AADD = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?\s+add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?("?[a-z_][a-z0-9_$]*"?)\s+`, "gi")
const ADROP = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?\s+drop\s+(?:column\s+)?(?:if\s+exists\s+)?("?[a-z_][a-z0-9_$]*"?)`, "gi")

const events = []
for (const file of files) {
  const raw = readFileSync(path.join(MIG, file), "utf8")
  const sql = strip(raw)
  let m
  CTE.lastIndex = 0
  while ((m = CTE.exec(sql)) !== null) {
    if (/\b(temporary|temp|unlogged)\s+table\b/i.test(m[0])) continue
    if (m[1] && sp(`${m[1]}x`)) { /* schema-qualified; resolve below */ }
    const qualified = m[1] ? sp(m[1] + '"' + m[2] + '"') : sp(m[2])
    if (!qualified || (qualified.schema && qualified.schema !== "public")) continue
    const body = bodyOf(sql, m.index)
    if (!body) continue
    for (const part of splitTopLevel(body)) {
      const c = /^\s*"?([a-z_][a-z0-9_$]*)"?\s+\S/.exec(part)
      if (c) events.push({ seq: file, table: qualified.name, col: c[1].toLowerCase(), ev: "add" })
    }
  }
  // ALTER TABLE ... ADD/DROP COLUMN: a single ALTER can carry many comma-separated
  // `add column` clauses, so the statement is scanned as a whole rather than
  // with one regex match per clause.
  const ALTER = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$_]*)\s*\.\s*)?"?([a-z_][a-z0-9_$_]*)?"?\s+(add|drop)\b`, "gi")
  let am
  ALTER.lastIndex = 0
  while ((am = ALTER.exec(sql)) !== null) {
    const qualified = am[1] ? sp(am[1] + '"' + am[2] + '"') : sp(am[2])
    if (!qualified || (qualified.schema && qualified.schema !== "public")) continue
    // statement body: from this match to the first ';' at paren depth 0
    let depth = 0
    let end = am.index
    for (; end < sql.length; end++) {
      const ch = sql[end]
      if (ch === "(") depth++
      else if (ch === ")") depth--
      else if (ch === ";" && depth === 0) break
    }
    const stmt = sql.slice(am.index, end)
    if (/add\b/i.test(am[3])) {
      for (const c of stmt.matchAll(/\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_$_]*)"?\s+\S/g))
        events.push({ seq: file, table: qualified.name, col: c[1].toLowerCase(), ev: "add" })
    } else {
      for (const c of stmt.matchAll(/\bdrop\s+(?:column\s+)?(?:if\s+exists\s+)?"?([a-z_][a-z0-9_$_]*)"?/g))
        events.push({ seq: file, table: qualified.name, col: c[1].toLowerCase(), ev: "drop" })
    }
    ALTER.lastIndex = end
  }
}

// Apply in file order; within a file ADD-then-DROP order is approximated by
// document order of the two passes, which is adequate for classification.
let last = ""
for (const e of events) {
  if (e.seq !== last) { /* ordering by file is preserved */ }
  last = e.seq
  if (e.ev === "drop") { columns.get(e.table)?.delete(e.col); continue }
  note(e.table, e.col, e.seq)
}

const out = {}
for (const [t, m] of [...columns.entries()].sort()) out[t] = Object.fromEntries([...m.entries()].sort())
writeFileSync(OUT, JSON.stringify(out, null, 0))
console.log(`tables with reconstructed columns: ${columns.size}; total columns: ${[...columns.values()].reduce((a, m) => a + m.size, 0)}`)
