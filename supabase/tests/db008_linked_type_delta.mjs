#!/usr/bin/env node
// ============================================================================
// Wave 35 database lane — LINKED-TARGET TYPE DELTA.
//
// Wave 34 proved the active migration chain is a strict SUPERSET of the
// committed `lib/database.types.ts`, so a chain-only regeneration would only
// add coverage.  That proof said nothing about what the LINKED, already-applied
// target actually contains, and therefore nothing about whether
// `SUPABASE_TYPE_SOURCE=linked` regeneration would preserve or destroy coverage.
//
// This instrument answers that directly.  It parses two `supabase gen types
// typescript --schema public` payloads — the committed contract and a freshly
// generated one from any reachable target — into comparable surface maps and
// reports the exact delta in BOTH directions:
//
//   * ADDED   : target has it, committed contract does not  -> real staleness
//   * REMOVED : committed contract has it, target does not  -> REAL COVERAGE LOSS
//   * CHANGED : present in both, Row column set or nullability differs
//
// The REMOVED column is the one that matters: it is exactly the class of object
// that would be deleted from `lib/database.types.ts` by an unreviewed
// regeneration.  It is reported first and separately, and a non-empty REMOVED
// set is a hard failure of this instrument's own usefulness check below.
//
// READ-ONLY.  Contacts no database, applies no migration, writes nothing inside
// the repository.  Usage:
//
//   node supabase/tests/db008_linked_type_delta.mjs <generated-types.ts> [root]
//
// Exits 0 when the delta was measured (a REMOVED set is reported, not treated
// as a script error); exits 1 only when the input cannot be parsed or the
// self-check below fails.
// ============================================================================

import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.argv[3] || process.cwd()
const GENERATED_PATH = process.argv[2]

if (!GENERATED_PATH) {
  console.error(
    "usage: node supabase/tests/db008_linked_type_delta.mjs <generated-types.ts> [root]\n" +
      "  Produce <generated> with:\n" +
      "    supabase gen types typescript --schema public --linked > <generated>",
  )
  process.exit(1)
}

// --- parser -----------------------------------------------------------------
// `supabase gen types typescript` emits a fixed-indent shape:
//   Tables/Views:  <6sp>name: {  <8sp>Row: { <10sp>col: type ...
//   Functions:     <6sp>name: {  <8sp>Args: { ... }   <8sp>Returns: type
// Every block we care about is introduced by a line of the exact indentation
// below, which is why a line scanner is exact here and a loose regex is not.

const REL_INDENT = /^ {6}("?[A-Za-z0-9_$]+"?): \{$/
const FIELD_6 = /^ {6}("?[A-Za-z0-9_$]+"?): \{$/
const CLOSE_4 = /^ {4}\}$/
const CLOSE_2 = /^ {2}\}$/
const CLOSE_0 = /^ \}$/

const unquote = (s) => s.replace(/^"|"$/g, "").toLowerCase()

function sectionBody(src, label) {
  const open = new RegExp(`^    ${label}: \\{$`, "m")
  const m = open.exec(src)
  if (!m) return null
  const start = m.index + m[0].length
  // find the matching `    }` at the same indent
  const close = new RegExp(`^    \\}$`, "m")
  const c = close.exec(src.slice(start))
  if (!c) return null
  return src.slice(start, start + c.index)
}

