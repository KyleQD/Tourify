/**
 * Phase 15 cannot launch from Phase 14 (or earlier) feature flags.
 * Phase 14 convention records are inputs only.
 */
export const PHASE_14_CONVENTION_FLAG_PREFIX = "creator_interop_"

export function phase14FlagsCannotAuthorizePhase15(phase14Flags: Record<string, boolean>) {
  const anyPhase14ConventionEnabled = Object.entries(phase14Flags).some(([key, enabled]) => {
    if (!key.startsWith(PHASE_14_CONVENTION_FLAG_PREFIX)) return false
    if (key.startsWith("creator_interop_org_")) return false
    return enabled === true
  })
  return {
    phase15AuthorizedByPhase14: false,
    anyPhase14ConventionEnabled,
    reason: "PHASE_15_REQUIRES_SEPARATE_ORG_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase15InteropOrgFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_interop_org_")
}
