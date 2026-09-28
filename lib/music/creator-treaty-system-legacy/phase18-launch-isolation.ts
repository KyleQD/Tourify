/**
 * Phase 19 cannot launch from Phase 18 (or earlier) feature flags.
 * Phase 18 renewal records are inputs only.
 */
export function phase18FlagsCannotAuthorizePhase19(phase18Flags: Record<string, boolean>) {
  const anyPhase18TreatyRenewalEnabled = Object.entries(phase18Flags).some(
    ([key, enabled]) => key.startsWith("creator_treaty_renewal_") && enabled === true,
  )
  return {
    phase19AuthorizedByPhase18: false,
    anyPhase18TreatyRenewalEnabled,
    reason: "PHASE_19_REQUIRES_SEPARATE_LEGACY_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase19TreatyLegacyFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_treaty_legacy_")
}
