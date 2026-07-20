import type { CommonsDecision, CommonsSourceReference } from "./commons-domain"

export interface RegistryProjectionInput {
  purposeApproved: boolean
  source: CommonsSourceReference
  sourceFresh: boolean
  fieldsApproved: boolean
  leakageReviewPassed: boolean
  containsSensitiveEvidence: boolean
  policyVersion: string
}

export function evaluateRegistryProjection(input: RegistryProjectionInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.purposeApproved) reasons.push("purpose_not_approved")
  if (!input.sourceFresh) reasons.push("source_stale")
  if (!input.fieldsApproved) reasons.push("fields_not_approved")
  if (!input.leakageReviewPassed) reasons.push("leakage_review_failed")
  if (input.containsSensitiveEvidence) reasons.push("sensitive_evidence_prohibited")
  if (input.source.revoked) reasons.push("source_revoked")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
