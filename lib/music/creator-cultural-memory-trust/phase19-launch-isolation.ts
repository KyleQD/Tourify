/**
 * Phase 20 cannot launch from Phase 19 (or earlier) feature flags.
 * Phase 19 legacy records are inputs only.
 */
export function phase19FlagsCannotAuthorizePhase20(phase19Flags: Record<string, boolean>) {
  const anyPhase19LegacyEnabled = Object.entries(phase19Flags).some(
    ([key, enabled]) => key.startsWith("creator_treaty_legacy_") && enabled === true,
  )
  return {
    phase20AuthorizedByPhase19: false,
    anyPhase19LegacyEnabled,
    reason: "PHASE_20_REQUIRES_SEPARATE_MEMORY_TRUST_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase20CulturalMemoryTrustFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_cultural_memory_trust_")
}
