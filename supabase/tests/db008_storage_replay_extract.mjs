#!/usr/bin/env node
// Wave 33: extract the storage-relevant DDL from a migration in EITHER form
// (unguarded top-level statements, or CP-059 guarded `do $...$` blocks), so the
// replay-safety harness can compare the before/after behaviour of the same
// logical DDL. Reads the git HEAD blob for the "original" and the working tree
// for the "guarded" version.

import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

// ---------------------------------------------------------------------------
// WAVE 35: the ORIGINAL form is derived from the GUARDED form, not from git.
//
// The Wave 33 extract read the pre-guard text out of `git show HEAD:<file>`.
// That was valid while the guard was an uncommitted working-tree edit. It is not
// valid now: the CP-059 guard is committed, HEAD equals the working tree, and
// `git show HEAD:...` returns the GUARDED file. The comparison silently degrades
// to guarded-vs-guarded, and every scenario then "passes" without ever exercising
// the failure mode the harness exists to prove. A durable harness cannot depend
// on an ancestor commit that may be garbage-collected.
//
// The unguarded form is therefore SYNTHESISED by unwrapping the CP-059 guard
// block: `do $storage_replay_guard_N$ begin <body> exception when others then
// raise warning ...; end; $storage_replay_guard_N$;` becomes the `<body>` as
// top-level statements. That is exactly the pre-guard text, derived from the tree
// itself, and it stays correct as the migrations change.
// ---------------------------------------------------------------------------
const ROOT = process.argv[2]
const OUT = process.argv[3]
const TAGS = process.argv.slice(4)

const GUARD_OPEN = /do\s+\$storage_replay_guard_\d+\$\s*\n\s*begin\b/i
const GUARD_CLOSE = /\bexception\s+when\s+others\s+then[\s\S]*?\bend;\s*\n\s*\$storage_replay_guard_\d+\$;/i

// Unwrap every CP-059 guard block, preserving order. A block that does not match
// the expected shape is a hard error, never a silent pass-through: silently
// returning the guarded text is the exact defect this replaced.
function unguard(sql) {
  let out = ""
  let rest = sql
  let blocks = 0
  for (;;) {
    const m = GUARD_OPEN.exec(rest)
    if (!m) {
      out += rest
      break
    }
    out += rest.slice(0, m.index)
    const tail = rest.slice(m.index)
    const c = GUARD_CLOSE.exec(tail)
    if (!c) throw new Error("CP-059 guard block is not in the expected begin/exception/end shape; refusing to guess")
    let body = tail.slice(m[0].length, c.index)
    // Drop the leading `begin` newline and any trailing `exception` prologue.
    body = body.replace(/^\s*\n/, "\n")
    out += `${body.trim()}\n`
    rest = tail.slice(c.index + c[0].length)
    blocks++
  }
  return { sql: out, blocks }
}

function splitStatements(text) {
  const out = []
  let i = 0
  let start = 0
  let depth = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === "-" && text[i + 1] === "-") { const nl = text.indexOf("\n", i); i = nl < 0 ? text.length : nl + 1; continue }
    if (ch === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); i = e < 0 ? text.length : e + 2; continue }
    if (ch === "'") { i++; while (i < text.length) { if (text[i] === "'") { if (text[i + 1] === "'") { i += 2; continue } i++; break } i++ } continue }
    if (ch === '"') { i++; while (i < text.length && text[i] !== '"') i++; i++; continue }
    const dollar = /^\$([a-z_][a-z0-9_]*)?\$/i.exec(text.slice(i, i + 40))
    if (dollar) { const c = dollar[0]; const e = text.indexOf(c, i + c.length); i = e < 0 ? text.length : e + c.length; continue }
    if (ch === "(") { depth++; i++; continue }
    if (ch === ")") { depth--; i++; continue }
    if (ch === ";" && depth === 0) { out.push({ start, end: i + 1, text: text.slice(start, i + 1) }); start = i + 1; i++; continue }
    i++
  }
  if (text.slice(start).trim()) out.push({ start, end: text.length, text: text.slice(start) })
  return out
}

const norm = (s) => s.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim().toLowerCase()
const TOUCHES_STORAGE = /\b(?:on\s+storage\.(?:objects|buckets)|into\s+storage\.buckets|storage\.buckets\s+set\b)\b/
const STORAGE_WRITE = /^(?:insert\s+into\s+storage\.buckets|update\s+storage\.buckets|drop\s+policy|create\s+policy|do\s+\$)/

const manifest = []
for (const tag of TAGS) {
  const rel = `supabase/migrations/${tag}`
  const guarded = readFileSync(path.join(ROOT, `${rel}.sql`), "utf8")
  let original
  try {
    original = unguard(guarded).sql
  } catch (e) {
    console.error(`${tag}: ${e.message}`)
    process.exitCode = 1
    continue
  }

  const pick = (text) =>
    splitStatements(text)
      .filter((s) => STORAGE_WRITE.test(norm(s.text)) && TOUCHES_STORAGE.test(norm(s.text)))
      .map((s) => s.text.trim())
      .filter(Boolean)

  const orig = pick(original)
  const grd = pick(guarded)
  if (!orig.length) { console.error(`${tag}: the synthesised unguarded form has no top-level storage DDL`); process.exitCode = 1; continue }
  if (!grd.length) { console.error(`${tag}: working version has no storage DDL`); process.exitCode = 1; continue }
  writeFileSync(path.join(OUT, tag + ".owner.sql"), "set client_min_messages = warning;\n" + orig.join("\n\n") + "\n")
  writeFileSync(path.join(OUT, tag + ".guarded.sql"), "set client_min_messages = warning;\n" + grd.join("\n\n") + "\n")
  manifest.push({ tag, originalStatements: orig.length, guardedBlocks: grd.length })
}
writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2))
console.log(manifest.map((m) => `  ${m.tag}: ${m.originalStatements} -> ${m.guardedBlocks}`).join("\n"))
console.log(`total migrations in harness: ${manifest.length}`)
if (manifest.length === 0) {
  console.error("zero scenarios produced: this is a FAILURE, not an empty pass")
  process.exitCode = 1
}
