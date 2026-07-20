/**
 * Phase 17 cannot launch from Phase 16 (or earlier) feature flags.
 * Phase 16 institution records are inputs only.
 */
export function phase16FlagsCannotAuthorizePhase17(phase16Flags: Record<string, boolean>) {
  const anyPhase16InstitutionEnabled = Object.entries(phase16Flags).some(
    ([key, enabled]) => key.startsWith("creator_interop_institution_") && enabled === true,
  )
  return {
    phase17AuthorizedByPhase16: false,
    anyPhase16InstitutionEnabled,
    reason: "PHASE_17_REQUIRES_SEPARATE_TREATY_OPS_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase17TreatyOpsFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_treaty_ops_")
}
