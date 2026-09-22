import assert from "node:assert/strict"
import test from "node:test"

import { createDeploymentEvidence } from "./write-deployment-evidence.mjs"
import { verifyPromotionEvidence } from "./verify-promotion-evidence.mjs"

const input = { releaseSha: "a".repeat(40), stagingDeploymentId: "dpl_staging123", stagingRunId: "42", vercelStagingProjectId: "staging-project", supabaseStagingProjectId: "staging-db" }
const evidence = createDeploymentEvidence({
  releaseSha: input.releaseSha,
  environment: "staging",
  deploymentId: input.stagingDeploymentId,
  deploymentUrl: "https://tourify-abc.vercel.app",
  migrationEvidence: "DB-008/42",
  approver: "release-owner",
  approvalReference: "CHG-42",
  promotionSource: "main/" + input.releaseSha,
  runId: input.stagingRunId,
  vercelProjectId: "staging-project",
  supabaseProjectId: "staging-db",
})

test("accepts matching retained staging evidence", () => {
  assert.equal(verifyPromotionEvidence(evidence, input), true)
})

test("refuses another deployment, SHA, or workflow run", () => {
  assert.throws(() => verifyPromotionEvidence(evidence, { ...input, stagingDeploymentId: "dpl_other" }), /deployment ID/)
  assert.throws(() => verifyPromotionEvidence(evidence, { ...input, releaseSha: "b".repeat(40) }), /SHA/)
  assert.throws(() => verifyPromotionEvidence(evidence, { ...input, stagingRunId: "43" }), /run ID/)
  assert.throws(() => verifyPromotionEvidence(evidence, { ...input, supabaseStagingProjectId: "another-db" }), /registered isolated project IDs/)
})
