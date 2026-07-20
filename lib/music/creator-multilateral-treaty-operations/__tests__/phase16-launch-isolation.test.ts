import {
  isPhase17TreatyOpsFlag,
  phase16FlagsCannotAuthorizePhase17,
} from "../phase16-launch-isolation"
import { CREATOR_TREATY_OPS_FLAG_NAMES } from "../creator-treaty-ops-flags"

describe("Phase 17 handoff isolation from Phase 16", () => {
  it("never authorizes Phase 17 when Phase 16 institution flags are enabled", () => {
    const result = phase16FlagsCannotAuthorizePhase17({
      creator_interop_institution_readiness_enabled: true,
      creator_interop_institution_production_enabled: true,
    })
    expect(result.phase17AuthorizedByPhase16).toBe(false)
    expect(result.anyPhase16InstitutionEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_17_REQUIRES_SEPARATE_TREATY_OPS_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 17 treaty-ops flag namespace distinct", () => {
    for (const flag of CREATOR_TREATY_OPS_FLAG_NAMES) {
      expect(isPhase17TreatyOpsFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_interop_institution_")).toBe(false)
    }
  })
})
