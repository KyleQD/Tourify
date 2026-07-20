import type { CommonsDecision } from "./commons-domain"

export interface ProtocolChangeInput {
  publicProposal: boolean
  compatibilityAnalysis: boolean
  privacyReview: boolean
  securityReview: boolean
  accessibilityReview: boolean
  implementationEvidenceCount: number
  conformanceVectorsReady: boolean
  migrationAndRollbackReady: boolean
  emergency: boolean
  emergencyExpiry?: string
  policyVersion: string
}

export function evaluateProtocolChange(input: ProtocolChangeInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.publicProposal && !input.emergency) reasons.push("public_proposal_required")
  if (!input.compatibilityAnalysis) reasons.push("compatibility_analysis_required")
  if (!input.privacyReview) reasons.push("privacy_review_required")
  if (!input.securityReview) reasons.push("security_review_required")
  if (!input.accessibilityReview) reasons.push("accessibility_review_required")
  if (input.implementationEvidenceCount < 2 && !input.emergency) reasons.push("two_independent_implementations_required")
  if (!input.conformanceVectorsReady) reasons.push("conformance_vectors_required")
  if (!input.migrationAndRollbackReady) reasons.push("migration_and_rollback_required")
  if (input.emergency && !input.emergencyExpiry) reasons.push("emergency_expiry_required")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
