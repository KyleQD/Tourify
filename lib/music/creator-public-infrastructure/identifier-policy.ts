export interface IdentifierPolicyInput {
  explicitParticipation: boolean
  controllerVerified: boolean
  publicFieldsContainPii: boolean
  methodApproved: boolean
  jurisdictionApproved: boolean
}

export function evaluateIdentifierPolicy(input: IdentifierPolicyInput) {
  if (!input.explicitParticipation) return { allowed: false, reason: "participation_required" }
  if (!input.controllerVerified) return { allowed: false, reason: "controller_unverified" }
  if (input.publicFieldsContainPii) return { allowed: false, reason: "public_pii_forbidden" }
  if (!input.methodApproved) return { allowed: false, reason: "identifier_method_unapproved" }
  if (!input.jurisdictionApproved) return { allowed: false, reason: "jurisdiction_unapproved" }
  return { allowed: true, reason: "approved" }
}
