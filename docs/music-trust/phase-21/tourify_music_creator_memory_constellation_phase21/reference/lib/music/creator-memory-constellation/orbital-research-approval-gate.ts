export interface OrbitalResearchInput {
  researchOnly: boolean;
  competentStateAuthorityIdentified: boolean;
  launchAndPayloadApprovalEffective: boolean;
  registrationAndLiabilityReviewed: boolean;
  debrisReentryRetrievalReviewed: boolean;
  environmentalAndExportReviewApproved: boolean;
  insuranceEffective: boolean;
  terrestrialFallbackVerified: boolean;
}

export function evaluateOrbitalResearch(input: OrbitalResearchInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.researchOnly) reasons.push("production_orbital_deployment_disabled");
  if (!input.competentStateAuthorityIdentified) reasons.push("state_authority_missing");
  if (!input.launchAndPayloadApprovalEffective) reasons.push("launch_or_payload_approval_missing");
  if (!input.registrationAndLiabilityReviewed) reasons.push("registration_or_liability_review_missing");
  if (!input.debrisReentryRetrievalReviewed) reasons.push("debris_reentry_retrieval_review_missing");
  if (!input.environmentalAndExportReviewApproved) reasons.push("environmental_or_export_review_missing");
  if (!input.insuranceEffective) reasons.push("insurance_missing");
  if (!input.terrestrialFallbackVerified) reasons.push("terrestrial_fallback_missing");
  return { allowed: reasons.length === 0, reasons };
}
