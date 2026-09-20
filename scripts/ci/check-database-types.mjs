#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

import { databaseTypeSource } from "./database-types-source.mjs"

const ROOT = process.cwd()
const outputPath = path.join(ROOT, "lib/database.types.ts")
const typeSource = databaseTypeSource()
const args = typeSource.args
const result = spawnSync("supabase", args, {
  cwd: ROOT,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

const generated = result.stdout.replace(/\r\n/g, "\n")
const committed = readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n")

if (generated !== committed) {
  console.error(
    `Database type drift detected against the ${typeSource.label}. `
    + "After the approved migrations are applied manually, run npm run generate:database-types with the same SUPABASE_TYPE_SOURCE.",
  )
  process.exit(1)
}

console.log(`✓ lib/database.types.ts matches the ${typeSource.label} public schema`)