function parseRelations(block) {
  // block: the text between `Tables: {` and its closing `    }`
  const out = new Map()
  if (!block) return out
  const lines = block.split("\n")
  let cur = null
  let depth = 0 // depth inside the current relation block
  let rowDepth = -1
  let inRow = false
  for (const line of lines) {
    const head = REL_INDENT.exec(line)
    if (head && depth === 0) {
      cur = unquote(head[1])
      out.set(cur, { columns: new Set(), columnTypes: new Map() })
      depth = 1
      inRow = false
      continue
    }
    if (cur) {
      if (depth === 1) {
        if (/^ {8}Row: \{$/.test(line)) { inRow = true; continue }
        if (/^ {8}(Insert|Update|Relationships):/.test(line)) { inRow = false; continue }
        if (/^ {6}\}$/.test(line)) { cur = null; depth = 0; inRow = false; continue }
        if (inRow) {
          const col = /^ {10}("?[A-Za-z0-9_$]+"?):/.exec(line)
          if (col) {
            const name = unquote(col[1])
            out.get(cur).columns.add(name)
            out.get(cur).columnTypes.set(name, line.trim().slice(col[0].length).trim())
          }
          if (/^ {8}\}$/.test(line)) inRow = false
        }
        continue
      }
      if (/^ {8}\}$/.test(line)) { depth -= 1; continue }
      if (/^ {6}\}$/.test(line)) { depth -= 1; if (depth === 0) cur = null; continue }
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
    }
  }
  return out
}

function parseFunctions(block) {
  const out = new Map()
  if (!block) return out
  const lines = block.split("\n")
  let cur = null
  let counting = false
  for (const line of lines) {
    const head = REL_INDENT.exec(line)
    if (head && cur === null) {
      cur = unquote(head[1])
      out.set(cur, { argCount: 0, returns: null })
      counting = false
      continue
    }
    if (!cur) continue
    if (/^ {6}\}$/.test(line)) { cur = null; counting = false; continue }
    if (/^ {8}Returns:/.test(line)) {
      out.get(cur).returns = line.trim().slice("Returns:".length).trim()
      continue
    }
    if (/^ {8}Args:/.test(line)) {
      // `Args: Record<never, never>` is the zero-argument form supabase emits.
      // `Args: {` opens a literal block whose members are counted individually.
      // Anything else is an unusual form; treat it as zero rather than guess.
      if (/Record<never, never>/.test(line)) {
        out.get(cur).argCount = 0
        counting = false
      } else if (/\{$/.test(line)) {
        out.get(cur).argCount = 0
        counting = true
      } else {
        out.get(cur).argCount = 0
        counting = false
      }
      continue
    }
    if (/^ {8}\}$/.test(line)) { counting = false; continue }
    if (counting && /^ {10}("?[A-Za-z0-9_$]+"?):/.test(line)) {
      out.get(cur).argCount += 1
    }
  }
  return out
}

