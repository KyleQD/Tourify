#!/usr/bin/env node
/**
 * REL-102 — Require migration PRs to reference the validation template
 * and flag obviously dangerous patterns in new SQL files.
 *
 * Usage:
 *   node scripts/ci/check-migration-validation.mjs [path...]
 * If no paths given, scans supabase/migrations changed vs origin/main when possible,
 * otherwise exits 0 with guidance.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const TEMPLATE = "docs/engineering/migration-validation-template.md"
const MANIFEST_DIR = "docs/engineering/migration-validation"
const MANIFEST_SCHEMA_VERSION = 1
// REL-102 starts manifest enforcement prospectively. Older migration history is
// preserved and reviewed by the existing SQL rules instead of being rewritten.
const MANIFEST_CUTOFF = "20260721235608"
const VALIDATION_STAGES = ["planned", "isolated_validated", "staging_validated", "production_verified"]
const DANGEROUS = [
  { re: /\bdrop\s+schema\b/i, msg: "DROP SCHEMA" },
  { re: /\bdrop\s+table\b/i, msg: "DROP TABLE" },
  { re: /\balter\s+table\b[\s\S]*?\bdrop\s+column\b/i, msg: "DROP COLUMN" },
  { re: /\balter\s+table\b[\s\S]*?\brename\s+(?:column|to)\b/i, msg: "destructive rename" },
  { re: /\btruncate\s+/i, msg: "TRUNCATE" },
  { re: /\bdrop\s+database\b/i, msg: "DROP DATABASE" },
  { re: /\bdelete\s+from\b/i, msg: "DELETE FROM" },
  { re: /\bsupabase\s+db\s+reset\b/i, msg: "database reset" },
]

function gitChangedMigrations() {
  const files = new Set()
  const collect = (args) => {
    try {
      const output = execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
      for (const file of output.split("\n").map((item) => item.trim())) {
        if (file.endsWith(".sql")) files.add(file)
      }
      return true
    } catch {
      // Each source is independent; a missing remote/base must not suppress
      // working-tree, staged, or untracked migrations.
      return false
    }
  }

  collect(["diff", "--name-only", "--diff-filter=ACMR", "--", "supabase/migrations"])
  collect(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "--", "supabase/migrations"])
  collect(["ls-files", "--others", "--exclude-standard", "--", "supabase/migrations"])

  const before = process.env.GITHUB_EVENT_BEFORE
  if (before && !/^0+$/.test(before)) {
    collect(["diff", "--name-only", "--diff-filter=ACMR", `${before}...HEAD`, "--", "supabase/migrations"])
  }

  const validatedBase = process.env.MIGRATION_VALIDATION_BASE_SHA
  if (validatedBase) {
    if (!/^[0-9a-f]{7,40}$/i.test(validatedBase)) {
      throw new Error("MIGRATION_VALIDATION_BASE_SHA must be a Git commit SHA")
    }
    if (!collect(["diff", "--name-only", "--diff-filter=ACMR", `${validatedBase}...HEAD`, "--", "supabase/migrations"])) {
      throw new Error("Unable to compare MIGRATION_VALIDATION_BASE_SHA with HEAD")
    }
  }

  const baseRef = process.env.GITHUB_BASE_REF
  if (baseRef && /^[A-Za-z0-9._/-]+$/.test(baseRef)) {
    collect(["diff", "--name-only", "--diff-filter=ACMR", `origin/${baseRef}...HEAD`, "--", "supabase/migrations"])
  } else {
    collect(["diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD", "--", "supabase/migrations"])
  }

  return [...files].sort()
}

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
}

function createdPublicTables(sql) {
  const tables = []
  const pattern = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:public\.)?"?([a-z_][a-z0-9_]*)"?)/gi
  let match
  while ((match = pattern.exec(sql)) !== null) tables.push(match[1])
  return [...new Set(tables)]
}

function hasRlsEnable(sql, table) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?"?${escaped}"?\\s+enable\\s+row\\s+level\\s+security\\b`,
    "i",
  ).test(sql)
}

function hasEarlierRlsEnable(file, table) {
  const migrationsDir = path.join(ROOT, "supabase/migrations")
  const currentName = path.basename(file)
  if (!existsSync(migrationsDir)) return false

  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql") && name < currentName)
    .some((name) => {
      const earlierSql = stripComments(readFileSync(path.join(migrationsDir, name), "utf8"))
      return hasRlsEnable(earlierSql, table)
    })
}

function unsafeUpdateStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) =>
      statement.split("\n").some((line) => /^\s*update\s+(?:public\.)?/i.test(line))
      && !/\bwhere\b/i.test(statement),
    )
}

function hasApprovedException(sourceSql, manifest, type) {
  const marker = new RegExp(`migration-validation:\\s*${type}\\s+([A-Za-z0-9._-]+)`, "i").exec(sourceSql)
  if (!marker || !manifest) return false
  return manifest.exceptions?.some((exception) => exception.id === marker[1] && exception.type === type) ?? false
}

function unsafeInsertSelectStatements(sql, sourceSql, manifest) {
  if (hasApprovedException(sourceSql, manifest, "scoped-insert-select")) return []
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => {
      const insertAt = statement.search(/\binsert\s+into\b/i)
      const selectAt = statement.search(/\bselect\b/i)
      const valuesAt = statement.search(/\bvalues\b/i)
      return insertAt >= 0
        && selectAt > insertAt
        && (valuesAt < 0 || selectAt < valuesAt)
        && !/\bwhere\b/i.test(statement)
    })
}

function unsafeConstraintStatements(sql, sourceSql, manifest) {
  if (hasApprovedException(sourceSql, manifest, "blocking-constraint-reviewed")) return []
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) =>
      /\balter\s+table\b[\s\S]*?\badd\s+constraint\b[\s\S]*?\b(?:foreign\s+key|check)\b/i.test(statement)
      && !/\bnot\s+valid\b/i.test(statement),
    )
}

function unsafeNotNullStatements(sql, sourceSql, manifest) {
  if (hasApprovedException(sourceSql, manifest, "not-null-reviewed")) return []
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => /\balter\s+column\b[\s\S]*?\bset\s+not\s+null\b/i.test(statement))
}

function validatePolicyReplacement(sql, sourceSql) {
  if (!/\bdrop\s+policy\b/i.test(sql)) return null
  const droppedTables = new Set()
  const createdTables = new Set()
  const tablePattern = "(?:public\\.)?\"?([a-z_][a-z0-9_]*)\"?"
  for (const match of sql.matchAll(new RegExp(`\\bdrop\\s+policy\\s+(?:if\\s+exists\\s+)?(?:\"[^\"]+\"|[a-z_][a-z0-9_]*)\\s+on\\s+${tablePattern}`, "gi"))) {
    droppedTables.add(match[1].toLowerCase())
  }
  for (const match of sql.matchAll(new RegExp(`\\bcreate\\s+policy\\s+(?:\"[^\"]+\"|[a-z_][a-z0-9_]*)\\s+on\\s+${tablePattern}`, "gi"))) {
    createdTables.add(match[1].toLowerCase())
  }
  const missing = [...droppedTables].filter((table) => !createdTables.has(table))
  if (missing.length > 0)
    return `DROP POLICY without replacement CREATE POLICY on the same table: ${missing.join(", ")}`
  return null
}

function scanFile(file, sql, manifest = null) {
  const failures = []
  const executableSql = stripComments(sql)
  if (
    !executableSql.trim()
    && !/migration-validation:\s*intentional-noop\b/i.test(sql)
  ) failures.push("empty/no-op migration must be explicitly documented")

  for (const rule of DANGEROUS) {
    if (rule.re.test(executableSql)) failures.push(`dangerous pattern ${rule.msg}`)
  }

  for (const table of createdPublicTables(executableSql)) {
    if (!hasRlsEnable(executableSql, table) && !hasEarlierRlsEnable(file, table))
      failures.push(`new public table ${table} does not enable RLS in the same migration`)
  }

  if (unsafeUpdateStatements(executableSql).length > 0)
    failures.push("UPDATE backfill without a WHERE clause")

  if (unsafeInsertSelectStatements(executableSql, sql, manifest).length > 0)
    failures.push("INSERT ... SELECT backfill without a WHERE clause or scoped review marker")

  if (unsafeConstraintStatements(executableSql, sql, manifest).length > 0)
    failures.push("existing-table FK/CHECK constraint missing NOT VALID or reviewed lock-budget marker")

  if (unsafeNotNullStatements(executableSql, sql, manifest).length > 0)
    failures.push("SET NOT NULL missing validated precheck or reviewed lock-budget marker")

  const policyFailure = validatePolicyReplacement(executableSql, sql)
  if (policyFailure) failures.push(policyFailure)

  return failures.map((message) => `✗ ${file}: ${message}`)
}

function migrationVersion(file) {
  return /^(\d{14})_/.exec(path.basename(file))?.[1] ?? null
}

function manifestPathForMigration(file) {
  return path.join(MANIFEST_DIR, `${path.basename(file, ".sql")}.json`)
}

function manifestRequired(file) {
  const version = migrationVersion(file)
  return version !== null && version >= MANIFEST_CUTOFF
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function validArtifact(value) {
  return nonEmptyString(value) && !/^(pending|todo|tbd|none|null|n\/a)$/i.test(value.trim())
}

export function validateManifest(manifest, file, options = {}) {
  const failures = []
  const expectedMigration = path.basename(file)
  const requiredStage = options.requiredStage ?? "planned"
  const stageIndex = VALIDATION_STAGES.indexOf(manifest?.status)
  const requiredStageIndex = VALIDATION_STAGES.indexOf(requiredStage)
  const requiredStrings = [
    ["migration", manifest?.migration],
    ["taskId", manifest?.taskId],
    ["owner", manifest?.owner],
    ["reviewer", manifest?.reviewer],
    ["riskLevel", manifest?.riskLevel],
    ["verificationOwner", manifest?.verificationOwner],
    ["representativeSnapshot.kind", manifest?.representativeSnapshot?.kind],
    ["preflight.expectedAffectedRows", manifest?.preflight?.expectedAffectedRows],
    ["execution.resumeStrategy", manifest?.execution?.resumeStrategy],
    ["execution.resumeCursor", manifest?.execution?.resumeCursor],
    ["execution.idempotency", manifest?.execution?.idempotency],
    ["quarantine.strategy", manifest?.quarantine?.strategy],
    ["constraintsAndIndexes.validationPlan", manifest?.constraintsAndIndexes?.validationPlan],
    ["recovery.rollback", manifest?.recovery?.rollback],
    ["recovery.forwardFix", manifest?.recovery?.forwardFix],
  ]

  if (manifest?.schemaVersion !== MANIFEST_SCHEMA_VERSION)
    failures.push(`schemaVersion must be ${MANIFEST_SCHEMA_VERSION}`)
  if (manifest?.migration !== expectedMigration)
    failures.push(`migration must match ${expectedMigration}`)
  if (stageIndex < 0) failures.push(`status must be one of: ${VALIDATION_STAGES.join(", ")}`)
  if (requiredStageIndex < 0) failures.push(`unknown required validation stage ${requiredStage}`)
  else if (stageIndex >= 0 && stageIndex < requiredStageIndex)
    failures.push(`status ${manifest.status} does not satisfy required stage ${requiredStage}`)

  for (const [field, value] of requiredStrings) {
    if (!nonEmptyString(value)) failures.push(`${field} is required`)
  }

  if (!Array.isArray(manifest?.domains) || manifest.domains.length === 0 || manifest.domains.some((value) => !nonEmptyString(value)))
    failures.push("domains must contain at least one domain")
  if (!Array.isArray(manifest?.preflight?.rowCountQueries) || manifest.preflight.rowCountQueries.length === 0)
    failures.push("preflight.rowCountQueries must contain at least one read-only query reference")
  if (!Number.isInteger(manifest?.execution?.lockBudgetMs) || manifest.execution.lockBudgetMs <= 0)
    failures.push("execution.lockBudgetMs must be a positive integer")
  if (!Number.isInteger(manifest?.execution?.statementTimeoutMs) || manifest.execution.statementTimeoutMs <= 0)
    failures.push("execution.statementTimeoutMs must be a positive integer")
  if (!Number.isInteger(manifest?.execution?.batchSize) || manifest.execution.batchSize < 0)
    failures.push("execution.batchSize must be a non-negative integer")
  if (!Array.isArray(manifest?.constraintsAndIndexes?.constraints) || !Array.isArray(manifest?.constraintsAndIndexes?.indexes))
    failures.push("constraintsAndIndexes constraints/indexes must be arrays")
  if (!Array.isArray(manifest?.postflight?.queries) || manifest.postflight.queries.length === 0)
    failures.push("postflight.queries must contain at least one read-only query reference")

  const seenExceptionIds = new Set()
  for (const exception of manifest?.exceptions ?? []) {
    if (!nonEmptyString(exception?.id) || seenExceptionIds.has(exception.id)) failures.push("exceptions require unique non-empty ids")
    seenExceptionIds.add(exception?.id)
    if (!["scoped-insert-select", "blocking-constraint-reviewed", "not-null-reviewed"].includes(exception?.type))
      failures.push(`exception ${exception?.id ?? "<unknown>"} has an unsupported type`)
    for (const field of ["owner", "rationale", "issue", "evidence"]) {
      if (!nonEmptyString(exception?.[field])) failures.push(`exception ${exception?.id ?? "<unknown>"}.${field} is required`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception?.expiresOn ?? ""))
      failures.push(`exception ${exception?.id ?? "<unknown>"}.expiresOn must be YYYY-MM-DD`)
    else if (exception.expiresOn < new Date().toISOString().slice(0, 10))
      failures.push(`exception ${exception.id} expired on ${exception.expiresOn}`)
  }

  if (stageIndex >= VALIDATION_STAGES.indexOf("isolated_validated")) {
    for (const [field, value] of [
      ["representativeSnapshot.evidenceArtifact", manifest?.representativeSnapshot?.evidenceArtifact],
      ["preflight.artifact", manifest?.preflight?.artifact],
      ["postflight.artifact", manifest?.postflight?.artifact],
      ["postflight.securityAdvisorArtifact", manifest?.postflight?.securityAdvisorArtifact],
      ["postflight.performanceAdvisorArtifact", manifest?.postflight?.performanceAdvisorArtifact],
      ["evidence.isolated", manifest?.evidence?.isolated],
    ]) {
      if (!validArtifact(value)) failures.push(`${field} is required for isolated_validated status`)
    }
  }
  if (stageIndex >= VALIDATION_STAGES.indexOf("staging_validated") && !validArtifact(manifest?.evidence?.staging))
    failures.push("evidence.staging is required for staging_validated status")
  if (stageIndex >= VALIDATION_STAGES.indexOf("production_verified") && !validArtifact(manifest?.evidence?.production))
    failures.push("evidence.production is required for production_verified status")

  return failures.map((message) => `✗ ${manifestPathForMigration(file)}: ${message}`)
}

function loadManifest(file) {
  const relativePath = manifestPathForMigration(file)
  const absolutePath = path.join(ROOT, relativePath)
  if (!existsSync(absolutePath)) return { relativePath, manifest: null, failures: [`✗ ${relativePath}: required manifest is missing`] }
  try {
    return { relativePath, manifest: JSON.parse(readFileSync(absolutePath, "utf8")), failures: [] }
  } catch (error) {
    return { relativePath, manifest: null, failures: [`✗ ${relativePath}: invalid JSON (${error.message})`] }
  }
}

export function main() {
  if (!existsSync(path.join(ROOT, TEMPLATE))) {
    console.error(`Missing template: ${TEMPLATE}`)
    process.exit(1)
  }

  const args = process.argv.slice(2).filter((a) => a.endsWith(".sql"))
  const files = args.length > 0 ? args : gitChangedMigrations()

  if (files.length === 0) {
    console.log("No migration files to check. Template OK:", TEMPLATE)
    process.exit(0)
  }

  let failed = false
  const requiredStage = process.env.MIGRATION_VALIDATION_REQUIRED_STAGE || "planned"
  for (const file of files) {
    const abs = path.join(ROOT, file)
    if (!existsSync(abs)) continue
    const manifestAbsolutePath = path.join(ROOT, manifestPathForMigration(file))
    const loaded = manifestRequired(file) || existsSync(manifestAbsolutePath)
      ? loadManifest(file)
      : { manifest: null, failures: [] }
    const failures = [
      ...loaded.failures,
      ...(loaded.manifest ? validateManifest(loaded.manifest, file, { requiredStage }) : []),
      ...scanFile(file, readFileSync(abs, "utf8"), loaded.manifest),
    ]
    if (failures.length > 0) {
      failures.forEach((failure) => console.error(failure))
      failed = true
    } else {
      console.log(`✓ scanned ${file}${loaded.manifest ? ` with ${loaded.manifest.status} manifest` : ""}`)
    }
  }

  console.log(`\nChecklist required in PR body: see ${TEMPLATE}`)
  if (failed) process.exit(1)
  process.exit(0)
}

export { gitChangedMigrations, manifestPathForMigration, manifestRequired, scanFile, stripComments }

if (import.meta.url === `file://${process.argv[1]}`) main()
