import {
  isPhase20CulturalMemoryTrustFlag,
  phase19FlagsCannotAuthorizePhase20,
} from "../phase19-launch-isolation"
import { CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES } from "../creator-cultural-memory-trust-flags"

describe("Phase 20 handoff isolation from Phase 19", () => {
  it("never authorizes Phase 20 when Phase 19 legacy flags are enabled", () => {
    const result = phase19FlagsCannotAuthorizePhase20({
      creator_treaty_legacy_readiness_enabled: true,
      creator_treaty_legacy_phase20_handoff_enabled: true,
    })
    expect(result.phase20AuthorizedByPhase19).toBe(false)
    expect(result.anyPhase19LegacyEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_20_REQUIRES_SEPARATE_MEMORY_TRUST_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 20 flag namespace distinct", () => {
    for (const flag of CREATOR_CULTURAL_MEMORY_TRUST_FLAG_NAMES) {
      expect(isPhase20CulturalMemoryTrustFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_treaty_legacy_")).toBe(false)
    }
  })
})
