#!/usr/bin/env node
/**
 * SEC-109 — Fail CI when a new file imports createServiceRoleClient outside
 * the legacy inventory. Migrated call sites should use executeServiceRoleJob
 * and be removed from the inventory.
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const INVENTORY = path.join(ROOT, "lib/supabase/service-role-legacy-imports.json")
const ALLOWED_WITHOUT_INVENTORY = new Set([
  "lib/supabase/service-role.ts",
  "lib/supabase/service-role-job.ts",
])

function listImportingFiles() {
  try {
    const out = execSync(
      "rg -l \"from ['\\\"]@/lib/supabase/service-role['\\\"]\" -g '*.ts' -g '*.tsx' -g '!node_modules' -g '!.next'",
      { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
    )
    return out
      .split("\n")
      .map((s) => s.trim().replace(/^\.\//, ""))
      .filter(Boolean)
      .sort()
  } catch (error) {
    if (error?.status === 1) return []
    throw error
  }
}

function main() {
  if (!existsSync(INVENTORY)) {
    console.error(`Missing inventory: ${INVENTORY}`)
    process.exit(1)
  }

  const inventory = new Set(JSON.parse(readFileSync(INVENTORY, "utf8")))
  const current = listImportingFiles()
  const unexpected = []

  for (const file of current) {
    if (ALLOWED_WITHOUT_INVENTORY.has(file)) continue
    if (inventory.has(file)) continue
    unexpected.push(file)
  }

  if (unexpected.length > 0) {
    console.error("✗ New bare createServiceRoleClient imports (SEC-109):")
    for (const file of unexpected) console.error(`  - ${file}`)
    console.error("\nUse executeServiceRoleJob({ orgId, reason, moduleId }, …)")
    console.error("or justify + add to lib/supabase/service-role-legacy-imports.json")
    process.exit(1)
  }

  console.log(`✓ service-role imports within inventory (${current.length} files scanned)`)
  process.exit(0)
}

main()
