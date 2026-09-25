#!/usr/bin/env node
// ============================================================================
// db008_chain_contract_replay.mjs
//
// CP-016 REPRODUCIBILITY GATE for the generated Supabase contract.
//
// The generated contract lib/database.types.ts is produced by `supabase gen types`
// from a LIVE database. That is only safe to re-run when the active migration
// chain is a SUPERSET of the contract: regeneration may then only ADD coverage.
// If the chain lacks something the contract declares, regeneration DELETES real
// coverage. Wave 33 found exactly that (public.venue_profiles: 42 contract
// columns vs 19 chain columns) and refused to regenerate.
//
// This script is the measurement instrument. It reconstructs the chain's live
// public column surface by ordered event replay, parses the contract, and
// classifies the delta in three directions:
//
//   OUT_OF_BAND  contract declares it, no active migration creates it
//                -> the target was changed by DDL the chain does not contain
//   STALE        the chain creates it, the contract does not declare it
//                -> the contract predates the chain (recoverable by regeneration)
//   AGREED       both
//
// Relations and callables are classified the same way as columns so the whole
// contract surface is covered, not just the column layer.
//
// REVISION HISTORY
//   Wave 34 rewrote this from db008_chain_column_replay.mjs. That script matched
//   `add column` case-SENSITIVELY inside matchAll(), so every migration written
//   in upper-case DDL style (for example 20260908100000_reconcile_archived_
//   logistics_foundation.sql) contributed zero columns, and it also recorded
//   the keyword `constraint` as a column name. Both defects inflated the
//   apparent out-of-band delta. The case-insensitive rewrite plus the
//   constraint-keyword exclusion and the dynamic-DDL supplement below are the
//   corrections; see docs/engineering/DECISIONS.md CP-060.
//
// READ-ONLY. Contacts no database. Modifies no repository file. Writes only the
// JSON report path given on argv[3] (default ./db008-contract-replay.json).
//
// USAGE
//   node supabase/tests/db008_chain_contract_replay.mjs [root] [out.json]
//     --report   human-readable delta, exit 0 even when a delta exists
//     --check    gate: exit 1 if any contract column lacks chain provenance
// ============================================================================

import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : process.cwd()
const ARGS = process.argv.slice(2).filter((a) => a.startsWith("--"))
const POS = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const OUT = POS[1] || "db008-contract-replay.json"
const CHECK = ARGS.includes("--check")
const MIG = path.join(ROOT, "supabase/migrations")

const files = readdirSync(MIG)
  .filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n))
  .sort()

// --- SQL text normalisation -------------------------------------------------
// Comments and string/dollar-quoted literals are removed so that a `create
// table` inside a comment or an `execute format('create table ...')` body can
// never be mistaken for executed DDL. Dollar-quoted bodies are NOT removed:
// `do $$ ... alter table ... $$` really does execute (CP-059 relies on this).
const strip = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, " ")

const QUAL = String.raw`(?:(?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?[a-z_][a-z0-9_$]*"?`
const NONCOL = String.raw`(?:column|constraint|primary|foreign|unique|check|exclude|like)`

function sp(raw) {
  const s = (raw || "").trim()
  const p = []
  let i = 0
  while (i < s.length && p.length < 2) {
    if (s[i] === " " || s[i] === ".") { i++; continue }
    if (s[i] === '"') { const e = s.indexOf('"', i + 1); if (e < 0) return null; p.push(s.slice(i + 1, e).toLowerCase()); i = e + 1; continue }
    let j = i
    while (j < s.length && /[a-z0-9_$_]/.test(s[j])) j++
    if (j === i) return null
    p.push(s.slice(i, j).toLowerCase())
    i = j
  }
  if (!p.length) return null
  return p.length > 1 ? { schema: p[0], name: p[1] } : { schema: null, name: p[0] }
}

const isPublic = (q) => Boolean(q) && (!q.schema || q.schema === "public")

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

