#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MIGRATION_DIR = "supabase/migrations"
const LEDGER_PATH = "docs/engineering/migration-validation/hosted-history-ledger.json"
const HISTORY_STATUSES = new Set([
  "applied",
  "absent_schema_observed",
  "not_applied",
  "unverified",
])

export function activeMigrationSnapshot(root = ROOT) {
  const directory = path.join(root, MIGRATION_DIR)
  const migrations = readdirSync(directory)
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .sort()
  const digest = createHash("sha256")
  for (const migration of migrations) {
    const sqlSha256 = createHash("sha256")
      .update(readFileSync(path.join(directory, migration)))
      .digest("hex")
    digest.update(migration)
    digest.update("\0")
    digest.update(sqlSha256)
    digest.update("\n")
  }
  return {
    migrations,
    count: migrations.length,
    firstMigration: migrations[0] ?? null,
    lastMigration: migrations.at(-1) ?? null,
    digestSha256: digest.digest("hex"),
  }
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0
}

export function validateHostedMigrationLedger(ledger, snapshot, options = {}) {
  const failures = []
  const active = new Set(snapshot.migrations)
  const launchRequired = ledger?.launch?.required ?? []
  const deferred = ledger?.launch?.deferred ?? []
  const classified = new Set()

  if (ledger?.schemaVersion !== 1) failures.push("schemaVersion must be 1")
  if (ledger?.sourceDirectory !== MIGRATION_DIR) failures.push(`sourceDirectory must be ${MIGRATION_DIR}`)
  for (const [ledgerField, snapshotField] of [
    ["activeCount", "count"],
    ["firstMigration", "firstMigration"],
    ["lastMigration", "lastMigration"],
    ["digestSha256", "digestSha256"],
  ]) {
    if (ledger?.sourceSnapshot?.[ledgerField] !== snapshot[snapshotField]) {
      failures.push(`sourceSnapshot.${ledgerField} does not match the active migration chain`)
    }
  }

  for (const [classification, entries] of [["required", launchRequired], ["deferred", deferred]]) {
    if (!Array.isArray(entries)) {
      failures.push(`launch.${classification} must be an array`)
      continue
    }
    for (const entry of entries) {
      if (!active.has(entry?.migration)) failures.push(`launch.${classification} references inactive migration ${entry?.migration ?? "<missing>"}`)
      if (classified.has(entry?.migration)) failures.push(`launch migration ${entry.migration} is classified more than once`)
      classified.add(entry?.migration)
      for (const field of ["taskId", "rationale", "nextAction"]) {
        if (!nonEmpty(entry?.[field])) failures.push(`launch.${classification} ${entry?.migration ?? "<missing>"} requires ${field}`)
      }
    }
  }

  const expectedUnclassified = snapshot.count - classified.size
  if (ledger?.launch?.unclassified?.count !== expectedUnclassified) {
    failures.push(`launch.unclassified.count must be ${expectedUnclassified}`)
  }
  if (expectedUnclassified > 0 && !nonEmpty(ledger?.launch?.unclassified?.blocker)) {
    failures.push("launch.unclassified.blocker is required while migrations remain unclassified")
  }

  for (const environment of ["staging", "production"]) {
    const state = ledger?.environments?.[environment]
    if (!state) {
      failures.push(`environments.${environment} is required`)
      continue
    }
    if (!HISTORY_STATUSES.has(state.defaultHistoryStatus)) {
      failures.push(`environments.${environment}.defaultHistoryStatus is invalid`)
    }
    for (const [migration, disposition] of Object.entries(state.entries ?? {})) {
      if (!active.has(migration)) failures.push(`environments.${environment} references inactive migration ${migration}`)
      if (!HISTORY_STATUSES.has(disposition?.historyStatus)) failures.push(`environments.${environment}.${migration}.historyStatus is invalid`)
      if (!nonEmpty(disposition?.evidence)) failures.push(`environments.${environment}.${migration}.evidence is required`)
    }
  }

  if (options.requireReconciled) {
    if (expectedUnclassified > 0) failures.push(`${expectedUnclassified} active migrations remain launch-unclassified`)
    for (const environment of ["staging", "production"]) {
      const state = ledger?.environments?.[environment]
      if (state?.defaultHistoryStatus === "unverified") {
        failures.push(`${environment} history remains unverified by default`)
      }
    }
  }

  return failures
}

export function main() {
  const snapshot = activeMigrationSnapshot()
  const ledger = JSON.parse(readFileSync(path.join(ROOT, LEDGER_PATH), "utf8"))
  const requireReconciled = process.argv.includes("--require-reconciled")
  const failures = validateHostedMigrationLedger(ledger, snapshot, { requireReconciled })
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`✗ ${LEDGER_PATH}: ${failure}`))
    process.exit(1)
  }

  const classified = ledger.launch.required.length + ledger.launch.deferred.length
  console.log(
    `✓ hosted migration ledger matches ${snapshot.count} active migrations (${classified} classified, ${ledger.launch.unclassified.count} explicitly unreconciled)`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) main()
