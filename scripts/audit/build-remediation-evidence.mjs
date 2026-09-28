#!/usr/bin/env node

import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const AUDIT_ROOT = path.join(ROOT, "docs/audit-remediation/2026-07-27")
const SOURCE_TRACKER = path.join(AUDIT_ROOT, "source/TASK_TRACKER.csv")
const TASK_OVERRIDES = path.join(AUDIT_ROOT, "task-overrides.json")
const OUTPUT_DIR = path.join(AUDIT_ROOT, "generated")
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations")

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function parseCsv(source) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""))
      rows.push(row)
      row = []
      field = ""
    } else field += char
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""))
    rows.push(row)
  }
  return rows.filter((item) => item.some((value) => value.length > 0))
}

function csvCell(value) {
  const normalized = String(value ?? "")
  return `"${normalized.replaceAll('"', '""')}"`
}

function buildExecutionTracker() {
  const rows = parseCsv(readFileSync(SOURCE_TRACKER, "utf8"))
  const header = rows[0]
  const overrides = JSON.parse(readFileSync(TASK_OVERRIDES, "utf8"))
  const statusIndex = header.indexOf("status")
  const extra = [
    "qualified_id",
    "accountable_owner",
    "due_date",
    "pull_request",
    "migration_version",
    "before_evidence",
    "validation_result",
    "after_evidence",
    "feature_flag",
    "rollback_instruction",
    "production_approver",
    "observation_end",
  ]
  const output = [[...header, ...extra]]

  for (const row of rows.slice(1)) {
    const taskId = row[0]
    const override = overrides[taskId] || {}
    const sourceRow = [...row]
    if (override.status) sourceRow[statusIndex] = override.status
    output.push([
      ...sourceRow,
      `AUDIT:${taskId}`,
      override.accountable_owner || "",
      override.due_date || "",
      override.pull_request || "",
      override.migration_version || "",
      override.before_evidence || "",
      override.validation_result || "",
      override.after_evidence || "",
      override.feature_flag || "",
      override.rollback_instruction || "",
      override.production_approver || "",
      override.observation_end || "",
    ])
  }

  return `${output.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
}

function sqlEffects(sql) {
  const effects = []
  const patterns = [
    ["create_table", /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi],
    ["alter_table", /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi],
    ["create_function", /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi],
    ["create_policy", /\bcreate\s+policy\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))/gi],
    ["grant", /\bgrant\s+([a-z_,\s]+)\s+on\s+/gi],
  ]
  for (const [kind, pattern] of patterns) {
    for (const match of sql.matchAll(pattern)) {
      effects.push({ kind, object: match[1] || match[2] })
    }
  }
  return effects.slice(0, 100)
}

function buildMigrationInventory() {
  const tracked = new Set(
    git(["ls-files", "--", "supabase/migrations/*.sql"])
      .split("\n")
      .filter(Boolean)
      .map((file) => path.basename(file)),
  )
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
  const versionCounts = new Map()
  for (const file of files) {
    const version = file.split("_", 1)[0]
    versionCounts.set(version, (versionCounts.get(version) || 0) + 1)
  }

  const migrations = files.map((file) => {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")
    const version = file.split("_", 1)[0]
    return {
      version,
      filename: file,
      sha256: sha256(sql),
      git_state: tracked.has(file) ? "TRACKED" : "UNTRACKED_QUARANTINED",
      classification: "PENDING_OBJECT_EFFECT_REVIEW",
      duplicate_version: (versionCounts.get(version) || 0) > 1,
      risk_signals: {
        destructive_structural_sql: /\bdrop\s+(?:table|column|schema|database)\b|\btruncate\b/i.test(sql),
        data_delete: /\bdelete\s+from\b/i.test(sql),
        backfill: /\b(?:update|insert\s+into[\s\S]+select)\b/i.test(sql),
        external_assumption: /\b(?:http|cron|vault|webhook|provider|stripe)\b/i.test(sql),
        security_definer: /\bsecurity\s+definer\b/i.test(sql),
        grant_or_revoke: /\b(?:grant|revoke)\b/i.test(sql),
      },
      object_effects_preview: sqlEffects(sql),
      domain_owner: null,
      canonical_decision: null,
      validation_evidence: null,
    }
  })

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    baseline_commit: git(["rev-parse", "HEAD"]),
    total: migrations.length,
    tracked: migrations.filter((item) => item.git_state === "TRACKED").length,
    untracked_quarantined: migrations.filter((item) => item.git_state === "UNTRACKED_QUARANTINED").length,
    duplicate_versions: [...versionCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([version, count]) => ({ version, count })),
    migrations,
  }
}

function evidenceChecksums() {
  const files = []
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (absolute === OUTPUT_DIR) continue
        walk(absolute)
      } else if (entry.isFile()) {
        const source = readFileSync(absolute)
        files.push({
          path: path.relative(ROOT, absolute),
          sha256: sha256(source),
          bytes: source.byteLength,
        })
      }
    }
  }
  walk(AUDIT_ROOT)
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true })
writeFileSync(path.join(OUTPUT_DIR, "execution-tracker.csv"), buildExecutionTracker())
writeFileSync(
  path.join(OUTPUT_DIR, "local-migration-inventory.json"),
  `${JSON.stringify(buildMigrationInventory(), null, 2)}\n`,
)
writeFileSync(
  path.join(OUTPUT_DIR, "evidence-checksums.json"),
  `${JSON.stringify(evidenceChecksums(), null, 2)}\n`,
)
console.log(`Wrote remediation evidence to ${path.relative(ROOT, OUTPUT_DIR)}`)
