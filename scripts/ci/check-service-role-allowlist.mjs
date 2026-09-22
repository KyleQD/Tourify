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
const REVIEW = path.join(ROOT, "lib/supabase/service-role-import-review.json")
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
      .filter((file) => !file.split("/").includes("__tests__"))
      .filter((file) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file))
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
  if (!existsSync(REVIEW)) {
    console.error(`Missing reviewed-debt registry: ${REVIEW}`)
    process.exit(1)
  }

  const inventory = new Set(JSON.parse(readFileSync(INVENTORY, "utf8")))
  const reviews = JSON.parse(readFileSync(REVIEW, "utf8"))
  if (!Array.isArray(reviews)) {
    console.error(`Reviewed-debt registry must be an array: ${REVIEW}`)
    process.exit(1)
  }
  const reviewedFiles = new Set()
  const reviewErrors = []
  const allowedDispositions = new Set([
    "migrate_to_job",
    "replace_with_user_rls",
    "replace_with_rpc",
    "retire",
  ])
  for (const review of reviews) {
    if (!review || typeof review !== "object") {
      reviewErrors.push("Review entries must be objects")
      continue
    }
    const { file, disposition, workflowId, findingId, owner, rationale, reviewedAt } = review
    if (typeof file !== "string" || !file.trim()) reviewErrors.push("Review entry is missing file")
    else if (reviewedFiles.has(file)) reviewErrors.push(`Duplicate review entry: ${file}`)
    else reviewedFiles.add(file)
    if (!allowedDispositions.has(disposition)) reviewErrors.push(`Invalid disposition for ${file}`)
    if (!/^ADM-WF-\d{3}$/.test(workflowId ?? "")) reviewErrors.push(`Invalid workflowId for ${file}`)
    if (!/^ADM-M-\d{3}$/.test(findingId ?? "")) reviewErrors.push(`Invalid findingId for ${file}`)
    if (typeof owner !== "string" || owner.trim().length < 2) reviewErrors.push(`Missing owner for ${file}`)
    if (typeof rationale !== "string" || rationale.trim().length < 20) reviewErrors.push(`Missing rationale for ${file}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt ?? "")) reviewErrors.push(`Invalid reviewedAt for ${file}`)
  }
  if (reviewErrors.length) {
    console.error("✗ Invalid service-role reviewed-debt registry (SEC-109):")
    for (const error of reviewErrors) console.error(`  - ${error}`)
    process.exit(1)
  }

  const current = listImportingFiles()
  const currentSet = new Set(current)
  const unexpected = []

  for (const file of current) {
    if (ALLOWED_WITHOUT_INVENTORY.has(file)) continue
    if (inventory.has(file)) continue
    if (reviewedFiles.has(file)) continue
    unexpected.push(file)
  }

  const staleReviews = [...reviewedFiles].filter((file) => !currentSet.has(file)).sort()
  if (staleReviews.length) {
    console.error("✗ Stale service-role reviewed-debt entries (SEC-109):")
    for (const file of staleReviews) console.error(`  - ${file}`)
    console.error("\nRemove the review entry after the bare import is remediated.")
    process.exit(1)
  }

  if (unexpected.length > 0) {
    console.error("✗ New bare createServiceRoleClient imports (SEC-109):")
    for (const file of unexpected) console.error(`  - ${file}`)
    console.error("\nUse executeServiceRoleJob({ orgId, reason, moduleId }, …)")
    console.error("or justify + add to lib/supabase/service-role-legacy-imports.json")
    process.exit(1)
  }

  const historical = current.filter((file) => inventory.has(file)).length
  const lowLevelFactories = current.filter((file) =>
    ALLOWED_WITHOUT_INVENTORY.has(file),
  ).length
  console.log(
    `✓ service-role imports classified (${current.length} production files: ${historical} historical, ${reviews.length} reviewed remediation debt, ${lowLevelFactories} low-level factories)`,
  )
  process.exit(0)
}

main()
