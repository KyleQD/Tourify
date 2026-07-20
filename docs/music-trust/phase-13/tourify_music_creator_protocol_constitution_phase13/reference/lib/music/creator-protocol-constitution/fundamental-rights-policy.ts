import type { ConstitutionalDecision, ConstitutionalPolicyContext } from "./constitutional-domain"

export interface FundamentalRightsInput {
  action: string
  affectedRights: string[]
  amendmentClass: string
  hasFundamentalRatification: boolean
  emergencyExpiresAt?: string
  policy: ConstitutionalPolicyContext
}

export function evaluateFundamentalRights(input: FundamentalRightsInput): ConstitutionalDecision {
  const reasons: string[] = []
  if (input.affectedRights.length > 0 && input.amendmentClass !== "fundamental") reasons.push("FUNDAMENTAL_CLASSIFICATION_REQUIRED")
  if (input.affectedRights.length > 0 && !input.hasFundamentalRatification) reasons.push("FUNDAMENTAL_RATIFICATION_REQUIRED")
  if (input.amendmentClass === "emergency" && !input.emergencyExpiresAt) reasons.push("EMERGENCY_EXPIRY_REQUIRED")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons.length ? ["ratification", "impact assessment", "independent review"] : [], policy: input.policy }
}
