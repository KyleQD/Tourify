import {
  isPhase16InteropInstitutionFlag,
  phase15FlagsCannotAuthorizePhase16,
} from "../phase15-launch-isolation"
import { CREATOR_INTEROP_INSTITUTION_FLAG_NAMES } from "../creator-interop-institution-flags"

describe("Phase 16 handoff isolation from Phase 15", () => {
  it("never authorizes Phase 16 when Phase 15 org flags are enabled", () => {
    const result = phase15FlagsCannotAuthorizePhase16({
      creator_interop_org_readiness_enabled: true,
      creator_interop_org_production_enabled: true,
    })
    expect(result.phase16AuthorizedByPhase15).toBe(false)
    expect(result.anyPhase15OrgEnabled).toBe(true)
    expect(result.reason).toBe("PHASE_16_REQUIRES_SEPARATE_INSTITUTION_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 16 institution flag namespace distinct", () => {
    for (const flag of CREATOR_INTEROP_INSTITUTION_FLAG_NAMES) {
      expect(isPhase16InteropInstitutionFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_interop_org_")).toBe(false)
    }
  })
})
