#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const auditRoot = path.join(root, "docs/audit-remediation/2026-07-27")
const localPath = path.join(auditRoot, "generated/local-migration-inventory.json")
const remoteArgumentIndex = process.argv.indexOf("--remote")
const remotePath =
  remoteArgumentIndex >= 0 && process.argv[remoteArgumentIndex + 1]
    ? path.resolve(process.argv[remoteArgumentIndex + 1])
    : path.join(auditRoot, "evidence/remote-migrations.json")
const outputPath = path.join(auditRoot, "generated/migration-reconciliation-ledger.json")
const decisionsPath = path.join(auditRoot, "migration-reconciliation-decisions.json")
const expectedProjectRef = "auqddrodjezjlypkzfpi"
const expectedRemoteCount = 180

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function normalizeRemoteSnapshot(value) {
  const rows = Array.isArray(value) ? value : value.migrations
  const linkedProjectRefPath = path.join(root, "supabase/.temp/project-ref")
  const linkedProjectRef = existsSync(linkedProjectRefPath)
    ? readFileSync(linkedProjectRefPath, "utf8").trim()
    : null
  return {
    project_ref: value.project_ref || linkedProjectRef,
    captured_at: value.captured_at || null,
    migrations: (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        ...row,
        version: row.version ?? row.remote_version ?? row.remote,
      }))
      .filter((row) => String(row.version ?? "").trim()),
  }
}

function remoteVersion(row) {
  return String(row.version ?? row.remote_version ?? "").trim()
}

function localName(filename) {
  return filename.replace(/^\d+_/, "").replace(/\.sql$/, "")
}

function riskLevel(localRows) {
  const signals = localRows.flatMap((row) =>
    Object.entries(row.risk_signals || {})
      .filter(([, present]) => present)
      .map(([name]) => name),
  )
  if (signals.some((name) => ["destructive_structural_sql", "data_delete"].includes(name))) return "CRITICAL"
  if (signals.some((name) => ["backfill", "security_definer", "grant_or_revoke"].includes(name))) return "HIGH"
  if (signals.includes("external_assumption")) return "MEDIUM"
  return "LOW"
}

if (!existsSync(localPath)) {
  throw new Error("Local inventory is missing. Run npm run audit:remediation-evidence first.")
}

if (!existsSync(remotePath)) {
  console.error(`Remote snapshot missing: ${path.relative(root, remotePath)}`)
  console.error("Follow PHASE_0_MANUAL_GATE.md. No migration history was changed.")
  process.exit(1)
}

const localSource = readFileSync(localPath, "utf8")
const remoteSource = readFileSync(remotePath, "utf8")
const local = JSON.parse(localSource)
const remote = normalizeRemoteSnapshot(JSON.parse(remoteSource))
const decisions = existsSync(decisionsPath)
  ? JSON.parse(readFileSync(decisionsPath, "utf8")).decisions || {}
  : {}
const remoteVersions = remote.migrations.map(remoteVersion)
const uniqueRemoteVersions = new Set(remoteVersions)

const blockers = []
if (remote.project_ref !== expectedProjectRef) {
  blockers.push(`project_ref must be ${expectedProjectRef}`)
}
if (remote.migrations.length !== expectedRemoteCount) {
  blockers.push(`remote migration count must be ${expectedRemoteCount}; received ${remote.migrations.length}`)
}
if (uniqueRemoteVersions.size !== remote.migrations.length || uniqueRemoteVersions.has("")) {
  blockers.push("remote migration versions must be present and unique")
}

if (blockers.length > 0) {
  console.error("Remote migration snapshot rejected:")
  for (const blocker of blockers) console.error(`- ${blocker}`)
  process.exit(1)
}

const localByVersion = new Map()
for (const row of local.migrations) {
  const rows = localByVersion.get(row.version) || []
  rows.push(row)
  localByVersion.set(row.version, rows)
}
const remoteByVersion = new Map(remote.migrations.map((row) => [remoteVersion(row), row]))
const versions = [...new Set([...localByVersion.keys(), ...remoteByVersion.keys()])].sort()

const entries = versions.map((version) => {
  const localRows = localByVersion.get(version) || []
  const remoteRow = remoteByVersion.get(version) || null
  const remoteName = remoteRow?.name == null ? null : String(remoteRow.name).trim()
  const namesDiffer =
    localRows.length === 1 &&
    remoteRow &&
    remoteName &&
    localName(localRows[0].filename) !== remoteName
  const collisionReasons = []
  if (localRows.length > 1) collisionReasons.push("LOCAL_DUPLICATE_VERSION")
  if (namesDiffer) collisionReasons.push("LOCAL_REMOTE_NAME_MISMATCH_REQUIRES_EFFECT_REVIEW")
  let classification = "MATCHED"
  if (localRows.length > 1 || namesDiffer) classification = "COLLISION"
  else if (localRows.length === 0) classification = "REMOTE_ONLY"
  else if (!remoteRow) classification = "LOCAL_ONLY"

  const decision = decisions[version] || {}
  return {
    version,
    classification,
    collision_reasons: collisionReasons,
    local: localRows.map((row) => ({
      filename: row.filename,
      sha256: row.sha256,
      git_state: row.git_state,
      risk_signals: row.risk_signals,
      object_effects_preview: row.object_effects_preview,
    })),
    remote: remoteRow
      ? {
          name: remoteName,
          applied_at: remoteRow.applied_at ?? remoteRow.inserted_at ?? null,
        }
      : null,
    risk_level: riskLevel(localRows),
    domain_owner: decision.domain_owner || null,
    canonical_decision: decision.canonical_decision || null,
    object_effect_review: decision.object_effect_review || "PENDING",
    evidence: decision.evidence || [],
    notes: decision.notes || null,
  }
})

const counts = Object.fromEntries(
  ["MATCHED", "LOCAL_ONLY", "REMOTE_ONLY", "COLLISION", "SUPERSEDED"].map((status) => [
    status,
    entries.filter((entry) => entry.classification === status).length,
  ]),
)

const output = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  write_policy: "READ_ONLY_RECONCILIATION_NO_HISTORY_REPAIR",
  project_ref: expectedProjectRef,
  source_checksums: {
    local_inventory_sha256: sha256(localSource),
    remote_snapshot_sha256: sha256(remoteSource),
  },
  counts: {
    local_files: local.migrations.length,
    remote_records: remote.migrations.length,
    merged_versions: entries.length,
    ...counts,
  },
  completion_gate: {
    all_object_effects_reviewed: entries.every((entry) => entry.object_effect_review === "APPROVED"),
    all_domain_owners_assigned: entries.every((entry) => entry.domain_owner),
    all_canonical_decisions_recorded: entries.every((entry) => entry.canonical_decision),
  },
  entries,
}

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${path.relative(root, outputPath)}`)
console.log(JSON.stringify(output.counts))
