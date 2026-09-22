import {
  isPhase18TreatyRenewalFlag,
  phase17FlagsCannotAuthorizePhase18,
} from "../phase17-launch-isolation"
import { CREATOR_TREATY_RENEWAL_FLAG_NAMES } from "../creator-treaty-renewal-flags"

describe("Phase 18 handoff isolation from Phase 17", () => {
  it("never authorizes Phase 18 when Phase 17 treaty-ops flags are enabled", () => {
    const result = phase17FlagsCannotAuthorizePhase18({
      creator_treaty_ops_readiness_enabled: true,
      creator_treaty_ops_external_public_activation_enabled: true,
    })
    expect(result.phase18AuthorizedByPhase17).toBe(false)
    expect(result.anyPhase17TreatyOpsEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_18_REQUIRES_SEPARATE_RENEWAL_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 18 renewal flag namespace distinct", () => {
    for (const flag of CREATOR_TREATY_RENEWAL_FLAG_NAMES) {
      expect(isPhase18TreatyRenewalFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_treaty_ops_")).toBe(false)
    }
  })
})
