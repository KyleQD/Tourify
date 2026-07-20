import type { CommonsDecision } from "./commons-domain"

export interface AssetTransferInput {
  titleVerified: boolean
  transferAuthorityVerified: boolean
  thirdPartyRestrictionsResolved: boolean
  publicNoticeComplete: boolean
  conflictReviewComplete: boolean
  rollbackOrReplacementPlanTested: boolean
  receivingStewardApproved: boolean
  creatorRightsAffected: boolean
  policyVersion: string
}

export function evaluateAssetTransfer(input: AssetTransferInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.titleVerified) reasons.push("title_not_verified")
  if (!input.transferAuthorityVerified) reasons.push("transfer_authority_missing")
  if (!input.thirdPartyRestrictionsResolved) reasons.push("third_party_restrictions_unresolved")
  if (!input.publicNoticeComplete) reasons.push("public_notice_incomplete")
  if (!input.conflictReviewComplete) reasons.push("conflict_review_incomplete")
  if (!input.rollbackOrReplacementPlanTested) reasons.push("continuity_plan_untested")
  if (!input.receivingStewardApproved) reasons.push("receiving_steward_not_approved")
  if (input.creatorRightsAffected) reasons.push("creator_rights_must_not_transfer_by_inference")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
