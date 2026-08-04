export interface RemoteResearchInput {
  scientificProtocolApproved: boolean;
  communityApprovalCurrent: boolean;
  environmentalReviewApproved: boolean;
  jurisdictionReviewApproved: boolean;
  terrestrialFallbackVerified: boolean;
  retrievalPlanVerified: boolean;
  productionDeploymentRequested: boolean;
}

export function evaluateRemotePreservationResearch(input: RemoteResearchInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.scientificProtocolApproved) reasons.push("scientific_protocol_missing");
  if (!input.communityApprovalCurrent) reasons.push("community_approval_missing");
  if (!input.environmentalReviewApproved) reasons.push("environmental_review_missing");
  if (!input.jurisdictionReviewApproved) reasons.push("jurisdiction_review_missing");
  if (!input.terrestrialFallbackVerified) reasons.push("terrestrial_fallback_missing");
  if (!input.retrievalPlanVerified) reasons.push("retrieval_plan_missing");
  if (input.productionDeploymentRequested) reasons.push("research_gate_cannot_authorize_production");
  return { allowed: reasons.length === 0, reasons };
}
