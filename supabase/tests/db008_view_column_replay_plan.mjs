#!/usr/bin/env node
// ============================================================================
// Wave 35 database lane — VIEW COLUMN SELECT-LIST REPLAY (plan generator).
//
// Wave 34 left exactly one stated weakness in the CP-016 reproducibility proof:
// the 13 chain view relations were covered by COLUMN-NAME OCCURRENCE in their
// defining migration, not by replaying the SELECT list.  A name that appears in
// the file proves only that the string is somewhere in the text, so a contract
// column could in principle be "supported" by a word that is not actually an
// output column of the view.
//
// This script produces the input for a real replay.  It does NOT resolve view
// columns itself — PostgreSQL does, in db008_view_column_replay.harness.sh,
// because a view's output columns are the output columns of its query, and the
// only trustworthy way to compute them is to let the server parse and plan the
// view.  This script supplies three things:
//
//   --views   the view DDL, extracted VERBATIM from the migrations, in version
//             order, with the drop/create pairs preserved (music_tracks is
//             dropped and recreated by three separate migrations and the LAST
//             definition is the live one).
//   --stub    a `create table` for one relation carrying the column names the
//             active chain gives it.  These are dependency stubs: the harness
//             discovers the real closure from PostgreSQL's own error messages.
//   --contract the contract's declared columns for the 13 views, so the harness
//             can compare a resolved column set against a declared one.
//
// READ-ONLY.  Contacts no database.  Writes only the path given by --out.
// ============================================================================

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.env.DB_ROOT || process.cwd()
const MIG = path.join(ROOT, "supabase/migrations")

const args = process.argv.slice(2)
const MODES = new Set(["--views", "--stub", "--contract", "--list-views", "--dynamic-column-type"])
// The mode is the first recognised flag; `--stub <relation>` takes its operand
// as a separate positional, so the flag itself is always argv[0] in practice,
// but searching keeps the script tolerant of a leading operand.
const modeIdx = args.findIndex((a) => MODES.has(a))
const mode = modeIdx >= 0 ? args[modeIdx] : null
const rest = args.filter((a) => a.startsWith("--") && a !== mode)
const positional = args.filter((a) => !a.startsWith("--"))
const outFlag = args.indexOf("--out")
const OUT = outFlag >= 0 ? args[outFlag + 1] : null

const files = readdirSync(MIG).filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n)).sort()

// --- SQL text handling ------------------------------------------------------
// Wave 35 first revision blanked string-literal BODIES and then emitted the
// blanked text as the replayed DDL. `select 'Individual'::text as entity_type`
// reached PostgreSQL as `select ::text as entity_type`, and the harness reported
// a SQL syntax error that had nothing to do with the view. The lesson is the
// Wave 33 / Wave 34 one again: derive structure from one representation and emit
// a DIFFERENT one, or the emitted artifact is not the thing you inspected.
//
// So the mask is LENGTH-PRESERVING: comments and literal bodies become spaces of
// exactly the same length, so every offset in the mask is also a valid offset in
// the original. Structural matching runs on the mask; the DDL that is applied is
// sliced out of the ORIGINAL at the same offsets, so it is byte-verbatim.

function mask(sql) {
  const out = []
  const blank = (from, to) => {
    for (let k = from; k < to; k++) out.push(" ")
  }
  let i = 0
  const n = sql.length
  while (i < n) {
    if (sql.startsWith("--", i)) {
      const j = sql.indexOf("\n", i)
      const stop = j < 0 ? n : j
      blank(i, stop)
      i = stop
      continue
    }
    if (sql.startsWith("/*", i)) {
      let depth = 0
      let j = i
      while (j < n) {
        if (sql.startsWith("/*", j)) { depth++; j += 2; continue }
        if (sql.startsWith("*/", j)) { depth--; j += 2; if (depth === 0) break; continue }
        j++
      }
      const stop = Math.min(j, n)
      blank(i, stop)
      i = stop
      continue
    }
    // A dollar-quoted body is CODE, not data: several migrations create their
    // view inside a DO block, so it must stay searchable. Blanking it would be a
    // second mask, and a second mask can only lose the view.
    const dq = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i))
    if (dq) {
      const tag = dq[0]
      const end = sql.indexOf(tag, i + tag.length)
      const stop = end < 0 ? n : end + tag.length
      out.push(sql.slice(i, stop))
      i = stop
      continue
    }
    if (sql[i] === "'") {
      const start = i
      let j = i + 1
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue }
        if (sql[j] === "'") { j++; break }
        j++
      }
      blank(start, Math.min(j, n))
      i = j
      continue
    }
    out.push(sql[i])
    i++
  }
  return out.join("")
}

