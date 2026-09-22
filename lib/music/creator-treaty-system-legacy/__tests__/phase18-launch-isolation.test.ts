import {
  isPhase19TreatyLegacyFlag,
  phase18FlagsCannotAuthorizePhase19,
} from "../phase18-launch-isolation"
import { CREATOR_TREATY_LEGACY_FLAG_NAMES } from "../creator-treaty-legacy-flags"

describe("Phase 19 handoff isolation from Phase 18", () => {
  it("never authorizes Phase 19 when Phase 18 renewal flags are enabled", () => {
    const result = phase18FlagsCannotAuthorizePhase19({
      creator_treaty_renewal_readiness_enabled: true,
      creator_treaty_renewal_phase19_handoff_enabled: true,
    })
    expect(result.phase19AuthorizedByPhase18).toBe(false)
    expect(result.anyPhase18TreatyRenewalEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_19_REQUIRES_SEPARATE_LEGACY_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 19 legacy flag namespace distinct", () => {
    for (const flag of CREATOR_TREATY_LEGACY_FLAG_NAMES) {
      expect(isPhase19TreatyLegacyFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_treaty_renewal_")).toBe(false)
    }
  })
})
