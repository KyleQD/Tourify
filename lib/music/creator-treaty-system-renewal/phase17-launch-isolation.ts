/**
 * Phase 18 cannot launch from Phase 17 (or earlier) feature flags.
 * Phase 17 treaty-ops records are inputs only.
 */
export function phase17FlagsCannotAuthorizePhase18(phase17Flags: Record<string, boolean>) {
  const anyPhase17TreatyOpsEnabled = Object.entries(phase17Flags).some(
    ([key, enabled]) => key.startsWith("creator_treaty_ops_") && enabled === true,
  )
  return {
    phase18AuthorizedByPhase17: false,
    anyPhase17TreatyOpsEnabled,
    reason: "PHASE_18_REQUIRES_SEPARATE_RENEWAL_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase18TreatyRenewalFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_treaty_renewal_")
}
