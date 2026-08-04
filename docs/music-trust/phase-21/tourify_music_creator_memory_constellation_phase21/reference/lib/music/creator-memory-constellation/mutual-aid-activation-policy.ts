export interface MutualAidActivationInput {
  sourceAuthorityCurrent: boolean;
  receivingTrustActive: boolean;
  exactPurposeApproved: boolean;
  restrictionsCompatible: boolean;
  lifeSafetyCleared: boolean;
  incidentOwnerAssigned: boolean;
  expiresAt: string;
  now: string;
}

export function evaluateMutualAidActivation(input: MutualAidActivationInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.sourceAuthorityCurrent) reasons.push("source_authority_not_current");
  if (!input.receivingTrustActive) reasons.push("receiving_trust_not_active");
  if (!input.exactPurposeApproved) reasons.push("purpose_not_approved");
  if (!input.restrictionsCompatible) reasons.push("restriction_conflict");
  if (!input.lifeSafetyCleared) reasons.push("life_safety_not_cleared");
  if (!input.incidentOwnerAssigned) reasons.push("incident_owner_missing");
  if (new Date(input.expiresAt) <= new Date(input.now)) reasons.push("request_expired");
  return { allowed: reasons.length === 0, reasons };
}
