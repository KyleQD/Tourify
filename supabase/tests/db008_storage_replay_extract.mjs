#!/usr/bin/env node
// Wave 33: extract the storage-relevant DDL from a migration in EITHER form
// (unguarded top-level statements, or CP-059 guarded `do $...$` blocks), so the
// replay-safety harness can compare the before/after behaviour of the same
// logical DDL. Reads the git HEAD blob for the "original" and the working tree
// for the "guarded" version.

import { readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"

const ROOT = process.argv[2]
const OUT = process.argv[3]
const TAGS = process.argv.slice(4)

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
  const rel = `supabase/migrations/${tag}.sql`
  const original = execFileSync("git", ["show", `HEAD:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  const guarded = readFileSync(path.join(ROOT, rel), "utf8")

  const pick = (text) =>
    splitStatements(text)
      .filter((s) => STORAGE_WRITE.test(norm(s.text)) && TOUCHES_STORAGE.test(norm(s.text)))
      .map((s) => s.text.trim())
      .filter(Boolean)

  const orig = pick(original)
  const grd = pick(guarded)
  if (!orig.length) { console.error(`${tag}: HEAD version has no top-level storage DDL`); continue }
  if (!grd.length) { console.error(`${tag}: working version has no storage DDL`); continue }
  writeFileSync(path.join(OUT, tag + ".owner.sql"), "set client_min_messages = warning;\n" + orig.join("\n\n") + "\n")
  writeFileSync(path.join(OUT, tag + ".guarded.sql"), "set client_min_messages = warning;\n" + grd.join("\n\n") + "\n")
  manifest.push({ tag, originalStatements: orig.length, guardedBlocks: grd.length })
}
writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2))
console.log(manifest.map((m) => `  ${m.tag}: ${m.originalStatements} -> ${m.guardedBlocks}`).join("\n"))
console.log(`total migrations in harness: ${manifest.length}`)