function parseEnums(block) {
  const out = new Map()
  if (!block) return out
  for (const m of block.matchAll(/^ {6}("?[A-Za-z0-9_$]+"?): \{$/gm)) {
    const name = unquote(m[1])
    const start = m.index + m[0].length
    const close = new RegExp(`^      \\}$`, "m").exec(block.slice(start))
    if (!close) continue
    const vals = [...block.slice(start, start + close.index).matchAll(/"([^"]*)"/g)].map((v) => v[1])
    out.set(name, vals)
  }
  return out
}

function parse(src) {
  return {
    relations: new Map([
      ...parseRelations(sectionBody(src, "Tables")),
      ...parseRelations(sectionBody(src, "Views")),
    ]),
    tables: parseRelations(sectionBody(src, "Tables")),
    views: parseRelations(sectionBody(src, "Views")),
    functions: parseFunctions(sectionBody(src, "Functions")),
    enums: parseEnums(sectionBody(src, "Enums")),
    bytes: Buffer.byteLength(src, "utf8"),
  }
}

// --- self-check: the parser must be able to fail -----------------------------
// Wave 33's harness passed 7/7 while its emulation had silently not rebuilt, and
// Wave 34's five negative controls could not fail because they only ever removed
// surface.  The discipline applied here: assert the parser against inputs whose
// answer is known, before trusting a delta it computed.

function selfCheck() {
  const problems = []
  const sample = `export type Database = {
  public: {
    Tables: {
      alpha: {
        Row: {
          id: string
          label: string | null
        }
        Insert: {
          id: string
        }
        Update: {
          label: string | null
        }
        Relationships: []
      }
      beta: {
        Row: {
          nested: Json
        }
        Insert: {
          nested?: Json
        }
        Update: {
          nested?: Json
        }
        Relationships: []
      }
    }
    Views: {
      gamma_view: {
        Row: {
          count: number
        }
        Relationships: []
      }
    }
    Functions: {
      no_args: {
        Args: Record<never, never>
        Returns: number
      }
      two_args: {
        Args: {
          a: string
          b: number
        }
        Returns: string
      }
    }
    Enums: {
      mood: {
        ok: "ok"
        bad: "bad"
      }
    }
    CompositeTypes: {}
  }
} as const
`
  const p = parse(sample)
  if (p.relations.size !== 3) problems.push(`relations ${p.relations.size} != 3`)
  if (!p.tables.has("alpha") || p.tables.has("gamma_view"))
    problems.push("Tables/Views separation broken")
  if (!p.views.has("gamma_view")) problems.push("View not captured")
  if ([...p.tables.get("alpha").columns].sort().join(",") !== "id,label")
    problems.push(`alpha columns = ${[...p.tables.get("alpha").columns]}`)
  // `Insert`/`Update` must not leak into Row.
  if (p.tables.get("alpha").columns.has("id") && p.tables.get("alpha").columns.size !== 2)
    problems.push("Insert leaked into Row")
  if (p.functions.get("no_args").argCount !== 0) problems.push("no_args argCount wrong")
  if (p.functions.get("two_args").argCount !== 2) problems.push("two_args argCount wrong")
  // A three-argument function must not be truncated at two: the counting flag
  // (not a sentinel on argCount) is what makes that correct.
  const three = parse(sample.replace("          b: number", "          b: number\n          c: boolean"))
  if (three.functions.get("two_args").argCount !== 3) problems.push("three_args argCount wrong")
  if (p.functions.get("no_args").returns !== "number") problems.push("returns parse wrong")
  if (JSON.stringify(p.enums.get("mood")) !== JSON.stringify(["ok", "bad"]))
    problems.push("enum parse wrong")
  return problems
}

const selfCheckProblems = selfCheck()
if (selfCheckProblems.length) {
  console.error("SELF-CHECK FAILED — the parser cannot be trusted:", selfCheckProblems)
  process.exit(1)
}

// --- run ---------------------------------------------------------------------

const generatedRaw = readFileSync(GENERATED_PATH, "utf8").replace(/\r\n/g, "\n")
const committedRaw = readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8").replace(/\r\n/g, "\n")

const target = parse(generatedRaw)
const contract = parse(committedRaw)

// 1. relations
const relAdded = [...target.relations.keys()].filter((n) => !contract.relations.has(n)).sort()
const relRemoved = [...contract.relations.keys()].filter((n) => !target.relations.has(n)).sort()

// 2. columns, both directions, per relation
const colAdded = [] // target has, contract lacks
const colRemoved = [] // contract has, target lacks  <-- coverage loss
const colRetyped = []
for (const [rel, t] of [...target.relations].sort()) {
  const c = contract.relations.get(rel)
  if (!c) continue
  for (const col of t.columns) if (!c.columns.has(col)) colAdded.push(`${rel}.${col}`)
  for (const col of c.columns) if (!t.columns.has(col)) colRemoved.push(`${rel}.${col}`)
  for (const col of t.columns) {
    if (!c.columns.has(col)) continue
    const a = t.columnTypes.get(col)
    const b = c.columnTypes.get(col)
    if (a !== b) colRetyped.push({ ref: `${rel}.${col}`, target: a, contract: b })
  }
}

// 3. callables
const fnAdded = [...target.functions.keys()].filter((n) => !contract.functions.has(n)).sort()
const fnRemoved = [...contract.functions.keys()].filter((n) => !target.functions.has(n)).sort()
const fnArityChanged = []
for (const [n, t] of target.functions) {
  const c = contract.functions.get(n)
  if (c && c.argCount !== t.argCount) fnArityChanged.push(`${n}: ${c.argCount} -> ${t.argCount}`)
  if (c && c.returns !== t.returns) fnArityChanged.push(`${n}: returns ${c.returns} -> ${t.returns}`)
}

// 4. enums
const enumAdded = [...target.enums.keys()].filter((n) => !contract.enums.has(n)).sort()
const enumRemoved = [...contract.enums.keys()].filter((n) => !target.enums.has(n)).sort()
const enumValueChanged = []
for (const [n, vals] of target.enums) {
  const c = contract.enums.get(n)
  if (c && JSON.stringify(c) !== JSON.stringify(vals)) enumValueChanged.push(n)
}

const countCols = (m) => [...m.values()].reduce((a, r) => a + r.columns.size, 0)

const report = {
  generatedFrom: path.resolve(GENERATED_PATH),
  contract: path.join(ROOT, "lib/database.types.ts"),
  counts: {
    targetRelations: target.relations.size,
    targetColumns: countCols(target.relations),
    targetCallables: target.functions.size,
    targetEnums: target.enums.size,
    contractRelations: contract.relations.size,
    contractColumns: countCols(contract.relations),
    contractCallables: contract.functions.size,
    contractEnums: contract.enums.size,
    addedRelations: relAdded.length,
    removedRelations: relRemoved.length,
    addedColumns: colAdded.length,
    removedColumns: colRemoved.length,
    retypedColumns: colRetyped.length,
    addedCallables: fnAdded.length,
    removedCallables: fnRemoved.length,
    addedEnums: enumAdded.length,
    removedEnums: enumRemoved.length,
  },
  relationsOnlyInTarget: relAdded,
  relationsOnlyInContract: relRemoved,
  columnsOnlyInTarget: colAdded,
  columnsOnlyInContract: colRemoved,
  columnsRetyped: colRetyped,
  callablesOnlyInTarget: fnAdded,
  callablesOnlyInContract: fnRemoved,
  callableArityOrReturnChanged: fnArityChanged,
  enumsOnlyInTarget: enumAdded,
  enumsOnlyInContract: enumRemoved,
  enumValuesChanged: enumValueChanged,
}

const out = process.env.DB_LINKED_DELTA_OUT
if (out) {
  const { writeFileSync } = await import("node:fs")
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
}

console.log(JSON.stringify(report.counts, null, 2))
console.log(`\n--- COVERAGE LOSS (contract has it, target does not) ---`)
console.log(`relations: ${relRemoved.length ? relRemoved.join(" ") : "(none)"}`)
console.log(`columns:   ${colRemoved.length}`)
for (const c of colRemoved.slice(0, 200)) console.log(`  ${c}`)
if (colRemoved.length > 200) console.log(`  ... and ${colRemoved.length - 200} more`)
console.log(`callables: ${fnRemoved.length ? fnRemoved.join(" ") : "(none)"}`)
console.log(`enums:     ${enumRemoved.length ? enumRemoved.join(" ") : "(none)"}`)
console.log(`\n--- ADDITIONS (target has it, contract lacks it) ---`)
console.log(`relations: ${relAdded.length}`)
for (const r of relAdded) console.log(`  ${r}`)
console.log(`columns:   ${colAdded.length}`)
for (const c of colAdded.slice(0, 200)) console.log(`  ${c}`)
if (colAdded.length > 200) console.log(`  ... and ${colAdded.length - 200} more`)
console.log(`callables: ${fnAdded.length}`)
for (const f of fnAdded) console.log(`  ${f}`)
console.log(`enums:     ${enumAdded.length ? enumAdded.join(" ") : "(none)"}`)
console.log(`\n--- CHANGED IN PLACE ---`)
console.log(`retyped columns: ${colRetyped.length}`)
for (const c of colRetyped.slice(0, 80)) console.log(`  ${c.ref}: ${JSON.stringify(c.contract)} -> ${JSON.stringify(c.target)}`)
console.log(`callable arity/return: ${fnArityChanged.length ? fnArityChanged.join(", ") : "(none)"}`)
console.log(`enum values changed: ${enumValueChanged.length ? enumValueChanged.join(" ") : "(none)"}`)
