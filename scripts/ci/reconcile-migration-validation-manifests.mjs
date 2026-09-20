#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MIGRATIONS = path.join(ROOT, "supabase", "migrations")
const MANIFESTS = path.join(ROOT, "docs", "engineering", "migration-validation")
const CUTOFF = "20260721235608"
const VALID_STATUSES = new Set([
  "planned",
  "isolated_validated",
  "staging_validated",
  "production_verified",
])
const write = process.argv.includes("--write")
const STATIC_REVIEWS = {
  "20260720020302_admin_tour_stop_publish.sql": [
    ["REL102-TOUR-PUBLISH-CHECK", "blocking-constraint-reviewed", "The replacement publication-type check is a bounded compatibility expansion; isolated lock timing remains required before promotion."],
  ],
  "20260720020544_admin_tour_collaboration_security.sql": [
    ["REL102-TOUR-COLLAB-UPDATE", "unscoped-update-reviewed", "The only unqualified update normalizes every existing tour-vendor row to the declared defaults and is idempotent."],
    ["REL102-TOUR-COLLAB-CHECKS", "blocking-constraint-reviewed", "The checks constrain normalized collaboration enums; isolated row counts and lock timing remain required before promotion."],
    ["REL102-TOUR-COLLAB-NOT-NULL", "not-null-reviewed", "Target columns are populated by preceding scoped normalization or existing defaults before NOT NULL is applied."],
  ],
  "20260822151255_world_pilot_staging_load.sql": [
    ["REL102-WORLD-PILOT-SEED", "scoped-insert-select", "Source-controlled candidates resolve only reviewed source keys, upsert deterministic natural keys, and the file rolls back by default."],
  ],
  "20260823040000_venue_public_flag_unification.sql": [
    ["REL102-VENUE-PUBLIC-UPDATE", "unscoped-update-reviewed", "Every venue row must receive one deterministic canonical visibility value before the cache and constraint converge."],
    ["REL102-VENUE-PUBLIC-NOT-NULL", "not-null-reviewed", "The preceding all-row reconciliation removes nulls before NOT NULL; isolated anonymous-visibility verification remains required."],
  ],
  "20260823050000_venue_rbac_adoption.sql": [
    ["REL102-VENUE-RBAC-WIRING", "scoped-insert-select", "Role-permission edges are limited by explicit desired-role arrays and protected by the canonical unique conflict target."],
  ],
  "20260823073000_workforce_permission_granularity.sql": [
    ["REL102-WORKFORCE-RBAC-WIRING", "scoped-insert-select", "Role-permission edges are limited by explicit desired-role arrays and protected by the canonical unique conflict target."],
  ],
  "20260823130000_booking_lifecycle.sql": [
    ["REL102-BOOKING-LIFECYCLE-CHECK", "blocking-constraint-reviewed", "The nullable lifecycle column is introduced immediately before this finite enum check and backfilled deterministically in the same change."],
  ],
  "20260823180000_hiring_lifecycle.sql": [
    ["REL102-HIRING-LIFECYCLE-CHECK", "blocking-constraint-reviewed", "Legacy values are normalized before the finite canonical-status check; isolated lock timing remains required before promotion."],
  ],
}

function hasArtifact(value) {
  return typeof value === "string"
    && value.trim().length > 0
    && !/^(pending|todo|tbd|none|null|n\/a)$/i.test(value.trim())
}

function requiresDemotion(manifest) {
  if (!VALID_STATUSES.has(manifest.status)) return true
  if (manifest.status === "planned") return false
  return ![
    manifest.representativeSnapshot?.evidenceArtifact,
    manifest.preflight?.artifact,
    manifest.postflight?.artifact,
    manifest.postflight?.securityAdvisorArtifact,
    manifest.postflight?.performanceAdvisorArtifact,
    manifest.evidence?.isolated,
  ].every(hasArtifact)
}

function inferredDomains(filename) {
  const name = filename.toLowerCase()
  const candidates = [
    "analytics",
    "booking",
    "contact",
    "document",
    "finance",
    "hiring",
    "integration",
    "location",
    "messaging",
    "organization",
    "staff",
    "ticketing",
    "tour",
    "venue",
    "workforce",
    "world",
  ].filter((domain) => name.includes(domain))
  return candidates.length > 0 ? candidates : ["database"]
}

