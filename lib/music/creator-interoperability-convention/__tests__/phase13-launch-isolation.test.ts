import {
  isPhase14InteropFlag,
  phase13FlagsCannotAuthorizePhase14,
} from "../phase13-launch-isolation"
import { CREATOR_INTEROP_CONVENTION_FLAG_NAMES } from "../creator-interop-convention-flags"

describe("Phase 14 handoff isolation from Phase 13", () => {
  it("never authorizes Phase 14 when Phase 13 constitution flags are enabled", () => {
    const result = phase13FlagsCannotAuthorizePhase14({
      creator_protocol_constitution_readiness_enabled: true,
      creator_protocol_constitution_limited_production_enabled: true,
    })
    expect(result.phase14AuthorizedByPhase13).toBe(false)
    expect(result.anyPhase13Enabled).toBe(true)
    expect(result.reason).toBe("PHASE_14_REQUIRES_SEPARATE_FLAGS_AND_APPROVAL_PACKAGE")
  })

  it("keeps Phase 14 flag namespace distinct from Phase 13", () => {
    for (const flag of CREATOR_INTEROP_CONVENTION_FLAG_NAMES) {
      expect(isPhase14InteropFlag(flag)).toBe(true)
      expect(flag.startsWith("creator_protocol_constitution_")).toBe(false)
    }
  })
})
