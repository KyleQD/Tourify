export interface NonPerpetuityInput {
  now: Date
  effectiveAt?: Date
  expiresAt?: Date
  renewalDecisionEffective: boolean
  currentAuthorityValid: boolean
  unresolvedCriticalBlocker: boolean
}

export function evaluateNonPerpetuity(input: NonPerpetuityInput) {
  if (input.unresolvedCriticalBlocker) return { allowed: false, reason: 'critical_blocker' } as const
  if (!input.currentAuthorityValid) return { allowed: false, reason: 'authority_invalid' } as const
  if (!input.effectiveAt || input.effectiveAt > input.now) return { allowed: false, reason: 'not_effective' } as const
  if (input.expiresAt && input.expiresAt <= input.now && !input.renewalDecisionEffective) {
    return { allowed: false, reason: 'expired_without_renewal' } as const
  }
  return { allowed: true, reason: 'current_authority_confirmed' } as const
}
