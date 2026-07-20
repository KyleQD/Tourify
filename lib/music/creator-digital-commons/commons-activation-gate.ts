import type { CommonsDecision } from "./commons-domain"

export interface CommonsActivationInput {
  separateStewardApproved: boolean
  publicGovernanceApproved: boolean
  localSovereigntyTested: boolean
  criticalAssetCustodyVerified: boolean
  independentImplementations: number
  independentOperators: number
  conformancePassed: boolean
  tourifyExitDrillPassed: boolean
  fundingRunwayMonths: number
  legalPrivacySecurityAccessibilityApproved: boolean
  publicReviewComplete: boolean
  scopeAndJurisdictionsDefined: boolean
  policyVersion: string
}

export function evaluateCommonsActivation(input: CommonsActivationInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.separateStewardApproved) reasons.push("steward_not_approved")
  if (!input.publicGovernanceApproved) reasons.push("governance_not_approved")
  if (!input.localSovereigntyTested) reasons.push("local_sovereignty_not_tested")
  if (!input.criticalAssetCustodyVerified) reasons.push("asset_custody_not_verified")
  if (input.independentImplementations < 2) reasons.push("two_implementations_required")
  if (input.independentOperators < 2) reasons.push("two_operators_required")
  if (!input.conformancePassed) reasons.push("conformance_not_passed")
  if (!input.tourifyExitDrillPassed) reasons.push("tourify_exit_drill_failed")
  if (input.fundingRunwayMonths < 12) reasons.push("funding_runway_below_policy")
  if (!input.legalPrivacySecurityAccessibilityApproved) reasons.push("required_reviews_missing")
  if (!input.publicReviewComplete) reasons.push("public_review_incomplete")
  if (!input.scopeAndJurisdictionsDefined) reasons.push("scope_or_jurisdiction_undefined")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
