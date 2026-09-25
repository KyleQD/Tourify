#!/usr/bin/env node
// ============================================================================
// Wave 33 database lane — authoritative static schema-surface reconstruction.
//
// Walks the 301 numbered files in supabase/migrations/ IN VERSION ORDER and
// applies CREATE / DROP / RENAME events with real offsets, so the final answer
// is the schema the chain would actually leave behind — not a bag of greps.
//
// Then diffs that reconstructed live public-schema surface against the
// generated contract lib/database.types.ts to separate:
//   * STALE TYPES  : chain creates it, generated types do not declare it
//   * TRUTHY ABSENT: neither chain nor types have it (product code queries a
//                    relation/RPC that no active migration creates)
//   * AGREE        : both have it
//
// READ-ONLY. No migration is applied, no database is contacted, no file in the
// repository is modified by this script.
// ============================================================================

import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.argv[2] || process.cwd()
const OUT = process.argv[3] || "chain-live-surface.json"
const MIG = path.join(ROOT, "supabase/migrations")
const files = readdirSync(MIG).filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n)).sort()

const strip = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, " '")

const QUAL = String.raw`(?:(?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?[a-z_][a-z0-9_$]*"?`
const RE = (s) => new RegExp(s, "gi")

const EVENTS = [] // { obj, kind, name, file, offset, returns? }

