export interface LegalPersonalityGateInput {
  requestedCharacter: "domestic" | "international" | "treaty_capacity";
  constitutiveInstrumentEffective: boolean;
  competentAuthoritiesVerified: boolean;
  requiredDomesticRecognitionEffective: boolean;
  counselApprovalId?: string;
}
export function evaluateLegalPersonality(input: LegalPersonalityGateInput) {
  const allowed = input.constitutiveInstrumentEffective && input.competentAuthoritiesVerified && input.requiredDomesticRecognitionEffective && Boolean(input.counselApprovalId);
  return { allowed, status: allowed ? "verified_for_exact_scope" : "not_established", reasons: allowed ? [] : ["LEGAL_PERSONALITY_NOT_PROVEN"] };
}
