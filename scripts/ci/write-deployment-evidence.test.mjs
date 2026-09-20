import assert from "node:assert/strict"
import test from "node:test"

import { createDeploymentEvidence } from "./write-deployment-evidence.mjs"

const valid = {
  releaseSha: "a".repeat(40),
  environment: "production",
  deploymentId: "dpl_123",
  deploymentUrl: "https://tourify-abc.vercel.app",
  migrationEvidence: "DB-008/evidence-42",
  approver: "release-owner",
  approvalReference: "CHG-42",
  promotionSource: "staging-run-987",
  runId: "123456",
  vercelProjectId: "vercel-production",
  supabaseProjectId: "supabase-production",
}

test("creates non-secret, deterministic deployment evidence", () => {
  const evidence = createDeploymentEvidence(valid, new Date("2026-09-16T20:00:00.000Z"))
  assert.equal(evidence.release_sha, valid.releaseSha)
  assert.equal(evidence.environment, "production")
  assert.equal(evidence.recorded_at, "2026-09-16T20:00:00.000Z")
  assert.equal(evidence.vercel_project_id, undefined)
  assert.equal(evidence.supabase_project_id, undefined)
  assert.match(evidence.project_fingerprints.vercel, /^[0-9a-f]{16}$/)
  assert.match(evidence.project_fingerprints.supabase, /^[0-9a-f]{16}$/)
})

test("rejects incomplete or ambiguous evidence", () => {
  assert.throws(() => createDeploymentEvidence({ ...valid, releaseSha: "main" }), /full 40-character Git SHA/)
  assert.throws(() => createDeploymentEvidence({ ...valid, migrationEvidence: "" }), /migrationEvidence is required/)
  assert.throws(() => createDeploymentEvidence({ ...valid, deploymentUrl: "http://tourify.live" }), /must use https/)
})
