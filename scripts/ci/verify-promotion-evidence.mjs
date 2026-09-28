#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const fingerprint = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16)

export function verifyPromotionEvidence(evidence, input) {
  if (evidence.schema_version !== "1.0" || evidence.environment !== "staging") throw new Error("Staging evidence has the wrong schema or environment")
  if (evidence.release_sha?.toLowerCase() !== input.releaseSha?.toLowerCase()) throw new Error("Staging evidence SHA does not match promotion SHA")
  if (!/^dpl_[A-Za-z0-9]+$/.test(evidence.deployment_id || "") || evidence.deployment_id !== input.stagingDeploymentId)
    throw new Error("Staging evidence deployment ID does not match reviewed deployment")
  if (String(evidence.github_run_id) !== String(input.stagingRunId)) throw new Error("Staging evidence run ID does not match reviewed run")
  if (!evidence.migration_evidence || !evidence.approval_reference || !evidence.approver) throw new Error("Staging evidence lacks migration or approval references")
  if (!/^https:\/\//.test(evidence.deployment_url || "")) throw new Error("Staging evidence lacks an HTTPS deployment URL")
  if (!/^[a-f0-9]{16}$/.test(evidence.project_fingerprints?.vercel || "") || !/^[a-f0-9]{16}$/.test(evidence.project_fingerprints?.supabase || ""))
    throw new Error("Staging evidence lacks project fingerprints")
  if (!input.vercelStagingProjectId || !input.supabaseStagingProjectId ||
      evidence.project_fingerprints.vercel !== fingerprint(input.vercelStagingProjectId) ||
      evidence.project_fingerprints.supabase !== fingerprint(input.supabaseStagingProjectId))
    throw new Error("Staging evidence does not match registered isolated project IDs")
  return true
}

function main() {
  const path = process.argv[2]
  if (!path) throw new Error("Usage: verify-promotion-evidence.mjs <staging-evidence.json>")
  verifyPromotionEvidence(JSON.parse(readFileSync(path, "utf8")), {
    releaseSha: process.env.RELEASE_SHA,
    stagingDeploymentId: process.env.STAGING_DEPLOYMENT_ID,
    stagingRunId: process.env.STAGING_RUN_ID,
    vercelStagingProjectId: process.env.VERCEL_STAGING_PROJECT_ID,
    supabaseStagingProjectId: process.env.SUPABASE_STAGING_PROJECT_ID,
  })
  console.log("Verified retained staging evidence for exact-SHA production promotion")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
