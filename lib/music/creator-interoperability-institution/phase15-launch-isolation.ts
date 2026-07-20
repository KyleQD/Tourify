/**
 * Phase 16 cannot launch from Phase 15 (or earlier) feature flags.
 * Phase 15 organization records are inputs only.
 */
export function phase15FlagsCannotAuthorizePhase16(phase15Flags: Record<string, boolean>) {
  const anyPhase15OrgEnabled = Object.entries(phase15Flags).some(
    ([key, enabled]) => key.startsWith("creator_interop_org_") && enabled === true,
  )
  return {
    phase16AuthorizedByPhase15: false,
    anyPhase15OrgEnabled,
    reason: "PHASE_16_REQUIRES_SEPARATE_INSTITUTION_FLAGS_AND_APPROVAL_PACKAGE",
  }
}

export function isPhase16InteropInstitutionFlag(flagKey: string): boolean {
  return flagKey.startsWith("creator_interop_institution_")
}