function splitTopLevel(body) {
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

const CT_SQL = String.raw`\bcreate\s+(?:global\s+temporary\s+|local\s+temporary\s+|unlogged\s+|temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?\s*\(`
const CV_SQL = String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)"?`
const ALTER_SQL = String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)\s*\.\s*)?"?([a-z_][a-z0-9_$]*)?"?`
const FN_SQL = String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(${QUAL})\s*\(`
const PR_SQL = String.raw`\bcreate\s+(?:or\s+replace\s+)?procedure\s+(${QUAL})\s*\(`
const DT_SQL = String.raw`\bdrop\s+(?:table|view)\s+(?:if\s+exists\s+)?(${QUAL})`
const DF_SQL = String.raw`\bdrop\s+(?:or\s+replace\s+)?function\s+(?:if\s+exists\s+)?(${QUAL})\s*\(`
const DP_SQL = String.raw`\bdrop\s+(?:or\s+replace\s+)?procedure\s+(?:if\s+exists\s+)?(${QUAL})\s*\(`
const RT_SQL = String.raw`\balter\s+(?:table|view)\s+(?:if\s+exists\s+)?(?:only\s+)?(${QUAL})\s+rename\s+to\s+("?[a-z_][a-z0-9_$]*"?)`
// One `add [column] [if not exists] <name> <type>` clause. The negative lookahead
// keeps `add constraint|primary key|foreign key|unique|check` out of the column
// set — the defect that produced a phantom "constraint" column in Wave 33.
const ADD_CLAUSE = new RegExp(
  String.raw`\badd\s+(?!${NONCOL}\b)\s*(?:if\s+not\s+exists\s+)?(?:column\s+)?(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_$]*)"?\s+\S`,
  "gi",
)
const ADD_COLUMN = new RegExp(String.raw`\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_$]*)"?\s+\S`, "gi")
// A dropped name must be followed by a comma or the end of the statement, which
// excludes `alter column <c> drop not null` (which would otherwise read as a
// column named `not`). `drop constraint` is excluded explicitly.
const DROP_CLAUSE = new RegExp(String.raw`\bdrop\s+(?!constraint\b)(?:column\s+)?(?:if\s+exists\s+)?"?([a-z_][a-z0-9_$]*)"?\s*(?:,|$)`, "gi")
const RENAME_COL = new RegExp(String.raw`\brename\s+column\s+"?([a-z_][a-z0-9_$]*)"?\s+to\s+"?([a-z_][a-z0-9_$]*)"?`, "gi")

// --- DYNAMIC DDL SUPPLEMENT -------------------------------------------------
// `execute format('alter table public.%I add column ...', v_table)` inside a DO
// block is invisible to every text scanner because the statement is a string.
// Exactly one active migration does this for columns; the table set is read
// verbatim from the `array[...]` literal in that file so the supplement is
// auditable against the migration it describes. A NEW dynamic-DDL site must be
// added here explicitly; `scripts/ci/check-active-migration-chain.mjs` does not
// detect it, so the delta report below is the only place it can surface.
const DYNAMIC_COLUMN_DDL = [
  {
    file: "20260625000000_polymorphic_hiring_entity.sql",
    lines: "46-57, 62-63",
    tables: [
      "job_posting_templates", "job_applications", "staff_onboarding_candidates",
      "staff_invitations", "staff_onboarding_templates", "onboarding_workflows",
      "hiring_audit_events", "hiring_eligibility_snapshots", "employment_assignments",
      "staff_members",
    ],
    columns: ["employer_entity_type", "employer_entity_id"],
  },
]

// --- event replay -----------------------------------------------------------
// Every DDL event in a file is collected WITH ITS BYTE OFFSET and applied in
// offset order. A per-kind loop would invert `drop view ...; create view ...`
// inside a single migration, which is the form
// 20260711160518_native_music_player_ecosystem.sql and
// 20260711165607_native_music_player_hardening.sql use.
/** @type {Map<string, {kind:'table'|'view', createdIn:string, cols:Map<string,string>}>} */
const rel = new Map()
/** @type {Map<string, {returns:string, createdIn:string}>} */
const fn = new Map()
const notes = []
const preCreateAlters = []
/** @type {Map<string,string[]>} */
const viewDefinedIn = new Map()

