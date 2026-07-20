/**
 * Phase 14 cannot launch from Phase 13 (or earlier) feature flags.
 * Phase 13 constitution flags are inputs for recognition references only.
 */
export const PHASE_13_CONSTITUTION_FLAG_PREFIX = "creator_protocol_constitution_"

export function phase13FlagsCannotAuthorizePhase14(phase13Flags: Record<string, boolean>) {
  const anyPhase13Enabled = Object.entries(phase13Flags).some(
    ([key, enabled]) => key.startsWith(PHASE_13_CONSTITUTION_FLAG_PREFIX) && enabled === true,
  )
  return {
    phase14AuthorizedByPhase13: false,
    anyPhase13Enabled,
    reason: "PHASE_14_REQUIRES_SEPARATE_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase14InteropFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_interop_")
}