function plannedManifest(filename) {
  const version = filename.slice(0, 14)
  const domains = inferredDomains(filename)
  const securitySensitive = /auth|grant|identity|permission|rls|token|vault/i.test(filename)
  return {
    schemaVersion: 1,
    migration: filename,
    taskId: "REL-102",
    status: "planned",
    owner: "database-engineering",
    reviewer: "security-data",
    domains,
    riskLevel: securitySensitive ? "high" : "medium",
    representativeSnapshot: {
      kind: "isolated production-like Supabase branch required before promotion",
      evidenceArtifact: null,
    },
    preflight: {
      rowCountQueries: [
        "Read-only affected-relation and per-organization row counts must be captured before execution",
      ],
      expectedAffectedRows: "Not yet measured; execution remains blocked until preflight evidence is attached",
      artifact: null,
    },
    execution: {
      lockBudgetMs: 5000,
      statementTimeoutMs: 60000,
      batchSize: 0,
      resumeStrategy: "Transactional re-issue or an additive forward-fix after isolated rehearsal",
      resumeCursor: `Supabase migration version ${version}`,
      idempotency: "Must be proven by interrupted replay in an isolated environment before promotion",
    },
    quarantine: {
      required: false,
      table: null,
      strategy: "Do not infer tenant ownership; stop and quarantine unresolved rows before any backfill",
    },
    constraintsAndIndexes: {
      constraints: [],
      indexes: [],
      validationPlan: "Review locks and use expand/validate sequencing for existing relations",
    },
    recovery: {
      rollback: "Prefer flag-off rollback; use an additive compensating migration for persisted schema changes",
      forwardFix: "Ship a later additive migration after preserving unresolved records and evidence",
    },
    postflight: {
      queries: [
        "Read-only object, row-count, RLS, grant, constraint, and advisor checks must be captured",
      ],
      artifact: null,
      securityAdvisorArtifact: null,
      performanceAdvisorArtifact: null,
    },
    verificationOwner: "security-data",
    evidence: { isolated: null, staging: null, production: null },
    exceptions: [],
  }
}

mkdirSync(MANIFESTS, { recursive: true })
const changes = []
for (const filename of readdirSync(MIGRATIONS).filter((file) => file.endsWith(".sql")).sort()) {
  const version = /^([0-9]{14})_/.exec(filename)?.[1]
  const reviews = STATIC_REVIEWS[filename] ?? []
  if (!version || (version < CUTOFF && reviews.length === 0)) continue
  const manifestPath = path.join(MANIFESTS, filename.replace(/\.sql$/, ".json"))
  let manifest
  let changed = false
  const actions = []
  if (!existsSync(manifestPath)) {
    manifest = plannedManifest(filename)
    changed = true
    actions.push("create planned manifest")
  } else {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  }

  if (requiresDemotion(manifest) && manifest.status !== "planned") {
    manifest.status = "planned"
    changed = true
    actions.push("demote unsupported validation claim")
  }
  if (!Array.isArray(manifest.preflight?.rowCountQueries)) {
    manifest.preflight ??= {}
    manifest.preflight.rowCountQueries = manifest.preflight.rowCountQueries
      ? [manifest.preflight.rowCountQueries]
      : ["Read-only affected-relation row counts must be captured before execution"]
    changed = true
    actions.push("normalize row-count queries")
  }
  const sourceSha256 = createHash("sha256")
    .update(readFileSync(path.join(MIGRATIONS, filename)))
    .digest("hex")
  manifest.exceptions ??= []
  for (const [id, type, rationale] of reviews) {
    const next = {
      id,
      type,
      owner: "database-engineering",
      rationale,
      issue: "REL-102",
      expiresOn: "2027-03-01",
      evidence: `static-review:${id}`,
      sourceSha256,
    }
    const index = manifest.exceptions.findIndex((exception) => exception.id === id)
    if (index < 0 || JSON.stringify(manifest.exceptions[index]) !== JSON.stringify(next)) {
      if (index < 0) manifest.exceptions.push(next)
      else manifest.exceptions[index] = next
      changed = true
      actions.push(`record ${type} review`)
    }
  }
  if (changed) {
    changes.push({ file: path.relative(ROOT, manifestPath), action: actions.join("; ") })
    if (write) writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }
}

console.log(JSON.stringify({ mode: write ? "write" : "check", changes }, null, 2))
if (!write && changes.length > 0) process.exitCode = 1