const relOf = (name) => rel.get(name)
const ensureTable = (name, file) => {
  let r = rel.get(name)
  if (!r || r.kind !== "table") { r = { kind: "table", createdIn: file, cols: r ? r.cols : new Map() }; rel.set(name, r) }
  return r
}

function scan(file, sql, raw) {
  const events = []
  const push = (offset, apply) => events.push({ offset, apply })
  let m

  const CV = new RegExp(CV_SQL, "gi")
  while ((m = CV.exec(sql)) !== null) {
    const q = sp(m[1] ? m[1] + '"' + m[2] + '"' : m[2])
    if (!isPublic(q)) continue
    push(m.index, () => { rel.set(q.name, { kind: "view", createdIn: file, cols: new Map() }); if (!viewDefinedIn.has(q.name)) viewDefinedIn.set(q.name, []); viewDefinedIn.get(q.name).push(file) })
  }

  const CT = new RegExp(CT_SQL, "gi")
  while ((m = CT.exec(sql)) !== null) {
    if (/\b(temporary|temp|unlogged)\s+table\b/i.test(m[0])) continue
    const q = sp(m[1] ? m[1] + '"' + m[2] + '"' : m[2])
    if (!isPublic(q)) continue
    const body = bodyOf(sql, m.index)
    if (!body) { notes.push({ file, at: m.index, note: "create table body unparsable" }); continue }
    push(m.index, () => {
      const r = ensureTable(q.name, file)
      for (const part of splitTopLevel(body)) {
        const c = /^\s*"?([a-z_][a-z0-9_$]*)"?\s+\S/i.exec(part)
        if (c && !new RegExp(`^${NONCOL}$`, "i").test(c[1])) r.cols.set(c[1].toLowerCase(), file)
      }
    })
  }

  const ALTER = new RegExp(ALTER_SQL, "gi")
  while ((m = ALTER.exec(sql)) !== null) {
    const q = sp(m[1] ? m[1] + '"' + m[2] + '"' : m[2])
    if (!isPublic(q)) continue
    let depth = 0
    let end = m.index
    for (; end < sql.length; end++) {
      const ch = sql[end]
      if (ch === "(") depth++
      else if (ch === ")") depth--
      else if (ch === ";" && depth === 0) break
    }
    const stmt = sql.slice(m.index, end)
    const at = m.index
    const addCols = [...stmt.matchAll(ADD_CLAUSE), ...stmt.matchAll(ADD_COLUMN)].map((c) => c[1].toLowerCase())
    const dropCols = [...stmt.matchAll(DROP_CLAUSE)].map((c) => c[1].toLowerCase())
      .filter((c) => !["column", "constraint", "if", "exists"].includes(c))
    const renCols = [...stmt.matchAll(RENAME_COL)].map((c) => [c[1].toLowerCase(), c[2].toLowerCase()])
    // A single ALTER can carry `alter column`, `add column` and `rename column`
    // clauses together (for example
    // 20260731193454_streamlined_tour_builder_quick_start.sql, which drops two
    // NOT NULLs and adds two columns in one statement), so the clauses are
    // classified independently of the statement's leading verb.
    const order = renCols.length ? ["rename", "add", "drop"] : dropCols.length ? ["drop", "add"] : ["add", "drop"]
    // Existence-guard modelling. `alter table if exists <t>` and an ALTER inside
    // a `to_regclass`/`information_schema` guard are NO-OPS when the relation
    // does not exist yet, and version order is not calendar order
    // (20260413200000 sorts after 20250904110000), so a chain can legitimately
    // carry an ALTER that a fresh replay silently skips. Those columns are then
    // present in a live target, absent from a fresh replay, and must not be
    // attributed to the chain. They are reported separately.
    // Guard detection looks at the whole enclosing PL/pgSQL block, not just the
    // ALTER statement: 20250813121000 and 20250905004500 both wrap the ALTER in a
    // `do $body$ ... if to_regclass(...) is null then return; end if; ... $body$`
    // whose guard is a SEPARATE statement. Scanning the enclosing dollar-quoted
    // block is what makes the classification correct instead of reporting four
    // spurious chain aborts.
    const blockStart = (() => {
      const open = /(?:do\s+\$[a-z_]*\$|\bbegin\b)\s*$/i
      for (let k = at; k >= 0 && at - k < 4000; k--) {
        const seg = raw.slice(k, at + 1)
        if (open.test(seg)) return k
      }
      return Math.max(0, at - 2000)
    })()
    const blockEnd = (() => {
      const close = raw.indexOf("$body$;", at)
      if (close > 0 && close - at < 4000) return close
      const dd = raw.indexOf("$$;", at)
      return dd > 0 && dd - at < 4000 ? dd : Math.min(raw.length, at + 2000)
    })()
    // The guard text lives in the RAW file: strip() removes the single-quoted
    // literals that `to_regclass('public.x')` and `table_name = 'x'` depend on,
    // so guard detection must run against the unstripped text.
    const block = raw.slice(blockStart, blockEnd)
    const nameRx = new RegExp(`(?:to_regclass\\([^)]*${q.name}|table_name\\s*=\\s*'${q.name}'|pg_class[^)]*${q.name})`, "i")
    const guarded = /\balter\s+table\s+if\s+exists\b/i.test(m[0])
      || ((/(information_schema\.(tables|columns)|to_regclass|pg_class)/i.test(block)) && nameRx.test(block))
    push(m.index, () => {
      const rr = relOf(q.name)
      if (!rr) {
        if (addCols.length || dropCols.length || renCols.length) {
          const kind = guarded ? "skippedRelationAbsentAtReplay" : "wouldAbortRelationAbsent"
          preCreateAlters.push({ file, at, relation: q.name, kind, guard: guarded ? (nameRx.test(block) ? "to_regclass/information_schema guard in the enclosing DO block" : "alter table if exists") : "none", columns: [...new Set(addCols)], dropColumns: [...new Set(dropCols)], rename: renCols })
          notes.push({ file, at, note: `${kind}: alter table ${q.name}` })
        }
        return
      }
      for (const verb of order) {
        if (verb === "rename") {
          for (const [a, b] of renCols)
            if (rr.cols.has(a)) { rr.cols.set(b, rr.cols.get(a)); rr.cols.delete(a) }
        } else if (verb === "add") {
          for (const c of addCols) if (!rr.cols.has(c)) rr.cols.set(c, file)
        } else {
          for (const c of dropCols) rr.cols.delete(c)
        }
      }
    })
    ALTER.lastIndex = end
  }

  const FN = new RegExp(FN_SQL, "gi")
  while ((m = FN.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    const returns = fnReturns(sql, m.index)
    push(m.index, () => fn.set(q.name, { returns, createdIn: file }))
  }
  const PR = new RegExp(PR_SQL, "gi")
  while ((m = PR.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    push(m.index, () => fn.set(q.name, { returns: "unknown", createdIn: file }))
  }

  const DT = new RegExp(DT_SQL, "gi")
  while ((m = DT.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    push(m.index, () => rel.delete(q.name))
  }
  const RT = new RegExp(RT_SQL, "gi")
  while ((m = RT.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    const to = m[2].replace(/"/g, "").toLowerCase()
    push(m.index, () => { if (rel.has(q.name)) { rel.set(to, rel.get(q.name)); rel.delete(q.name) } })
  }
  const DF = new RegExp(DF_SQL, "gi")
  while ((m = DF.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    push(m.index, () => fn.delete(q.name))
  }
  const DP = new RegExp(DP_SQL, "gi")
  while ((m = DP.exec(sql)) !== null) {
    const q = sp(m[1])
    if (!isPublic(q)) continue
    push(m.index, () => fn.delete(q.name))
  }

  events.sort((a, b) => a.offset - b.offset)
  for (const e of events) e.apply()
}

for (const file of files) {
  const raw = readFileSync(path.join(MIG, file), "utf8")
  scan(file, strip(raw), raw)
}

function fnReturns(sql, fromIndex) {
  const after = sql.slice(fromIndex)
  const start = after.indexOf("(")
  if (start < 0) return "unknown"
  let depth = 0
  let i = start
  for (; i < after.length; i++) {
    if (after[i] === "(") depth++
    else if (after[i] === ")") { depth--; if (depth === 0) break }
  }
  const tail = after.slice(i)
  const ret = /\breturns\s+(?:setof\s+|table\s*)?([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)?)/i.exec(tail)
  return ret ? ret[1].replace(/\s*\.\s*/, ".").toLowerCase() : "unknown"
}

// apply the audited dynamic-DDL supplement
for (const spec of DYNAMIC_COLUMN_DDL) {
  if (!files.includes(spec.file)) { notes.push({ file: spec.file, note: "dynamic-DDL supplement references a migration that is not in the active chain" }); continue }
  for (const t of spec.tables) {
    const r = ensureTable(t, spec.file)
    for (const c of spec.columns) if (!r.cols.has(c)) r.cols.set(c, `${spec.file} (dynamic-ddl supplement)`)
  }
}

// --- generated contract -----------------------------------------------------
const gen = readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8")
/** @type {Map<string, Map<string,string>>} */
const contract = new Map()
const REL_RX = /^ {6}"?([A-Za-z0-9_$]+)"?: \{\n {8}Row: \{\n([\s\S]*?)^ {8}\}/gm
let r
while ((r = REL_RX.exec(gen)) !== null) {
  const cols = new Map()
  for (const line of r[2].split("\n")) {
    const c = /^\s+"?([A-Za-z0-9_$]+)"?:\s*(.+?)\s*$/.exec(line)
    if (c) cols.set(c[1].toLowerCase(), c[2])
  }
  contract.set(r[1].toLowerCase(), cols)
}
const contractFns = new Set()
{
  // A callable is emitted either as
  //   name: {
  //     Args: { ... }
  //     Returns: ...
  //   }
  // or, when it takes no argument,
  //   name: {
  //     Args: Record<never, never>
  //     Returns: ...
  //   }
  // so the presence of a literal `Args: {` is not a reliable membership test.
  // Wave 33's surface replay only counted the first form (125 of 141); this
  // scanner counts both and therefore matches the chain's callable count.
  const lines = gen.split("\n")
  let current = null
  for (const line of lines) {
    const head = /^ {6}"?([A-Za-z0-9_$]+)"?: \{$/.exec(line)
    if (head) { current = head[1].toLowerCase(); continue }
    if (/^ {4}\}/.test(line)) current = null
    if (current && /^\s+Args:/.test(line)) contractFns.add(current)
  }
}

// --- delta ------------------------------------------------------------------
const outOfBand = []   // contract column, no chain provenance
const viewRelations = [] // contract relation that the chain creates as a view
const staleCols = []
for (const [name, cols] of [...contract].sort()) {
  const live = rel.get(name)
  if (!live) { outOfBand.push({ relation: name, column: "*", type: "relation", note: "relation absent from the active chain" }); continue }
  if (live.kind === "view") { viewRelations.push(name); continue }
  for (const [c, t] of cols) if (!live.cols.has(c)) outOfBand.push({ relation: name, column: c, type: t })
  for (const c of live.cols.keys()) if (!cols.has(c)) staleCols.push({ relation: name, column: c, createdIn: live.cols.get(c) })
}
const chainOnlyRelations = [...rel.keys()].filter((n) => !contract.has(n)).sort()
// `supabase gen types` never emits RETURNS trigger functions, so a trigger
// function the chain creates is not contract drift. It is reported separately so
// the callable gap is not inflated by 82 expected absences.
const chainTriggerFns = [...fn.entries()].filter(([, v]) => v.returns === "trigger").map(([k]) => k).sort()
const chainCallables = [...fn.entries()].filter(([, v]) => v.returns !== "trigger").map(([k]) => k).sort()
const chainOnlyRoutines = chainCallables.filter((n) => !contractFns.has(n)).sort()
const chainOnlyTriggerFunctions = chainTriggerFns.filter((n) => !contractFns.has(n)).sort()
const contractOnlyFns = [...contractFns].filter((n) => !fn.has(n)).sort()

const byRelation = {}
for (const o of outOfBand) (byRelation[o.relation] ||= []).push(o)

// View column surface. A view's columns are the SELECT list of its definition,
// which no text replay can reconstruct reliably (joins, aliases, `select *`).
// The stronger claim is therefore NOT made. Instead each contract column of each
// view is checked for a literal occurrence in the migration text that defines
// that view, and any column whose name never appears there is reported as
// `viewColumnWithoutProvenance`. A name that does appear is reported as
// `namePresentInViewDefinition`, which is weaker than a column replay and is
// labelled as such in the report.
const viewCoverage = {}
for (const name of viewRelations) {
  const cols = contract.get(name) || new Map()
  const src = viewDefinedIn.get(name) || []
  const text = src.map((f) => readFileSync(path.join(MIG, f), "utf8")).join("\n")
  const missing = []
  const present = []
  for (const c of cols.keys()) (new RegExp(`\\b${c}\\b`, "i").test(text) ? present : missing).push(c)
  viewCoverage[name] = { definedIn: src, contractColumns: cols.size, namePresentInViewDefinition: present.length, viewColumnWithoutProvenance: missing }
}
const totalContractColumns = [...contract.values()].reduce((a, m) => a + m.size, 0)
const totalChainColumns = [...rel.values()].filter((r) => r.kind === "table").reduce((a, r) => a + r.cols.size, 0)

const viewColumnsWithoutProvenance = Object.values(viewCoverage).reduce((a, v) => a + v.viewColumnWithoutProvenance.length, 0)

const report = {
  generatedAt: new Date().toISOString(),
  method: "ordered CREATE/DROP/RENAME column event replay over the active chain, diffed against the Row blocks of lib/database.types.ts",
  // The safety condition for CP-016: the active chain must be a SUPERSET of the
  // contract, so that regenerating the contract from a chain-built target can
  // only ADD coverage. Four independent surfaces decide it: table columns,
  // relations, callables, and view columns (the last by name occurrence, which is
  // explicitly weaker - see viewColumnProvenanceCaveat).
  contractReproducibleFromChain:
    outOfBand.length === 0 && contractOnlyFns.length === 0 && viewColumnsWithoutProvenance === 0,
  reproductionBlockingSurfaces: {
    outOfBandColumns: outOfBand.length,
    contractOnlyRelations: Object.keys(byRelation).filter((k) => byRelation[k].some((c) => c.column === "*")).length,
    contractOnlyRoutines: contractOnlyFns.length,
    viewColumnsWithoutProvenance,
  },
  activeMigrationCount: files.length,
  chainFirst: files[0],
  chainLast: files[files.length - 1],
  counts: {
    chainTables: [...rel.values()].filter((r) => r.kind === "table").length,
    chainViews: [...rel.values()].filter((r) => r.kind === "view").length,
    chainRoutines: fn.size,
    contractRelations: contract.size,
    contractRoutines: contractFns.size,
    contractColumns: totalContractColumns,
    chainColumns: totalChainColumns,
    outOfBand: outOfBand.length,
    outOfBandRelations: Object.keys(byRelation).length,
    staleColumns: staleCols.length,
    chainOnlyRelations: chainOnlyRelations.length,
    chainOnlyCallables: chainOnlyRoutines.length,
    chainOnlyTriggerFunctions: chainOnlyTriggerFunctions.length,
    contractOnlyRoutines: contractOnlyFns.length,
    viewRelationsWithoutColumnReplay: viewRelations.length,
    viewColumnsWithoutProvenance,
    preCreateAlters: preCreateAlters.length,
  },
  outOfBandByRelation: byRelation,
  staleColumns: staleCols,
  chainOnlyRelations,
  chainOnlyCallables: chainOnlyRoutines,
  chainOnlyTriggerFunctions,
  contractOnlyRoutines: contractOnlyFns,
  viewRelationsWithoutColumnReplay: viewRelations,
  viewColumnCoverage: viewCoverage,
  viewColumnProvenanceCaveat: "View columns are checked by literal name occurrence in the defining migration, NOT by replaying the SELECT list. This is weaker than the table-column replay and is the one place where a regeneration could still remove coverage.",
  dynamicDdlSupplement: DYNAMIC_COLUMN_DDL,
  preCreateAlters,
  replayNotes: notes,
}
writeFileSync(OUT, JSON.stringify(report, null, 2))

// Expose the reconstructed column surface so an auditor can trace any single
// contract column back to the migration that creates it.
writeFileSync(
  OUT.replace(/\.json$/, "") + ".chain-columns.json",
  JSON.stringify(
    Object.fromEntries([...rel].filter(([, r]) => r.kind === "table").map(([k, r]) => [k, Object.fromEntries(r.cols)])),
    null, 0,
  ),
)

if (!CHECK) {
  console.log(JSON.stringify(report.counts, null, 1))
  console.log(`\ncontract reproducible from chain: ${report.contractReproducibleFromChain}`)
  console.log("\nOUT OF BAND (contract declares, no active migration creates):")
  for (const [name, cs] of Object.entries(byRelation))
    console.log(`  ${name} (+${cs.length})\n    ${cs.map((c) => `${c.column} ${c.type}`).join("\n    ")}`)
  console.log(`\nSTALE columns the chain creates and the contract lacks: ${staleCols.length}`)
  console.log(`chain-only relations: ${chainOnlyRelations.length} -> ${chainOnlyRelations.join(" ") || "(none)"}`)
  console.log(`chain-only CALLABLES: ${chainOnlyRoutines.length} -> ${chainOnlyRoutines.join(" ") || "(none)"}`)
  console.log(`chain-only trigger functions (never emitted by gen types): ${chainOnlyTriggerFunctions.length}`)
  console.log(`contract-only routines: ${contractOnlyFns.length} -> ${contractOnlyFns.join(" ") || "(none)"}`)
  console.log(`view relations with no column replay: ${viewRelations.length}`)
  const vm = Object.entries(viewCoverage).filter(([, v]) => v.viewColumnWithoutProvenance.length)
  console.log(`view columns with no name occurrence in the defining migration: ${vm.reduce((a, [, v]) => a + v.viewColumnWithoutProvenance.length, 0)}`)
  for (const [n2, v] of vm) console.log(`  ${n2} <- ${v.viewColumnWithoutProvenance.join(", ")}`)
  console.log(`\nALTERs a fresh replay would skip (relation absent at that point in version order): ${preCreateAlters.length}`)
  for (const a of preCreateAlters) console.log(`  ${a.kind} ${a.relation} in ${a.file} [guard: ${a.guard}] -> columns a fresh replay never creates: ${a.columns.join(", ") || "(none)"}`)
  if (notes.length) console.log(`replay notes: ${JSON.stringify(notes)}`)
}

if (CHECK) {
  if (report.contractReproducibleFromChain) {
    console.log(`PASS contract surface is a subset of the chain surface (${totalContractColumns} contract columns, ${outOfBand.length} without chain provenance, ${viewColumnsWithoutProvenance} view columns without provenance, ${contractOnlyFns.length} callables without provenance)`)
    process.exit(0)
  }
  const b = report.reproductionBlockingSurfaces
  console.error(`FAIL the active chain is NOT a superset of the generated contract; a regeneration from a chain-built target would DELETE coverage`)
  console.error(`  contract columns with no chain provenance: ${b.outOfBandColumns}`)
  for (const [name, cs] of Object.entries(byRelation)) console.error(`  ${name}: ${cs.map((c) => c.column).join(", ")}`)
  if (b.contractOnlyRoutines) console.error(`  callables with no chain provenance: ${contractOnlyFns.join(", ")}`)
  if (b.viewColumnsWithoutProvenance) for (const [n, v] of Object.entries(viewCoverage)) if (v.viewColumnWithoutProvenance.length) console.error(`  view ${n}: ${v.viewColumnWithoutProvenance.join(", ")}`)
  process.exit(1)
}
