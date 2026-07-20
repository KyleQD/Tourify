import {
  isPhase15InteropOrgFlag,
  phase14FlagsCannotAuthorizePhase15,
} from "../phase14-launch-isolation"
import { CREATOR_INTEROP_ORG_FLAG_NAMES } from "../creator-interop-org-flags"

describe("Phase 15 handoff isolation from Phase 14", () => {
  it("never authorizes Phase 15 when Phase 14 convention flags are enabled", () => {
    const result = phase14FlagsCannotAuthorizePhase15({
      creator_interop_convention_readiness_enabled: true,
      creator_interop_limited_production_enabled: true,
    })
    expect(result.phase15AuthorizedByPhase14).toBe(false)
    expect(result.anyPhase14ConventionEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_15_REQUIRES_SEPARATE_ORG_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 15 org flag namespace distinct from Phase 14 convention flags", () => {
    for (const flag of CREATOR_INTEROP_ORG_FLAG_NAMES) {
      expect(isPhase15InteropOrgFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_interop_org_")).toBe(true)
    }
  })
})
