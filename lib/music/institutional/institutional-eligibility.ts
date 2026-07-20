export interface InstitutionalEligibilityAssertion {
  assertionType: string
  providerId: string
  verified: boolean
  effectiveAt: string
  expiresAt?: string
  revokedAt?: string
  permittedProductClasses: string[]
  maximumAmountMinor?: bigint
}

export interface EvaluateInstitutionalEligibilityInput {
  now: Date
  requiredProductClass: string
  requestedAmountMinor?: bigint
  assertions: InstitutionalEligibilityAssertion[]
}

export interface InstitutionalEligibilityResult {
  allowed: boolean
  reason: string
  matchingAssertion?: InstitutionalEligibilityAssertion
}

export function evaluateInstitutionalEligibility(
  input: EvaluateInstitutionalEligibilityInput,
): InstitutionalEligibilityResult {
  const match = input.assertions.find((assertion) => {
    if (!assertion.verified || assertion.revokedAt) return false
    if (assertion.expiresAt && new Date(assertion.expiresAt) <= input.now) return false
    if (!assertion.permittedProductClasses.includes(input.requiredProductClass)) return false
    if (
      input.requestedAmountMinor !== undefined &&
      assertion.maximumAmountMinor !== undefined &&
      input.requestedAmountMinor > assertion.maximumAmountMinor
    ) return false
    return true
  })

  return match
    ? { allowed: true, reason: "provider_assertion_valid", matchingAssertion: match }
    : { allowed: false, reason: "current_provider_assertion_required" }
}
