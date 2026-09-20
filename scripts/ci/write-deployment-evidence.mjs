#!/usr/bin/env node

import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

export function createDeploymentEvidence(input, now = new Date()) {
  const required = [
    "releaseSha",
    "environment",
    "deploymentId",
    "deploymentUrl",
    "migrationEvidence",
    "approver",
    "approvalReference",
    "promotionSource",
    "runId",
    "vercelProjectId",
    "supabaseProjectId",
  ]
  for (const name of required) {
    if (!String(input[name] || "").trim()) throw new Error(`${name} is required`)
  }
  if (!/^[0-9a-f]{40}$/i.test(input.releaseSha)) throw new Error("releaseSha must be a full 40-character Git SHA")
  if (!new Set(["staging", "production"]).has(input.environment)) {
    throw new Error("environment must be staging or production")
  }

  let deploymentUrl
  try {
    deploymentUrl = new URL(input.deploymentUrl)
  } catch {
    throw new Error("deploymentUrl must be an absolute URL")
  }
  if (deploymentUrl.protocol !== "https:") throw new Error("deploymentUrl must use https")

  return {
    schema_version: "1.0",
    release_sha: input.releaseSha,
    environment: input.environment,
    deployment_id: input.deploymentId,
    deployment_url: deploymentUrl.toString(),
    migration_evidence: input.migrationEvidence,
    approver: input.approver,
    approval_reference: input.approvalReference,
    promotion_source: input.promotionSource,
    github_run_id: input.runId,
    project_fingerprints: {
      vercel: fingerprint(input.vercelProjectId),
      supabase: fingerprint(input.supabaseProjectId),
    },
    recorded_at: now.toISOString(),
  }
}

function main() {
  const outputPath = process.argv[2]
  if (!outputPath) throw new Error("Usage: write-deployment-evidence.mjs <output-path>")
  const evidence = createDeploymentEvidence({
    releaseSha: process.env.RELEASE_SHA,
    environment: process.env.DEPLOYMENT_ENVIRONMENT,
    deploymentId: process.env.DEPLOYMENT_ID,
    deploymentUrl: process.env.DEPLOYMENT_URL,
    migrationEvidence: process.env.MIGRATION_EVIDENCE,
    approver: process.env.RELEASE_APPROVER,
    approvalReference: process.env.APPROVAL_REFERENCE,
    promotionSource: process.env.PROMOTION_SOURCE,
    runId: process.env.GITHUB_RUN_ID,
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
    supabaseProjectId: process.env.SUPABASE_PROJECT_ID,
  })

  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(`✓ Wrote deployment evidence to ${outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
