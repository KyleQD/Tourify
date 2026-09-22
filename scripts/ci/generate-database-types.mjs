#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
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
if (!result.stdout.trim()) throw new Error("Supabase generated an empty database type definition")

writeFileSync(outputPath, result.stdout.replace(/\r\n/g, "\n"))
console.log(`Generated lib/database.types.ts from the ${typeSource.label} public schema`)