// Split a masked body into [maskedStatement, startOffset, endOffset]. Parentheses
// are tracked so a `;` inside a sub-select is never taken for the terminator.
function splitStatementsMasked(body) {
  const stmts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === "(") depth++
    else if (c === ")") depth = Math.max(0, depth - 1)
    else if (c === ";" && depth === 0) {
      if (body.slice(start, i).trim()) stmts.push([body.slice(start, i), start, i])
      start = i + 1
    }
  }
  if (body.slice(start).trim()) stmts.push([body.slice(start), start, body.length])
  return stmts
}

const REL_NAME = (raw) => {
  const s = (raw || "").trim().replace(/"/g, "")
  const parts = s.split(".").filter(Boolean)
  if (parts.length > 1 && parts[0].toLowerCase() !== "public") return null
  return parts[parts.length - 1].toLowerCase()
}

const VIEW_CREATE_GLOBAL = /create\s+(or\s+replace\s+)?(materialized\s+)?view\s+(if\s+not\s+exists\s+)?([A-Za-z0-9_."]+)/gi
// Most migrations wrap their DDL in a transaction, so the `create ... view`
// keyword does not start the statement fragment. It must still be the FIRST
// structural DDL in the fragment: anything else and a `create view` occurring
// inside a dollar-quoted function body would be replayed as DDL. The prefix is
// therefore restricted to transaction control and whitespace.
const TX_PREFIX = /^(?:[\s;]|begin\b|start\s+transaction\b|commit\b|end\b|do\b)*$/i
// Returns [offset, name] for the first create-view in a masked fragment, or null.
function firstViewCreate(st) {
  VIEW_CREATE_GLOBAL.lastIndex = 0
  let m
  while ((m = VIEW_CREATE_GLOBAL.exec(st)) !== null) {
    if (!TX_PREFIX.test(st.slice(0, m.index))) return null
    return [m.index, REL_NAME(m[4])]
  }
  return null
}
const VIEW_DROP = /^\s*drop\s+(materialized\s+)?view\s+(if\s+exists\s+)?([A-Za-z0-9_."]+)/i
const TABLE_CREATE = /^\s*create\s+table\s+(if\s+not\s+exists\s+)?([A-Za-z0-9_."]+)\s*\(/i
const TABLE_DROP = /^\s*drop\s+table\s+(if\s+exists\s+)?([A-Za-z0-9_."]+)/i
const TABLE_RENAME = /^\s*alter\s+table\s+(if\s+exists\s+)?([A-Za-z0-9_."]+)\s+rename\s+to\s+([A-Za-z0-9_."]+)/i
const ADD_COLUMN = /alter\s+table\s+(if\s+exists\s+)?([A-Za-z0-9_."]+)\s+add\s+column\s+(if\s+not\s+exists\s+)?(?:([A-Za-z0-9_."]+)\s+)?/i

// --- the 13 view relations, and the contract columns declared for each -------
const CONTRACT_VIEWS = [
  "entities_all",
  "entities_artists",
  "entities_individuals",
  "entities_venues",
  "forum_threads_hot_mv",
  "forum_threads_top_mv",
  "friend_suggestions_view",
  "music_tracks",
  "public_venue_availability",
  "tour_plan_normalize_stats_v",
  "unified_staff_roster",
  "venue_identity_bridge_audit",
  "work_hub_integrity_issues",
]

function contractViewColumns() {
  const gen = readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8")
  // NOTE: `RegExp.prototype.exec` does not expose `.end` unless the `d` flag is
  // set, so the offset is computed from `.index` and the match length. Reading
  // `.end` here silently yields `undefined`, `slice(undefined)` returns the WHOLE
  // file, and every downstream scan then finds nothing and reports an empty
  // result as if the contract declared no columns. That is the same "silent
  // vacuous pass" shape as the Wave 33 and Wave 34 instrument defects.
  const sectionBody = (label) => {
    const m = new RegExp(`^    ${label}: \\{$`, "m").exec(gen)
    if (!m) return ""
    const start = m.index + m[0].length
    const c = new RegExp(`^    \\}$`, "m").exec(gen.slice(start))
    return c ? gen.slice(start, start + c.index) : ""
  }
  const out = {}
  for (const label of ["Tables", "Views"]) {
    const lines = sectionBody(label).split("\n")
    let cur = null
    let inRow = false
    for (const line of lines) {
      const head = /^ {6}("?[A-Za-z0-9_$]+"?): \{$/.exec(line)
      if (head) {
        cur = head[1].replace(/"/g, "").toLowerCase()
        if (!CONTRACT_VIEWS.includes(cur)) cur = null
        else out[cur] = []
        continue
      }
      if (!cur) continue
      if (/^ {8}Row: \{$/.test(line)) { inRow = true; continue }
      if (/^ {8}(Insert|Update|Relationships):/.test(line)) { inRow = false; continue }
      if (/^ {6}\}$/.test(line)) { cur = null; inRow = false; continue }
      if (inRow) {
        const col = /^ {10}("?[A-Za-z0-9_$]+"?):/.exec(line)
        if (col) out[cur].push(col[1].replace(/"/g, "").toLowerCase())
        if (/^ {8}\}$/.test(line)) inRow = false
      }
    }
  }
  return out
}

// --- chain relation columns AND TYPES, by ordered event replay ---------------
// The harness stubs each dependency of a 13-view closure with `create table`.
// Stub types are NOT cosmetic: PostgreSQL resolves a view's SELECT list at
// CREATE time, so `created_at > now() - interval '7 days'` needs a timestamp,
// `(stats ->> 'plays')::int` needs jsonb, `vp.is_public = true` needs boolean and
// `followers_count * 0.1` needs a number. Stubbing everything as `text` makes the
// replay fail for reasons that have nothing to do with view columns, and a
// harness that fails for the wrong reason proves nothing.
//
// So the real declared type is carried through from the chain DDL. Over- and
// under-approximation of the COLUMN SET is harmless (an explicit SELECT list
// fixes the output names, and the one `select *` view is resolved by PostgreSQL
// from the views above it), but the TYPE of a referenced column is load-bearing.

const CONSTRAINT_LEAD = /^(constraint|primary|unique|check|foreign|exclude|like|partition)\b/i
// A bare `,` must also stop the type: `add column if not exists a text, add column
// if not exists b text` splits BEFORE the second `add column`, leaving the first
// column's definition ending in a comma. Emitting `"title" text,` produces a stub
// with a doubled comma, which is a syntax error unrelated to view columns.
const TYPE_STOP = /,|\b(not|null|default|primary|unique|references|check|generated|collate|constraint|storage|deferrable|initially)\b/i

// Split a balanced parenthesised body on top-level commas.
function splitTopLevel(body) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === "(") depth++
    else if (c === ")") depth = Math.max(0, depth - 1)
    else if (c === "," && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts.map((x) => x.trim()).filter(Boolean)
}

// `alter table x add column if not exists a text, add column if not exists b text`
// is ONE statement that declares TWO columns. Every branch that reads a column
// definition must therefore stop at the next `add column`, or the type of the
// first column absorbs the whole tail and produces a stub like
// `"title" text, add column if` — a syntax error, and a failure that has nothing
// to do with the question being asked.
function firstAddColumnPart(rest) {
  const parts = String(rest).split(/(?=\badd\s+column\b)/i)
  return parts[0] || ""
}

// One column definition -> [name, sqlType] or null when it is a table constraint.
function parseColumnDef(def) {
  const s = def.trim()
  if (!s || CONSTRAINT_LEAD.test(s)) return null
  // `col "type" ...` or `col type ...`
  const m = /^"([A-Za-z0-9_$]+)"\s+([\s\S]*)$/.exec(s) || /^([A-Za-z0-9_$]+)\s+([\s\S]*)$/.exec(s)
  if (!m) return null
  const name = m[1].toLowerCase()
  let rest = m[2].trim()
  // A type may be a multi-word or parameterised form: `timestamp with time zone`,
  // `numeric(10,2)`, `character varying(255)`, `int[]`, `public.my_enum`.
  // Consume tokens until one of them starts a column constraint.
  const tokens = rest.split(/\s+/)
  const typeTokens = []
  let i = 0
  let paren = 0
  for (; i < tokens.length; i++) {
    const t = tokens[i]
    if (paren > 0) {
      typeTokens.push(t)
      paren += (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length
      continue
    }
    if (/\(/.test(t)) {
      typeTokens.push(t)
      paren += (t.match(/\(/g) || []).length
      continue
    }
    if (TYPE_STOP.test(t)) break
    typeTokens.push(t)
  }
  const type = typeTokens.join(" ").replace(/,\s*$/, "").trim()
  if (!type) return null
  return [name, type]
}

function chainColumnsFor(relation) {
  const cols = new Map() // relation -> [name, type][]
  for (const file of files) {
    const raw = readFileSync(path.join(MIG, file), "utf8")
    const masked = mask(raw)
    for (const [st, from] of splitStatementsMasked(masked)) {
      let m
      if ((m = TABLE_CREATE.exec(st))) {
        const name = REL_NAME(m[2])
        if (!name) continue
        if (!cols.has(name)) cols.set(name, [])
        // The column list is the balanced paren group after the table name.
        const open = st.indexOf("(", m.index + m[0].length - 1)
        if (open < 0) continue
        let depth = 0
        let close = -1
        for (let k = open; k < st.length; k++) {
          if (st[k] === "(") depth++
          else if (st[k] === ")") { depth--; if (depth === 0) { close = k; break } }
        }
        if (close < 0) continue
        for (const def of splitTopLevel(st.slice(open + 1, close))) {
          for (const sub of def.split(/(?=\badd\s+column\b)/i)) {
            if (!sub.trim()) continue
            const parsed = parseColumnDef(firstAddColumnPart(sub))
            if (!parsed) continue
            if (!cols.get(name).some((c) => c[0] === parsed[0])) cols.get(name).push(parsed)
          }
        }
        continue
      }
      if ((m = ADD_COLUMN.exec(st))) {
        const target = REL_NAME(m[2])
        if (!target || !cols.has(target)) continue
        // ONE `alter table ... add column` statement can declare SEVERAL columns:
        //   alter table x add column if not exists a text, add column if not exists b text
        // Every clause in the statement is registered, not just the one the outer
        // regex first matched, or the stub is missing columns a view references.
        for (const m2 of st.matchAll(
          /\badd\s+column\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z0-9_$]+"?)\s+([^,;]+)/gi,
        )) {
          const cn = m2[1].replace(/"/g, "").toLowerCase()
          const ct = firstAddColumnPart(m2[2]).split(TYPE_STOP)[0].trim()
          if (!cn || !ct) continue
          if (!cols.get(target).some((c) => c[0] === cn)) cols.get(target).push([cn, ct])
        }
        continue
      }
    }
  }
  return cols.get(relation) || null
}

// --- self-check --------------------------------------------------------------
// Wave 33's harness passed 7/7 while its fixture had silently failed to build;
// Wave 34's negative controls could not fail because they only removed surface.
// The same discipline applies here, so the extractor asserts itself before it is
// allowed to produce a plan.

function selfCheck() {
  const problems = []
  const s1 = "select 1; -- create view fake\n/* create view fake2 */ select 2;"
  if (mask(s1).includes("create view")) problems.push("mask left a comment body behind")
  if (mask(s1).length !== s1.length) problems.push("mask is not length-preserving")
  if (mask("select 'create view fake';").includes("create view"))
    problems.push("mask left a string literal behind")
  if (!mask("do $$ begin create view real_one as select 1; end $$;").includes("create view real_one"))
    problems.push("mask destroyed a dollar-quoted body")
  const parts = splitStatementsMasked(mask("create view a as select 1; create view b as select (1;2);"))
  if (parts.length !== 2) problems.push(`splitStatementsMasked returned ${parts.length}, expected 2`)
  if (REL_NAME('public."Venue_Profiles"') !== "venue_profiles")
    problems.push("REL_NAME did not normalise a quoted qualified name")
  if (REL_NAME("storage.objects") !== null) problems.push("REL_NAME accepted a non-public schema")
  // The emitted DDL must be the ORIGINAL bytes, not the masked ones. This is the
  // control for the defect that produced `select ::text as entity_type`: slice a
  // real literal out of the original using the mask's offsets and require the
  // literal to survive.
  const src2 = "create view v as\nselect 'Individual'::text as entity_type\nfrom t;"
  const masked = mask(src2)
  const st = splitStatementsMasked(masked).find(([m]) => firstViewCreate(m))
  if (!st) problems.push("splitStatementsMasked did not find the view statement")
  else {
    const [, from, to] = st
    const verbatim = src2.slice(from, to)
    if (!verbatim.includes("'Individual'::text"))
      problems.push(`emitted DDL is not verbatim: ${JSON.stringify(verbatim)}`)
  }
  // A `create view` inside a dollar-quoted function body is code, not a
  // migration-level statement, and must never be replayed as one.
  const trap = "create or replace function f() returns void language plpgsql as $$ begin create view sneaky_v as select 1; end; $$;"
  if (firstViewCreate(mask(trap))) problems.push("firstViewCreate matched inside a dollar-quoted body")
  // A transaction-wrapped view IS a migration-level statement and must be found.
  if (!firstViewCreate(mask("begin; create or replace view wrapped_v as select 1; commit;")))
    problems.push("firstViewCreate missed a transaction-wrapped view")
  return problems
}

const selfCheckProblems = selfCheck()
if (selfCheckProblems.length) {
  console.error("SELF-CHECK FAILED:", selfCheckProblems)
  process.exit(1)
}

// --- emit ---------------------------------------------------------------------

if (mode === "--views") {
  const chunks = []
  const seen = []
  for (const file of files) {
    const raw = readFileSync(path.join(MIG, file), "utf8")
    const masked = mask(raw)
    for (const [st, from, to] of splitStatementsMasked(masked)) {
      const hit = firstViewCreate(st)
      if (!hit) continue
      const [at, name] = hit
      if (!name || !CONTRACT_VIEWS.includes(name)) continue
      // Slice the ORIGINAL at the mask's offsets so the replayed DDL is byte
      // verbatim. The slice starts at the `create ... view` keyword rather than at
      // the statement boundary, because most migrations wrap their DDL in
      // `begin ... commit;` and the boundary then sits several lines earlier.
      const start = from + at
      const verbatim = raw.slice(start, to).trim()
      if (!/^create\s/i.test(verbatim)) continue
      // The chain drops and recreates music_tracks in four separate migrations,
      // each with its own `drop view if exists public.music_tracks cascade;` in a
      // DIFFERENT statement than the create. Extracting only the creates therefore
      // replays `create view` onto a view that already exists and fails with
      // `relation "music_tracks" already exists` — a failure of the extraction,
      // not of the chain. Re-issuing the same idempotent drop preserves the
      // chain's own drop/create pairing and is a no-op when the view is absent.
      const isMat = /create\s+materialized\s+view/i.test(verbatim)
      const drop = `drop ${isMat ? "materialized " : ""}view if exists public.${name} cascade;`
      chunks.push({ file, stmt: `${drop}\n${verbatim};` })
      seen.push({ file, name, order: seen.length })
    }
  }
  const payload = {
    method: "verbatim view DDL extracted from the active chain, in version order",
    viewCount: chunks.length,
    distinctViews: [...new Set(seen.map((s) => s.name))].sort(),
    missing: CONTRACT_VIEWS.filter((v) => !seen.some((s) => s.name === v)),
    statements: chunks,
  }
  const text = chunks.map((c) => `-- ${c.file}\n${c.stmt}\n`).join("\n")
  const outFlagIdx = args.indexOf("--outdir")
  if (outFlagIdx >= 0) {
    const dir = args[outFlagIdx + 1]
    mkdirSync(dir, { recursive: true })
    // One file per statement, NUL-safe: a bash `while read` over a multi-line
    // buffer yields one array element per PHYSICAL line, which silently
    // truncates every multi-line `create view` to its first line.
    chunks.forEach((c, i) => {
      writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}.sql`), `${c.stmt}\n`)
    })
    writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(seen, null, 2)}\n`)
  }
  if (OUT) writeFileSync(OUT, text)
  process.stderr.write(`view DDL statements: ${chunks.length} for ${payload.distinctViews.length} views\n`)
  if (payload.missing.length) {
    console.error("MISSING VIEW DDL for:", payload.missing.join(" "))
    process.exit(1)
  }
  console.log(text)
} else if (mode === "--stub") {
  const name = (args[args.indexOf("--stub") + 1] || "").toLowerCase()
  const cols = chainColumnsFor(name)
  if (!cols || cols.length === 0) {
    console.error(`no chain columns for relation ${name}`)
    process.exit(1)
  }
  const body = cols.map(([c, t]) => `  "${c}" ${t}`).join(",\n")
  console.log(`create table if not exists public."${name}" (\n${body}\n);`)
} else if (mode === "--dynamic-column-type") {
  // Some chain migrations add columns through DYNAMIC DDL, so no static
  // `alter table <name> add column` exists to read:
  //   20260625000000_polymorphic_hiring_entity.sql:62
  //     execute format('alter table public.%I add column if not exists employer_entity_type text', v_table);
  // `job_applications` therefore has `employer_entity_type` in the chain but not in
  // any statically parseable form, and the view that reads it cannot be replayed
  // against a stub built only from static DDL. The template names the column and
  // its type even though it does not name the target table, which is enough: an
  // extra column on a dependency stub cannot change the output column NAMES of a
  // view with an explicit SELECT list, and a MISSING column is what breaks the
  // replay. So the supplement is applied to every stub.
  const col = (args[args.indexOf("--dynamic-column-type") + 1] || "").toLowerCase()
  const re = /add\s+column\s+(?:if\s+not\s+exists\s+)?(?:[A-Za-z0-9_]*%I\s+)?([A-Za-z0-9_]+)\s+([A-Za-z][A-Za-z0-9_ ]*?)\s*['"]/gi
  for (const file of files) {
    const text = readFileSync(path.join(MIG, file), "utf8")
    let m
    while ((m = re.exec(text)) !== null) {
      if (m[1].toLowerCase() !== col) continue
      const type = m[2].trim().split(TYPE_STOP)[0].trim()
      if (type) {
        console.log(type)
        process.exit(0)
      }
    }
  }
  console.error(`the chain adds no dynamically-created column named ${col}`)
  process.exit(1)
} else if (mode === "--contract") {
  const out = contractViewColumns()
  const missing = CONTRACT_VIEWS.filter((v) => !out[v])
  if (missing.length) {
    console.error("contract declares none of:", missing.join(" "))
    process.exit(1)
  }
  if (OUT) writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`)
  console.log(JSON.stringify(out, null, 2))
} else if (mode === "--list-views") {
  console.log(CONTRACT_VIEWS.join("\n"))
} else {
  console.error(
    "usage: db008_view_column_replay_plan.mjs --views|--stub <relation>|--contract|--list-views [--out <path>]",
  )
  process.exit(1)
}
