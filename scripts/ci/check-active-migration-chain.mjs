#!/usr/bin/env node

/**
 * Detect fresh-database migration failures caused by duplicate policy names.
 *
 * Supabase compares migration versions, not SQL checksums. A collision must
 * therefore be resolved by an explicit replacement in the newer migration or
 * an audited quarantine before staging; once a migration is applied, its
 * bytes remain immutable. This check makes the collision explicit before a
 * fresh chain can be promoted.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MIGRATIONS_ROOT = path.join(ROOT, "supabase/migrations")

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ")
}

function stripExecutableLiterals(sql) {
  return sql
    // Dynamic policy DDL inside a DO/function body is branch-dependent. The
    // migration's actual top-level statements are checked below; runtime
    // branch convergence is covered by the live migration gate.
    .replace(/\$([a-z_][a-z0-9_]*)\$[\s\S]*?\$\1\$/gi, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/'(?:''|[^'])*'/g, " ")
}

function migrationFiles() {
  if (!existsSync(MIGRATIONS_ROOT)) return []
  return readdirSync(MIGRATIONS_ROOT)
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .sort()
    .map((name) => path.join(MIGRATIONS_ROOT, name))
}

function policyStatements(sql) {
  const statements = []
  const pattern = /\b(drop|create)\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+on\s+(?:"?([a-z_][a-z0-9_]*)"?\s*\.)?"?([a-z_][a-z0-9_]*)"?/gi
  let match
  while ((match = pattern.exec(sql)) !== null) {
    statements.push({
      action: match[1].toLowerCase(),
      policy: match[2] ?? match[3],
      schema: (match[4] ?? "public").toLowerCase(),
      table: match[5].toLowerCase(),
      offset: match.index,
    })
  }
  return statements
}

export function scanMigrationSources(sources) {
  const active = new Map()
  const failures = []
  const versions = new Map()

  for (const source of [...sources].sort((a, b) => a.file.localeCompare(b.file))) {
    const version = /^(\d{14})_/.exec(path.basename(source.file))?.[1]
    if (version) {
      const previous = versions.get(version)
      if (previous) failures.push(`duplicate migration version ${version}: ${previous} and ${source.file}`)
      else versions.set(version, source.file)
    }

    for (const statement of policyStatements(stripExecutableLiterals(stripComments(source.sql)))) {
      const key = `${statement.schema}.${statement.table}.${statement.policy.toLowerCase()}`
      if (statement.action === "drop") {
        active.delete(key)
        continue
      }
      const previous = active.get(key)
      if (previous) {
        failures.push(
          `duplicate policy ${key}: ${source.file} creates it while ${previous.file} remains active; add an explicit reviewed replacement or reconcile the fresh chain`,
        )
      }
      active.set(key, { file: source.file, offset: statement.offset })
    }
  }

  return [...new Set(failures)]
}

export function scanActiveMigrationChain(files = migrationFiles()) {
  return scanMigrationSources(files.map((file) => ({ file, sql: readFileSync(file, "utf8") })))
}

export function main() {
  const failures = scanActiveMigrationChain()
  if (failures.length > 0) {
    console.error(`Active migration chain validation failed (${failures.length}):`)
    for (const failure of failures.slice(0, 20)) console.error(`✗ ${failure}`)
    if (failures.length > 20) console.error(`✗ ${failures.length - 20} additional collisions omitted`)
    process.exitCode = 1
    return
  }
  console.log(`✓ active migration chain has no duplicate policy creations (${migrationFiles().length} files scanned)`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
