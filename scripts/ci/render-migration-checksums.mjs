#!/usr/bin/env node

import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function changedMigrations(baseSha) {
  if (!/^[0-9a-f]{7,40}$/i.test(baseSha || "")) {
    throw new Error("MIGRATION_CHECKSUM_BASE_SHA must be a Git commit SHA")
  }
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", `${baseSha}...HEAD`, "--", "supabase/migrations"],
    { cwd: ROOT, encoding: "utf8" },
  )
  return output.split("\n").map((item) => item.trim()).filter((item) => item.endsWith(".sql")).sort()
}

export function checksumRows(files) {
  return files.map((file) => {
    const source = readFileSync(path.join(ROOT, file))
    return {
      file,
      version: path.basename(file).split("_", 1)[0],
      sha256: createHash("sha256").update(source).digest("hex"),
    }
  })
}

function main() {
  const rows = checksumRows(changedMigrations(process.env.MIGRATION_CHECKSUM_BASE_SHA))
  if (rows.length === 0) {
    console.log("No changed migration SQL files")
    return
  }
  console.log("Approved migration checksum candidate set:")
  for (const row of rows) console.log(`${row.sha256}  ${row.file}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()