const RULES = [
  { obj: "relation", ev: "create", re: RE(String.raw`\bcreate\s+(?:global\s+temporary\s+|local\s+temporary\s+|unlogged\s+|temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?(${QUAL})`) },
  { obj: "relation", ev: "create", re: RE(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(${QUAL})`) },
  { obj: "routine", ev: "create", re: RE(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(${QUAL})\s*\(`) },
  { obj: "routine", ev: "create", re: RE(String.raw`\bcreate\s+(?:or\s+replace\s+)?procedure\s+(${QUAL})\s*\(`) },
  { obj: "relation", ev: "drop", re: RE(String.raw`\bdrop\s+table\s+(?:if\s+exists\s+)?(${QUAL})`) },
  { obj: "relation", ev: "drop", re: RE(String.raw`\bdrop\s+view\s+(?:if\s+exists\s+)?(?:(?:cascade|restrict)\s+)?(${QUAL})`) },
  { obj: "routine", ev: "drop", re: RE(String.raw`\bdrop\s+(?:or\s+replace\s+)?function\s+(?:if\s+exists\s+)?(${QUAL})\s*\(`) },
  { obj: "routine", ev: "drop", re: RE(String.raw`\bdrop\s+procedure\s+(?:if\s+exists\s+)?(${QUAL})\s*\(`) },
  { obj: "relation", ev: "rename", re: RE(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(${QUAL})\s+rename\s+to\s+("?[a-z_][a-z0-9_$]*"?)`) },
  { obj: "relation", ev: "rename", re: RE(String.raw`\balter\s+view\s+(?:if\s+exists\s+)?(${QUAL})\s+rename\s+to\s+("?[a-z_][a-z0-9_$]*"?)`) },
]

function splitName(raw) {
  // Manual scan: a (possibly quoted, possibly schema-qualified) SQL identifier.
  // Handles "public"."tbl", public.tbl, "tbl", tbl.
  const s = (raw || "").trim()
  const parts = []
  let i = 0
  while (i < s.length && parts.length < 2) {
    if (s[i] === " ") { i++; continue }
    if (s[i] === ".") { i++; continue }
    if (s[i] === '"') {
      const end = s.indexOf('"', i + 1)
      if (end < 0) return null
      parts.push(s.slice(i + 1, end).toLowerCase())
      i = end + 1
      continue
    }
    let j = i
    while (j < s.length && /[a-z0-9_$_]/.test(s[j])) j++
    if (j === i) return null
    parts.push(s.slice(i, j).toLowerCase())
    i = j
  }
  if (!parts.length) return null
  return parts.length > 1 ? { schema: parts[0], name: parts[1] } : { schema: null, name: parts[0] }
}

const fnReturns = (sql, fromIndex) => {
  const after = sql.slice(fromIndex)
  const start = after.indexOf("(")
  if (start < 0) return "unknown"
  let depth = 0
  let i = start
  for (; i < after.length; i++) {
    if (after[i] === "(") depth++
    else if (after[i] === ")") {
      depth--
      if (depth === 0) break
    }
  }
  const tail = after.slice(i)
  const ret = /\breturns\s+(?:setof\s+|table\s*)?([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)?)/i.exec(tail)
  return ret ? ret[1].replace(/\s*\.\s*/, ".").toLowerCase() : "unknown"
}

for (const [fileIndex, file] of files.entries()) {
  const sql = strip(readFileSync(path.join(MIG, file), "utf8"))
  for (const rule of RULES) {
    let m
    rule.re.lastIndex = 0
    while ((m = rule.re.exec(sql)) !== null) {
      const raw = rule.ev === "rename" ? m[1] : m[1]
      const parts = splitName(raw)
      if (!parts || (parts.schema && parts.schema !== "public")) continue
      // Transient staging tables are not part of the persistent contract.
      if (rule.obj === "relation" && rule.ev === "create" && /\b(temporary|temp|unlogged)\s+table\b/i.test(m[0])) continue
      EVENTS.push({
        seq: fileIndex * 1e7 + m.index,
        obj: rule.obj,
        ev: rule.ev,
        name: rule.ev === "rename" ? m[2].replace(/"/g, "").toLowerCase() : parts.name,
        from: parts.name,
        file,
        offset: m.index,
        returns: rule.obj === "routine" && rule.ev === "create" ? fnReturns(sql, m.index) : undefined,
        text: m[0].replace(/\s+/g, " ").slice(0, 90),
      })
    }
  }
}

// Apply events in (file order, offset order) so a DROP followed by a CREATE in the
// same file leaves the object live.
const live = new Map() // name -> { obj, returns, firstCreatedIn, lastEventIn }
for (const e of [...EVENTS].sort((a, b) => a.seq - b.seq)) {
  const key = e.name
  if (e.ev === "rename") {
    const prev = live.get(e.from)
    if (prev) {
      live.delete(e.from)
      live.set(e.name, { ...prev, name: e.name, lastEventIn: e.file })
    }
    continue
  }
  if (e.ev === "drop") {
    live.delete(key)
    continue
  }
  const prev = live.get(key)
  live.set(key, {
    name: e.name,
    obj: e.obj,
    returns: e.obj === "routine" ? e.returns : undefined,
    firstCreatedIn: prev ? prev.firstCreatedIn : e.file,
    lastEventIn: e.file,
  })
}

const chainRoutines = [...live.values()].filter((o) => o.obj === "routine")
const chainRelations = [...live.values()].filter((o) => o.obj === "relation")
const chainCallable = chainRoutines.filter((o) => o.returns !== "trigger")
const chainTriggers = chainRoutines.filter((o) => o.returns === "trigger")

// ---- Generated contract -----------------------------------------------------
const gen = readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8")
const set = (re) => {
  const s = new Set()
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
  let m
  while ((m = rx.exec(gen)) !== null) s.add(m[1].toLowerCase())
  return s
}
const genRelations = set(/(\w+):\s*\{\s*Row:\s*\{/)
// Wave 33 counted a callable only when it had a literal `Args: {` block, which
// misses every zero-argument function (`Args: Record<never, never>` and friends)
// and then over-counts elsewhere, so it reported 125 callables against a real
// 100. The line scanner below counts the entry by its own `Args:` line, which is
// the same rule supabase gen types uses. See docs/engineering/DECISIONS.md CP-060.
const genRoutines = (() => {
  const s = new Set()
  const lines = gen.split("\n")
  let current = null
  for (const line of lines) {
    const head = /^ {6}"?([A-Za-z0-9_$]+)"?: \{$/.exec(line)
    if (head) { current = head[1].toLowerCase(); continue }
    if (/^ {4}\}/.test(line)) current = null
    if (current && /^\s+Args:/.test(line)) s.add(current)
  }
  return s
})()
function genBlock(label) {
  const s = new Set()
  const b = new RegExp(`${label}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "m").exec(gen)
  if (b) for (const m of b[1].matchAll(/^\s*"?(\w+)"?:\s*\{/gm)) s.add(m[1].toLowerCase())
  return s
}
const genEnums = genBlock("Enums")
const genComposites = genBlock("CompositeTypes")

const staleRelations = chainRelations.filter((o) => !genRelations.has(o.name))
const staleRoutines = chainCallable.filter((o) => !genRoutines.has(o.name))
const typesOnlyRelations = [...genRelations].filter((n) => !chainRelations.some((o) => o.name === n))
const typesOnlyRoutines = [...genRoutines].filter((n) => !chainRoutines.some((o) => o.name === n))

const out = {
  generatedAt: new Date().toISOString(),
  method: "ordered CREATE/DROP/RENAME event replay over the active chain, compared to lib/database.types.ts",
  activeMigrationCount: files.length,
  chainFirst: files[0],
  chainLast: files[files.length - 1],
  counts: {
    chainLiveRelations: chainRelations.length,
    chainLiveCallables: chainCallable.length,
    chainLiveTriggerFunctions: chainTriggers.length,
    generatedRelations: genRelations.size,
    generatedRoutines: genRoutines.size,
    generatedEnums: genEnums.size,
    generatedComposites: genComposites.size,
    staleRelations: staleRelations.length,
    staleRoutines: staleRoutines.length,
  },
  staleRelations: Object.fromEntries(staleRelations.map((o) => [o.name, o])),
  staleRoutines: Object.fromEntries(staleRoutines.map((o) => [o.name, o])),
  typesOnlyRelations,
  typesOnlyRoutines,
}
writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log(JSON.stringify(out.counts, null, 1))
console.log("\nstale relations (chain creates, types lack):")
for (const o of staleRelations) console.log(`  ${o.name.padEnd(44)} first=${o.firstCreatedIn}`)
console.log("\nstale callables (chain creates, types lack):")
for (const o of staleRoutines) console.log(`  ${o.name.padEnd(44)} returns ${String(o.returns).padEnd(20)} first=${o.firstCreatedIn}`)
console.log("\nrelations only in generated types:", typesOnlyRelations.join(" ") || "(none)")
console.log("routines only in generated types:", typesOnlyRoutines.join(" ") || "(none)")
