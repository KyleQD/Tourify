export function evaluateSunset(input: {
  now: Date
  sunsetAt: Date
  renewedUntil?: Date
  essentialContinuityAllowed: boolean
  actionImpact: 'read_only' | 'essential_continuity' | 'high_impact'
}) {
  const activeUntil = input.renewedUntil ?? input.sunsetAt
  if (input.now < activeUntil) return { allowed: true, mode: 'active' } as const
  if (input.actionImpact === 'read_only') return { allowed: true, mode: 'historical_read_only' } as const
  if (input.actionImpact === 'essential_continuity' && input.essentialContinuityAllowed) {
    return { allowed: true, mode: 'essential_continuity' } as const
  }
  return { allowed: false, mode: 'sunset_denial' } as const
}
