export function evaluateAuthorityInheritance(input: {
  successorRecognized: boolean
  currentInstrumentEffective: boolean
  delegatedScopeMatches: boolean
  localReservedPowerConflict: boolean
  authorityExpired: boolean
}) {
  if (!input.successorRecognized) return { allowed: false, reason: 'successor_not_recognized' } as const
  if (!input.currentInstrumentEffective) return { allowed: false, reason: 'instrument_not_effective' } as const
  if (!input.delegatedScopeMatches) return { allowed: false, reason: 'scope_mismatch' } as const
  if (input.localReservedPowerConflict) return { allowed: false, reason: 'local_sovereignty' } as const
  if (input.authorityExpired) return { allowed: false, reason: 'authority_expired' } as const
  return { allowed: true, reason: 'current_successor_authority_verified' } as const
}
