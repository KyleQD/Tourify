export function evaluateInstitutionalSuccession(input: {
  successionInstrumentEffective: boolean
  assetScheduleApproved: boolean
  archiveCustodyConfirmed: boolean
  localExitAvailable: boolean
  serviceContinuityTestPassed: boolean
  successorGetsExpandedAuthority: boolean
}) {
  if (input.successorGetsExpandedAuthority) return { allowed: false, reason: 'authority_expansion' } as const
  const allowed = input.successionInstrumentEffective && input.assetScheduleApproved && input.archiveCustodyConfirmed && input.localExitAvailable && input.serviceContinuityTestPassed
  return { allowed, reason: allowed ? 'succession_ready' : 'succession_incomplete' } as const
}
